"use strict";

class Frontend {
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

    // Classe que monta tudo baseando-se na configuração passada.
    static Crud = class extends this.Page {
        constructor(config) {
            super();
            this.#config = config;
        }

        #config = null;
        //  {
        //      entity: {
        //          backendId:          ID do Backend.
        //          pluralMaiusculo:    Nome da Backend.Entity no plural, iniciando em maiúsculo.
        //      }
        //      select: {
        //          onToolbacCreated(selector): Callback chamado logo após a criação do toolbar, para que sejam adicionados novos botões e seus eventos.
        //                                      Os botões devem ser adicionados no selector passado como parâmetro: $(selector).append(...).
        //      }
        //      insert: {
        //      }
        //  }

        #route = null;

        start(route) {
            this.#route = route;

            // TODO Isso não é frontend; é coisa específica do backend utilizado
            // Menu "Dados"
            const backend = this.#route.getBackend(this.#config.entity.backendId);
            $('#backend_exportar').click(() => {
                backend.export();
                Frontend.Page.addMessage('info', '', 'Exportação feita com sucesso.');
            });
            $('#backend_importar').click(() => {
                $('#storageUpload').removeClass('d-none');
            });
            const thisEntity = this;
            $('#storageUpload').change(() => {
                $('#storageUpload').addClass('d-none');
                $('#storageUploadSpinner').removeClass('d-none');
                const file = $('#storageUpload input')[0].files[0];
                const reader = new FileReader();
                reader.onload = function(event) {
                    const result = JSON.parse(event.target.result);
                    $.when(backend.import(result))
                        .then((data) => {
                            $('#storageUploadSpinner').addClass('d-none');
                            $('#storageUpload input').val(null);
                            thisEntity.refresh();
                        });
                }
                reader.readAsText(file);
                Frontend.Page.addMessage('info', '', 'Importação feita com sucesso.');
            });
            $('#storageUploadSpinnerCancel').click(() => {
                $('#storageUpload').addClass('d-none');
            });
            $('#backend_limpar').click(() => {
                $('#modais').empty();
                $('#modais').append(`
                    <div id="modalBackendLimpar" class="modal fade" tabindex="-1" aria-labelledby="modalCrudLabel" aria-hidden="true">
                        <div class="modal-dialog modal-xl">
                            <div class="modal-content">
                                <div class="modal-header bg-danger-subtle">
                                    <h1 id="modalCrudLabel" class="modal-title fs-5">Todos os dados serão perdidos! Confirma?</h1>
                                </div>
                                <div class="modal-footer">
                                    <button id="modalBackendLimparOk" type="button" class="btn btn-danger">Limpar</button>
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
                $('#modalBackendLimpar').modal('show');
                $('#modalBackendLimparOk').off();
                const thisCrud = this;
                $('#modalBackendLimparOk').click(() => {
                    backend.clearAllData();
                    thisCrud.refresh();
                    Frontend.Page.addMessage('info', '', 'Limpeza feita com sucesso.');
                    $('#modalBackendLimpar').modal('hide');
                });
            });
            
            this.#select();
        }

        refresh() {
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
                    <div id="toolbar" class="btn-toolbar float-end">
                        <div class="btn-group">
            `;
            if (this.#config.insert) {
                html += `
                    <button id="btnInsert" type="button" class="btn bg-success-subtle" title="Incluir">${EmojiUtils.plus}</button>
                `;
            }
            html += `
                        </div>
                    </div>
            `;
            $('#conteudo h1').append(html);
            $('#btnInsert').click(this.#onCrudClick.bind(this, 'insert', {}));
            if (this.#config.select.onToolbacCreated) {
                this.#config.select.onToolbacCreated('#toolbar .btn-group');
            }

            $('#conteudo').append(`
                <div id="select" class="mb-3">
                    <table class="table table-sm table-bordered table-hover">
                        <tbody>
                        </tbody>
                    </table>
                </div>
            `);

            const backend = this.#route.getBackend(this.#config.entity.backendId);
            $.when(backend.select(this.#config.entity.name)).then((data) => {
                // TODO Continuar daqui
                if (this.#config.entity.transformData) {
                    data = this.#config.entity.transformData(data);
                }
                $('#select tbody').empty();
                for (const item of data) {
                    let html = `
                        <tr id="${this.#config.entity.name}_${item.id}">
                    `;
                    for (const column of this.#config.select.columns) {
                        html += `
                            <td>
                        `;
                        if (column.property) {
                            html += `
                                ${item[column.property]}
                            `;
                        }
                        if (column.format) {
                            html += `
                                ${column.format(item)}
                            `;
                        }
                        html += `
                            </td>
                        `;
                    }
                    html += `
                        <td class="botoes">
                            <div class="btn-group" role="group">
                    `;
                    if (this.#config.update) {
                        html += `
                            <button id="btnUpdate_${item.id}" type="button" class="btn btn-sm bg-warning-subtle" title="Alterar">${EmojiUtils.pencil}</button>
                        `;
                    }
                    if (this.#config.delete) {
                        html += `
                            <button id="btnDelete_${item.id}" type="button" class="btn btn-sm bg-danger-subtle" title="Excluir">${EmojiUtils.wastebasket}</button>
                        `;
                    }
                    html += `
                                </div>
                            </td>
                        </tr>
                    `;
                    $('#select tbody').append(html);
                    $(`#btnUpdate_${item.id}`).click(this.#onCrudClick.bind(this, 'update', item));
                    $(`#btnDelete_${item.id}`).click(this.#onCrudClick.bind(this, 'delete', item));
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
                    case 'number':
                        html += `
                            <input id="modalCrud${input.property}" type="number" class="form-control"${disabled}>
                        `;
                        break;

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
            let tipoMensagem = 'info';
            switch (qual) {
                case 'insert':
                    inputs = this.#config.insert.inputs;
                    adjetivo = `incluíd${this.#config.entity.genero}`;
                    tipoMensagem = 'success';
                    break;

                case 'update':
                    inputs = this.#config.update.inputs;
                    adjetivo = `alterad${this.#config.entity.genero}`;
                    tipoMensagem = 'warning';
                    break;

                case 'delete':
                    inputs = [];
                    adjetivo = `excluíd${this.#config.entity.genero}`;
                    tipoMensagem = 'danger';
                    break;
            
                default:
                    throw `Operação desconhecida: "${qual}"`;
                    break;
            }

            for (const input of inputs) {
                let val = $(`#modalCrud${input.property}`).val();
                if (input.type == 'number') {
                    val = parseInt(val);
                }
                item[input.property] = val;
            }
            
            let promise = null;
            const backend = this.#route.getBackend(this.#config.entity.backendId);
            switch (qual) {
                case 'insert':
                    promise = backend.insert(this.#config.entity.name, item);
                    break;

                case 'update':
                    promise = backend.update(this.#config.entity.name, item);
                    break;

                case 'delete':
                    promise = backend.delete(this.#config.entity.name, item);
                    break;
            
                default:
                    throw `Operação desconhecida: "${qual}"`;
                    break;
            }

            $.when(promise).then((data) => {
                Frontend.Page.addMessage(tipoMensagem, '', `${this.#config.entity.singularMaiusculo} ${adjetivo}.`);
                $('#modalCrud').modal('hide');
                this.refresh();
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
}
