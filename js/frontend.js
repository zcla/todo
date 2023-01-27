"use strict";

/* abstract */ class Frontend {
    addMessage(tipo, titulo, mensagem, selector) {
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
        if (tipo == 'success') {
            $(`${selector} .alert`).fadeTo(5000, 500).slideUp(500, function(){
                $(this).slideUp(500, function() {
                    $(this).alert('close');
                });
            });
        }
    }

    show(app, path, data) {
        throw new Error('Implementar na subclasse.');
    }

    throw(error) {
        let msg = error;
        if (msg instanceof ErrorEvent) {
            msg = msg.error;
        }
        if (msg instanceof Error) {
            const stack = msg.stack.split('\n');
            let htmlStack = '';
            for (const item of stack) {
                let classe = '';
                if (item.match(/\/3rdp\//)) {
                    classe = 'stack3rdp';
                }
                htmlStack += `<span class="${classe}">${item.replace('<', '&lt;')}</span><br>`;
            }
            msg = `${msg.message}<br><pre class="erro">${htmlStack}</pre>`;
        }
        this.addMessage('danger', `Erro interno da aplicação! ${EmojiUtils.grimacing_face}`, msg);
    }
}

class FrontendCrud extends Frontend {
    constructor(config) {
        //  config {
        //      selector: string        => Selector jQuery onde os dados devem ser "appendados".
        //      titulo: string          => Título a ser mostrado na tela de select.
        //      entity: {
        //          genero: string ('o' ou 'a')     => Gênero do objeto tratado na entidade (masculino ou feminino).
        //          singularMaiusculo: string       => Nome do objeto quando tratao no singular com a(s) primeira(s) letra(s) maiúscula(s).
        //          singularMinusculo: string       => Nome do objeto quando tratao no singular com letras minúsculas.
        //      }
        //      select: {
        //          onToolbarCreated: function(app, selector)     => É chamado logo após o toolbar ser criado, para que sejam adicionados novos botões, que devem ser "appendados" no selector indicado.
        //      insert: {
                    // TODO Isso tem que virar uma classe separada
        //          inputs: [ {     => Array de inputs que ficarão na tela:
        //              property: string        => Nome da propriedade no Backend.
        //              display: string         => Nome da propriedade do Frontend.
        //              type: string            => Tipo de propriedade. Suportados hoje: text, number e select.
        //          } ]
        //      }
        //      update: {
        //          inputs:     => Igual a insert, acima.
        //      }
        //      delete: {
        //          inputs:     => Igual a insert, acima.
        //      }
        //  }

        super();
        this.#config = config;
    }

    #config = null;

    async show(app, path, data) {
        function fail(crud, selector, data) {
            if (Array.isArray(data)) {
                for (const msg of data) {
                    crud.addMessage('danger', '', msg, selector);
                }
            } else {
                crud.throw(data);
            }
        }

        function success(crud, verbo) {
            app.refresh();
            crud.addMessage('success', '', `${crud.#config.entity.singularMaiusculo} ${verbo}${crud.#config.entity.genero}.`);
            $('#modalCrud').modal('hide');
        }

        if (path == '#select') {
            path = '';
        }
        if (path) {
            switch (path) {
                case '-fail': // Equivalente a #select-fail
                    fail(this, '#modalCrud_Mensagens', data);
                    break;

                case '#insert':
                    this.#onCrudClick(app, path.substring(1), data);
                    break;
                case '#insert-fail':
                    fail(this, null, data);
                    break;
                case '#insert-ok-success':
                    success(this, 'incluíd');
                    break;
                case '#insert-ok-fail':
                    fail(this, '#modalCrud_Mensagens', data);
                    break;

                case '#update':
                    this.#onCrudClick(app, path.substring(1), data);
                    break;
                case '#update-fail':
                    fail(this, null, data);
                    break;
                case '#update-ok-success':
                    success(this, 'alterad');
                    break;
                case '#update-ok-fail':
                    fail(this, '#modalCrud_Mensagens', data);
                    break;
    
                case '#delete':
                    this.#onCrudClick(app, path.substring(1), data);
                    break;
                case '#delete-fail':
                    fail(this, null, data);
                    break;
                case '#delete-ok-success':
                    success(this, 'excluíd');
                    break;
                case '#update-ok-fail':
                    fail(this, '#modalCrud_Mensagens', data);
                    break;

                default:
                    debugger;
                    this.throw(`[FrotendCrud] Unknown path: ${path}`);
                    break;
            }
        } else {
            this.#showSelect(app, data);
        }

        if (data && data.callback) {
            await data.callback(app);
        }
    }

    #showSelect(app, data) {
        const config = this.#config;
        $(config.selector).empty();

        // Título
        $(config.selector).append(`
            <h1 id="titulo">${config.titulo}</h1>
        `);

        // Toolbar
        let html = `
                <div id="toolbar" class="btn-toolbar float-end d-print-none">
                    <div class="btn-group">
        `;
        if (config.insert) {
            html += `
                <button id="btnInsert" type="button" class="btn bg-success-subtle" title="Incluir">${EmojiUtils.plus}</button>
            `;
        }
        html += `
                    </div>
                </div>
        `;
        $('#conteudo #titulo').append(html);
        $('#btnInsert').click(app.navigate.bind(app, '#insert'));
        if (config.select && config.select.onToolbarCreated) {
            config.select.onToolbarCreated(app, '#toolbar .btn-group');
        }

        $(config.selector).append(`
            <div id="select" class="mb-3">
                <table class="table table-sm table-hover">
                    <thead>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        `);

        if (data.columns.find((col) => { return col.title })) {
            let html = `
                <tr id="selectTitle">
            `
            for (const column of data.columns) {
                html += `
                    <th>
                        ${column.title ? column.title : ''}
                    </th>
                `;
            }
            html += `
                <th class="botoes d-print-none"></th>
                </tr>
            `
            $('#select thead').append(html);
        }

        for (const item of data.data) {

            let html = `
                <tr id="selectItem_${item.id}">
            `;
            for (const column of data.columns) {
                html += `
                    <td>
                        ${item[column.property] ? item[column.property] : ''}
                    </td>
                `;
            }
            html += `
                <td class="botoes d-print-none">
                    <div class="btn-group" role="group">
            `;
            if (config.update) {
                html += `
                    <button id="btnUpdate_${item.id}" type="button" class="btn btn-sm bg-warning-subtle" title="Alterar">${EmojiUtils.pencil}</button>
                `;
            }
            if (config.delete) {
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
            $(`#btnUpdate_${item.id}`).click(app.navigate.bind(app, `#update`, { id: item.id }));
            $(`#btnDelete_${item.id}`).click(app.navigate.bind(app, `#delete`, { id: item.id }));
        }
    }

    #onCrudClick(app, qual, data) {
        let verbo = null;
        let bgColor = 'primary';
        let inputs = null;
        let disabled = '';
        switch (qual) {
            case 'insert':
                verbo = 'Incluir';
                bgColor = 'success';
                inputs = this.#config.insert.inputs;
                break;

            case 'update':
                verbo = 'Alterar';
                bgColor = 'warning';
                inputs = this.#config.update.inputs;
                break;

            case 'delete':
                verbo = 'Excluir';
                bgColor = 'danger';
                inputs = this.#config.delete.inputs;
                disabled = ' disabled';
                break;
        
            default:
                this.throw(`[FrontendCrud.#onCrudClick] Unknown path: ${qual}`);
                break;
        }

        let html = `
            <div id="modalCrud" class="modal fade" tabindex="-1" aria-labelledby="modalCrud_Label" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-${bgColor}-subtle">
                            <h1 id="modalCrud_Label" class="modal-title fs-5">${verbo} ${this.#config.entity.singularMinusculo}</h1>
                        </div>
                        <div class="modal-body">
                            <div id="modalCrud_Mensagens" class="mt-3">
                            </div>
                            <form>
        `;
        if (['update', 'delete'].includes(qual)) {
            html += `
                <input id="modalCrud_id" type="hidden" class="form-control" value="${data.form.id}">
            `;
        }
        for (const input of inputs) {
            html += `
                <div class="mb-3">
                    <label for="modalCrud_${input.property}" class="form-label">${input.display}</label>
            `;
            switch (input.type) {
                case 'number':
                    html += `
                        <input id="modalCrud_${input.property}" type="number" class="form-control"${disabled}>
                    `;
                    break;

                case 'select':
                    $(`#modalCrud_${input.property}`).empty();
                    html += `
                        <select id="modalCrud_${input.property}" class="form-select"${disabled}>
                    `;
                    html += `
                        </select>
                    `;
                    break;

                case 'text':
                    html += `
                        <input id="modalCrud_${input.property}" type="text" class="form-control"${disabled}>
                    `;
                    break;

                default:
                    this.throw(`[FrontendCrud.#onCrudClick] Unknown input type: ${input.type}.`);
                    break;
            }
            html += `
                </div>
            `;
        }
        // TODO Enter para confirmar
        html += `
                            </form>
                        </div>
                        <div class="modal-footer bg-${bgColor}-subtle">
                            <button id="modalCrud_btnOk" type="button" class="btn btn-${bgColor}">${verbo}</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        $('#modais').empty();
        $('#modais').append(html);

        for (const input of inputs) {
            switch (input.type) {
                case 'number':
                    $(`#modalCrud_${input.property}`).val(data.form[input.property]);
                    break;

                case 'text':
                    $(`#modalCrud_${input.property}`).val(data.form[input.property]);
                    break;

                case 'select':
                    $(`#modalCrud_${input.property}`).empty();
                    for (const itemSelect of data.select[input.property]) {
                        $(`#modalCrud_${input.property}`).append(`
                            <option value="${itemSelect.value}">${itemSelect.text}</option>
                        `);
                    }
                    $(`#modalCrud_${input.property}`).val(data.form[input.property]);
                    html += `
                        </select>
                    `;
                    break;

                default:
                    this.throw(`[FrontendCrud.#onCrudClick] Unknown input type: ${input.type}.`);
                    break;
            }
        }

        $('#modalCrud').modal('show');
        $('#modalCrud').on('shown.bs.modal', () => {
            $('#modalCrud label').first().next().focus();
        });
        $('#modalCrud_btnOk').off();
        $('#modalCrud_btnOk').click(this.#onCrudOkClick.bind(this, app, qual));
    }

    #onCrudOkClick(app, qual) {
        let inputs = [];
        switch (qual) {
            case 'insert':
                inputs = this.#config.insert.inputs;
                break;

            case 'update':
                inputs = this.#config.update.inputs;
                break;

            case 'delete':
                break;
        
            default:
                this.throw(`[FrontendCrud.#onCrudOkClick] Unknown path: ${qual}`);
                break;
        }

        const params = {
            id:  $(`#modalCrud_id`).val()
        };
        for (const input of inputs) {
            let val = $(`#modalCrud_${input.property}`).val();
            if (input.type == 'number') {
                val = parseInt(val);
            }
            params[input.property] = val;
        }

        app.navigate(`#${qual}-ok`, params);
    }
}

class FrontendError extends Frontend {
    constructor(error) {
        // TODO Documentar config
        super();
        this.throw(error);
    }
}

// TODO Já foi útil; criar uma opção só para demostrar ("Sobre", por exemplo)
// // Classe que não monta absolutamente nada; todo o trabalho deve ser feito a partir do callback.
// static Custom = class extends this.Page {
//     #callback = null;

//     constructor(callback) {
//         super();
//         this.#callback = callback;
//     }

//     go() {
//         this.#callback();
//     }
// }
