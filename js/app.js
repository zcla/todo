"use strict";

class App {
    static Route = class {
        constructor(config) {
            //  config {
            //      regex: RegExp           => Expressão regular a ser aplicada para ver se a url é tratada por esse Route.
            // TODO O que tá daqui pra baixo deveria estar numa classe ControllerCrud.
            //      frontend:               => Objeto Frontend que será chamado pelo Route.
            //      data: {}                => Objeto com funções que retornam os dados necessários ao frontend.
            // TODO A documentação abaixo deveria estar em FrontendCrud. Inclusive, não são só funções. Tem que documentar também o formato esperado.
            //                                  Um FrontendCrud espera as funções select, insert, update e delete.
            //      action: {}              => Objeto com funções que executam ações.
            //                                  Um FrontendCrud espera as ações insert-ok, update-ok e delete-ok.

            this.#config = config;
        }

        #config = null;

        #app = null;
        getApp() {
            return this.#app;
        }

        async getData(qual, params) {
            return this.#config.data[qual](params);
        }

        init(controller) {
            this.#app = controller;
        }

        go(path, params) {
            // TODO Deveria chamar o Controller especificado
            let id = 'select';
            if (path) {
                id = path.substring(1);
            }

            let naoConfigurado = true;
            if (this.#config.action[id]) {
                naoConfigurado = false;
                $.when(this.#config.action[id](params)).then(async (data) => {
                    if (data) {
                        this.#app.navigate(data);
                    } else {
                        await this.#config.frontend.show(this.#app, `${path}-success`, data);
                    }
                }).catch(async (error) => {
                    // TODO Para cruds: "traduzir" o nome das propriedades pros que aparecem na tela.
                    // TODO Para actions "customizadas": deveria mostrar o erro na tela, não chamar frontend.show.
                    await this.#config.frontend.show(this.#app, `${path}-fail`, error);
                });
            }

            if (this.#config.data[id]) {
                naoConfigurado = false;
                $.when(this.getData(id, params)).then(async (data) => {
                    await this.#config.frontend.show(this.#app, path, data);
                }).catch(async (error) => {
                    await this.#config.frontend.show(this.#app, `${path}-fail`, error);
                });
            }

            if (naoConfigurado) {
                this.#config.frontend.throw(`[App.Route] Route not configured: ${path}.`);
            }
        }

        match(url) {
            return url.match(this.#config.regex);
        }
    }

    constructor(config) {
        //  config {
        //      routes: []      => Array de App.Route.
        //  }
        this.#config = config;
    }

    #config = null;

    #lastPath = null;
    #lastRoute = null;

    navigate(path, params) {
        let onlyPath = path;
        let search = '';
        if (onlyPath.indexOf('?') > -1) {
            onlyPath = onlyPath.substring(0, onlyPath.indexOf('?'));
            search = path.substring(onlyPath.length);
        }
        if (!params) {
            params = {};
        }
        const inlineParams = UrlUtils.getUrlParams(search);
        for (const key of Object.keys(inlineParams)) {
            const value = inlineParams[key];
            if (params[key]) {
                new FrontendError(`[App] Duplicate parameter: ${key}.`);
                return;
            }
            params[key] = value;
        }

        if (path.match(/^#/)) {
            // relativo
            if (!this.#lastRoute) {
                new FrontendError(`[App] Unknown route: ${path}.`);
            }
            this.#lastRoute.go(onlyPath, params);
            return;
        } else {
            // absoluto
            for (const route of this.#config.routes) {
                if (route.match(path)) {
                    this.#lastPath = path;
                    this.#lastRoute = route;
                    route.init(this);
                    route.go(onlyPath, params);
                    return;
                }
            }
        }
        new FrontendError(`[App] Unknown path: ${path}`);
    }

    refresh() {
        this.navigate(this.#lastPath);
    }
}
