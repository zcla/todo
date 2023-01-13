"use strict";

class Controller {
    static Route = class {
        constructor(config) {
            this.#config = config;
        }

        #config = null;
        //  {
        //      regex:      Expressão regular da URL.
        //      frontend:   Frontend que será chamado se a regex der match.
        //      backends:   Array de objetos Backend usados pelo Frontend
        //  }

        getBackend(id) {
            return this.#config.backends.find((backend) => { return backend.getConfig().id == id });
        }

        go() {
            this.#config.frontend.start(this);
        }

        match(url) {
            return url.match(this.#config.regex)
        }
    }

    constructor(config) {
        this.#config = config;

        for (const route of config.routes) {
            if (route.match(location.search)) {
                route.go();
                return;
            }
        }
    }

    #config = null;
    //  {
    //      routes: Array de Controller.Route.
    //  }
}
