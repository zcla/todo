"use strict";

class Frontend {
    static Route = class {
        constructor(regex, page) {
            this.#regex = regex;
            this.#page = page;
        }
        
        #regex = null;
        getRegex() {
            return this.#regex;
        }

        #page = null;
        gotoPage() {
            return this.#page.go();
        }
    }

    static Page = class {
        static addMessage(tipo, titulo, mensagem, selector) {
            if (!selector) {
                selector = '#mensagens';
            }
            $(selector).append(`
                <div class="alert alert-${tipo} alert-dismissible">
                    <b>${titulo}</b>
                    <div>${mensagem}</div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);
        }

        go() {
            // Gambiarra para emular um método abstrato.
            throw "Esse método deve ser sobrescrito!";
        }
    }

    // Classe que não monta absolutamente nada; todo o trabalho deve ser feito a partir do callback.
    static Custom = class extends this.Page {
        #callback = null;

        constructor(callback) {
            super();
            this.#callback = callback;
        }

        go() {
            this.#callback();
        }
    }

    // Classe que monta tudo baseando-se na configuração passada.
    static Crud = class extends this.Page {
        #config = null;

        constructor(config) {
            super();
            this.#config = config;

            // Obrigatórias
            if (!config.entity.singularMinusculo ||
                !config.entity.pluralMaiusculo ||
                !config.backend.backend ||
                !config.backend.entity) {
                throw "Faltam elementos obrigatórios!";
            }
        }

        go() {
            this.#setupHtml();
            this.#select();
        }

        #setupHtml() {
            // Adiciona o título
            $('#conteudo').append(`
                <h1>${this.#config.entity.pluralMaiusculo}</h1>
            `);

            // Adiciona o toolbar
            $('#conteudo').append(`
                <div id="select" class="mb-3">
                    <div class="btn-toolbar mb-3">
                        <div class="btn-group">
                            <button id="btnInsert" type="button" class="btn btn-primary">Incluir</button>
                        </div>
                    </div>
                    <ul class="list-group"></ul>
                </div>
            `);
            $('#btnInsert').click(this.#onInsertClick.bind(this));

            // Modais do CRUD
            // TODO Mover para o lugar onde o botão é criado
            const entityNameDisplay = this.#config.entity.singularMinusculo;
            const propertyName = 'propertyName';
            const propertyNameDisplay = 'propertyNameDisplay';
            $('#include').append(`
                <div id="modalAlterar" class="modal fade" tabindex="-1" aria-labelledby="modalAlterarLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 id="modalAlterarLabel" class="modal-title fs-5">Alterar ${entityNameDisplay}</h1>
                            </div>
                            <div class="modal-body">
                                <div id="modalAlterarMensagens" class="mt-3">
                                </div>
                                <form>
                                    <div class="mb-3">
                                        <label for="modalAlterar${propertyName}" class="form-label">${propertyNameDisplay}</label>
                                        <input id="modalAlterar${propertyName}" type="text" class="form-control">
                                    </div>
                                    <div class="mb-3">
                                        <label for="modalAlterar${propertyName}" class="form-label">${propertyNameDisplay}</label>
                                        <select id="modalAlterar${propertyName}" class="form-select"></select>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button id="modalAlterarAlterar" type="button" class="btn btn-primary">Alterar</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="modalExcluir" class="modal fade" tabindex="-1" aria-labelledby="modalExcluirLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 id="modalExcluirLabel" class="modal-title fs-5">Excluir ${entityNameDisplay}</h1>
                            </div>
                            <div class="modal-body">
                                Confirma a exclusão?
                            </div>
                            <div class="modal-footer">
                                <button id="modalExcluirExcluir" type="button" class="btn btn-danger">Excluir</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }

        #onInsertClick() {
            const awaiter = new Awaiter(() => {
                $('#modalInsert').modal('show');
                $('#modalInsertInsert').off();
                $('#modalInsertInsert').click(this.#onInsertInsertClick.bind(this));
            });

            let html = `
                <div id="modalInsert" class="modal fade" tabindex="-1" aria-labelledby="modalInsertLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 id="modalInsertLabel" class="modal-title fs-5">Incluir ${this.#config.entity.singularMinusculo}</h1>
                            </div>
                            <div class="modal-body">
                                <div id="modalInsertMensagens" class="mt-3">
                                </div>
                                <form>
            `;
            for (const input of this.#config.insert.inputs) {
                html += `
                    <div class="mb-3">
                        <label for="modalInsert${input.property}" class="form-label">${input.display}</label>
                `;
                switch (input.type) {
                    case 'select':
                        html += `
                            <select id="modalInsert${input.property}" class="form-select">
                        `;
                        if (input.selectData) {
                            for (const item of input.selectData) {
                                html += `
                                    <option value="${item[0]}">${item[1]}</option>
                                `;
                            }
                        }
                        if (input.selectBackend) {
                            awaiter.add(
                                input.selectBackend.backend.select(input.selectBackend.entity),
                                (data) => {
                                    if (input.selectBackend.transformData) {
                                        data = input.selectBackend.transformData(data);
                                    }
                                    for (const item of data) {
                                        let value = null;
                                        let text = null;
                                        let disabled = null;
                                        if (input.selectBackend.valueProperty) {
                                            debugger;
                                            value = item[input.selectBackend.valueProperty];
                                            text = item[input.selectBackend.textProperty];
                                        }
                                        if (input.selectBackend.format) {
                                            const format = input.selectBackend.format(item);
                                            value = format.value;
                                            text = format.text;
                                        }
                                        $(`#modalInsert${input.property}`).append(`
                                            <option value="${value}">${text}</option>
                                        `);
                                    }
                                }
                            );
                        }
                        html += `
                            </select>
                        `;
                        break;

                    case 'text':
                        html += `
                            <input id="modalInsert${input.property}" type="text" class="form-control">
                        `;
                        break;
                
                    default:
                        throw `Tipo de input "${input.type}" desconhecido.`;
                        break;
                }
                html += `
                    </div>
                `;
            }
            html += `
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button id="modalInsertInsert" type="button" class="btn btn-primary">Incluir</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#include').append(html);

            for (const input of this.#config.insert.inputs) {
                $(`#modalInsert${input.property}`).val('');
                
            }
            awaiter.await();
        }

        #onInsertInsertClick() {
            const item = {};
            for (const input of this.#config.insert.inputs) {
                item[input.property] = $(`#modalInsert${input.property}`).val();
            }
            $.when(this.#config.backend.backend.insert(this.#config.backend.entity, item)).then((data) => {
                Frontend.Page.addMessage('info', '', `${this.#config.entity.singularMaiusculo} incluíd${this.#config.entity.genero}.`);
                $('#modalInsert').modal('hide');
                this.#select();
            }).catch((failFilter) => {
                for (const msg of failFilter) {
                    Frontend.Page.addMessage('danger', '', msg, '#modalInsertMensagens');
                }
            });
        }

        #select() {
            $.when(this.#config.backend.backend.select(this.#config.backend.entity)).then((data) => {
                if (this.#config.backend.transformData) {
                    data = this.#config.backend.transformData(data);
                }
                $('#select .list-group').empty();
                for (const item of data) {
                    let htmlTarefa = '';
                    if (this.#config.select.column.property) {
                        htmlTarefa = item[this.#config.select.column.property];
                    }
                    if (this.#config.select.column.format) {
                        htmlTarefa = this.#config.select.column.format(item);
                    }
                    $('#select .list-group').append(`
                        <li class="list-group-item">
                            ${htmlTarefa}
                            <button id="TarefaExcluir_${'tarefa.id'}" type="button" class="btn btn-sm btn-danger float-end">Excluir</button>
                            <button id="TarefaAlterar_${'tarefa.id'}" type="button" class="btn btn-sm btn-primary float-end me-2">Alterar</button>
                        </li>
                    `);

            //         $(`#TarefaAlterar_${tarefa.id}`).click(() => {
            //             $('#tarefaAlterarNome').val(tarefa.nome);
            //             $('#tarefaAlterarNotas').val(tarefa.notas);
            //             $.when(this.#setupComboMae(backend, '#tarefaAlterarMae')).then((data) => {
            //                 $('#tarefaAlterarMae').val(tarefa.idMae);
            //                 $('#tarefaAlterar').modal('show');
            //                 $('#tarefaAlterarNome').focus();
            //                 $('#tarefaAlterarAlterar').off();
            //                 $('#tarefaAlterarAlterar').click(() => {
            //                     const alterar = {
            //                         id: tarefa.id,
            //                         nome: $('#tarefaAlterarNome').val(),
            //                         notas: $('#tarefaAlterarNotas').val(),
            //                         idMae: $('#tarefaAlterarMae').val()
            //                     };
            //                     $.when(backend.update('Tarefa', alterar, 'id')).then((data) => {
            //                         OldFrontend.adicionaMensagem('info', '', `Tarefas alteradas: ${data}.`);
            //                         $('#tarefaAlterar').modal('hide');
            //                         this.update(backend);
            //                     }).catch((failFilter) => {
            //                         for (const msg of failFilter) {
            //                             OldFrontend.adicionaMensagem('danger', '', msg, '#tarefaAlterarMensagens');
            //                         }
            //                     });
            //                 });
            //             });
            //         });
            //         $(`#TarefaExcluir_${tarefa.id}`).click(() => {
            //             $('#tarefaExcluir .modal-body').empty();
            //             $('#tarefaExcluir .modal-body').append(htmlTarefa);
            //             $('#tarefaExcluir').modal('show');
            //             $('#tarefaExcluirExcluir').off();
            //             $('#tarefaExcluirExcluir').click(() => {
            //                 $.when(backend.delete('Tarefa', 'id', tarefa.id)).then((data) => {
            //                     $('#tarefaExcluir').modal('hide');
            //                     this.update(backend);
            //                     OldFrontend.adicionaMensagem('info', '', `Tarefas excluídas: ${data}.`);
            //                 });
            //             });
            //         });
                }
            });
        }
    }

    constructor(routes) {
        // TODO Criar os eventos de exportar e importar com base nos backends dos objetos.
        for (const route of routes) {
            if (location.search.match(route.getRegex())) {
                route.gotoPage();
                return;
            }
        }
    }
}
