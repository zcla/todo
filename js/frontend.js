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
                !config.entity.backend ||
                !config.entity.name) {
                throw "Faltam elementos obrigatórios!";
            }

            // Menu "Dados"
            const backend = this.#config.entity.backend;
            $('#backend_exportar').click(() => {
                backend.export();
            });
            $('#backend_importar').click(() => {
                $('#storageUpload').removeClass('d-none');
            });
            $('#storageUpload').change(() => {
                $('#storageUpload').addClass('d-none');
                $('#storageUploadSpinner').removeClass('d-none');
                const file = $('#storageUpload input')[0].files[0];
                const reader = new FileReader();
                reader.onload = function(event) {
                    const result = JSON.parse(event.target.result);
                    backend.import(result);
                    $('#storageUploadSpinner').addClass('d-none');
                    $('#storageUpload input').val(null);
                    window.location.reload();
                }
                reader.readAsText(file);
            });
            $('#backend_limpar').click(() => {
                backend.clearAllData();
                window.location.reload();
            });
   
        }

        go() {
            this.#select();
        }

        #select() {
            $('#conteudo').empty();

            // Adiciona o título
            $('#conteudo').append(`
                <h1>${this.#config.entity.pluralMaiusculo}</h1>
            `);

            // Adiciona o toolbar
            let html = `
                <div id="select" class="mb-3">
                    <div class="btn-toolbar mb-3">
                        <div class="btn-group">
            `;
            if (this.#config.insert) {
                html += `
                    <button id="btnInsert" type="button" class="btn btn-primary">Incluir</button>
                `;
            }
            html += `
                        </div>
                    </div>
                    <ul class="list-group"></ul>
                </div>
            `;
            $('#conteudo').append(html);
            $('#btnInsert').click(this.#onCrudClick.bind(this, 'insert', {}));

            $.when(this.#config.entity.backend.select(this.#config.entity.name)).then((data) => {
                if (this.#config.entity.transformData) {
                    data = this.#config.entity.transformData(data);
                }
                $('#select .list-group').empty();
                for (const item of data) {
                    let html = `
                        <li class="list-group-item">
                    `;
                    if (this.#config.select.column.property) {
                        html += `
                            ${item[this.#config.select.column.property]}
                        `;
                    }
                    if (this.#config.select.column.format) {
                        html += `
                            ${this.#config.select.column.format(item)}
                        `;
                    }
                    const id = item[this.#config.entity.id];
                    if (this.#config.delete) {
                        html += `
                            <button id="btnDelete_${id}" type="button" class="btn btn-sm btn-danger float-end">Excluir</button>
                        `;
                    }
                    if (this.#config.update) {
                        html += `
                            <button id="btnUpdate_${id}" type="button" class="btn btn-sm btn-primary float-end me-2">Alterar</button>
                        `;
                    }
                    html += `
                        </li>
                    `;
                    $('#select .list-group').append(html);
                    $(`#btnUpdate_${id}`).click(this.#onCrudClick.bind(this, 'update', item));
                    $(`#btnDelete_${id}`).click(this.#onCrudClick.bind(this, 'delete', item));
                }
            });
        }

        #onCrudClick(qual, item) {
            let verbo = null;
            let bgColor = 'primary';
            let inputs = null;
            let disabled = '';
            switch (qual) {
                case 'insert':
                    verbo = 'Incluir';
                    inputs = this.#config.insert.inputs;
                    break;

                case 'update':
                    verbo = 'Alterar';
                    inputs = this.#config.update.inputs;
                    break;

                case 'delete':
                    verbo = 'Excluir';
                    bgColor = 'danger';
                    inputs = this.#config.delete.inputs;
                    disabled = ' disabled';
                    break;
            
                default:
                    throw `Operação desconhecida: "${qual}"`;
                    break;
            }

            const awaiter = new Awaiter(() => {
                $('#modalCrud').modal('show');
                $('#modalCrudOk').off();
                $('#modalCrudOk').click(this.#onCrudOkClick.bind(this, qual, item));
            });

            let html = `
                <div id="modalCrud" class="modal fade" tabindex="-1" aria-labelledby="modalCrudLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h1 id="modalCrudLabel" class="modal-title fs-5">${verbo} ${this.#config.entity.singularMinusculo}</h1>
                            </div>
                            <div class="modal-body">
                                <div id="modalCrudMensagens" class="mt-3">
                                </div>
                                <form>
            `;
            for (const input of inputs) {
                html += `
                    <div class="mb-3">
                        <label for="modalCrud${input.property}" class="form-label">${input.display}</label>
                `;
                switch (input.type) {
                    case 'select':
                        $(`#modalCrud${input.property}`).empty();
                        html += `
                            <select id="modalCrud${input.property}" class="form-select"${disabled}>
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
                                    for (const itemSelect of data) {
                                        let value = null;
                                        let text = null;
                                        let disabled = null;
                                        if (input.selectBackend.disabled) {
                                            disabled = input.selectBackend.disabled(itemSelect, item) ? ' disabled' : null;
                                        }
                                        if (input.selectBackend.valueProperty) {
                                            value = itemSelect[input.selectBackend.valueProperty];
                                            text = itemSelect[input.selectBackend.textProperty];
                                        }
                                        if (input.selectBackend.format) {
                                            const format = input.selectBackend.format(itemSelect);
                                            value = format.value;
                                            text = format.text;
                                        }
                                        $(`#modalCrud${input.property}`).append(`
                                            <option value="${value}"${disabled}>${text}</option>
                                        `);
                                    }
                                    $(`#modalCrud${input.property}`).val(item[input.property]);
                                }
                            );
                        }
                        html += `
                            </select>
                        `;
                        break;

                    case 'text':
                        html += `
                            <input id="modalCrud${input.property}" type="text" class="form-control"${disabled}>
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
                                <button id="modalCrudOk" type="button" class="btn btn-${bgColor}">${verbo}</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#modais').empty();
            $('#modais').append(html);

            for (const input of inputs) {
                $(`#modalCrud${input.property}`).val(item[input.property]);
            }

            awaiter.await();
        }

        #onCrudOkClick(qual, item) {
            let inputs = null;
            let adjetivo = null;
            switch (qual) {
                case 'insert':
                    inputs = this.#config.insert.inputs;
                    adjetivo = `incluíd${this.#config.entity.genero}`;
                    break;

                case 'update':
                    inputs = this.#config.update.inputs;
                    adjetivo = `alterad${this.#config.entity.genero}`;
                    break;

                case 'delete':
                    inputs = [];
                    adjetivo = `excluíd${this.#config.entity.genero}`;
                    break;
            
                default:
                    throw `Operação desconhecida: "${qual}"`;
                    break;
            }

            for (const input of inputs) {
                item[input.property] = $(`#modalCrud${input.property}`).val();
            }
            
            let promise = null;
            switch (qual) {
                case 'insert':
                    promise = this.#config.entity.backend.insert(this.#config.entity.name, item);
                    break;

                case 'update':
                    promise = this.#config.entity.backend.update(this.#config.entity.name, item, this.#config.entity.id);
                    break;

                case 'delete':
                    promise = this.#config.entity.backend.delete(this.#config.entity.name, 'id', item.id);
                    break;
            
                default:
                    throw `Operação desconhecida: "${qual}"`;
                    break;
            }

            $.when(promise).then((data) => {
                Frontend.Page.addMessage('info', '', `${this.#config.entity.singularMaiusculo} ${adjetivo}.`);
                $('#modalCrud').modal('hide');
                this.#select();
            }).catch((failFilter) => {
                if (!Array.isArray(failFilter)) {
                    failFilter = [failFilter];
                }
                for (const msg of failFilter) {
                    Frontend.Page.addMessage('danger', '', msg, '#modalCrudMensagens');
                }
            });
        }
    }

    constructor(config) {
        for (const route of config.routes) {
            if (location.search.match(route.getRegex())) {
                route.gotoPage();
                return;
            }
        }
    }
}
