"use strict";

$(document).ready(() => {
    // Hander geral de erros
    window.addEventListener('error', (e) => {
        new FrontendError(e);
    });

    // Inicia
    new Todo();
});

class Todo {
    static Tarefa = class {
        static comboTarefas(tarefas) {
            const compl = Todo.Tarefa.complementaDados(tarefas);
            const result = [
                {
                    value: '',
                    text: ''
                }
            ];
            for (const tarefa of compl) {
                let indent = '&nbsp;&nbsp;&nbsp;'.repeat(tarefa.indent);
                result.push({
                    value: tarefa.id,
                    text: `${indent}${tarefa.nome}`
                });
            }
            return result;
        }

        static complementaDados(tarefas) {
            function ordena(tarefas, idMae) {
                let filhos = [];
                if (idMae) {
                    filhos = filhos.concat(tarefas.filter((t) => t.idMae == idMae));
                } else {
                    filhos = filhos.concat(tarefas.filter((t) => !t.idMae));
                }
                filhos.sort((a, b) => {
                    function trataNull(obj) {
                        if (obj) {
                            return obj;
                        }
                        return 0;
                    }
                    if (a.cumprida && !b.cumprida) {
                        return 1;
                    }
                    if (!a.cumprida && b.cumprida) {
                        return -1;
                    }
                    if (trataNull(a.peso) > trataNull(b.peso)) {
                        return -1;
                    }
                    if (trataNull(a.peso) < trataNull(b.peso)) {
                        return 1;
                    }
                    if (a.nome > b.nome) {
                        return -1;
                    }
                    if (a.nome < b.nome) {
                        return 1;
                    }
                })

                let result = [];
                for (const f of filhos) {
                    result.push(f);
                    result = result.concat(ordena(tarefas, f.id));
                }
                return result;
            }
            const result = [];
            const sorted = ordena(tarefas);
            for (const tarefa of sorted) {
                const fTarefa = {
                    id: tarefa.id,
                    nome: tarefa.nome,
                    notas: tarefa.notas,
                    idMae: tarefa.idMae,
                    peso: tarefa.peso,
                    cumprida: tarefa.cumprida,
                    indent: 0,
                    idsFilhas: []
                };
                if (fTarefa.idMae) {
                    const tarefaMae = tarefas.find((x) => x.id == fTarefa.idMae);
                    const fTarefaMae = result.find((fTarefa) => fTarefa.id == tarefaMae.id);
                    fTarefa.indent = fTarefaMae.indent + 1;
                    fTarefaMae.idsFilhas.push(fTarefa.id);
                }
                result.push(fTarefa);
            }
            return result;
        }
    }

    constructor() {
        const bTodo = this.setupBackendTodo();

        const fTarefasCrud = this.setupFrontendTarefasCrud(bTodo); // TODO Tá errado esse troço do Frontend ir direto no Backend

        const controller = this.setupController(bTodo, fTarefasCrud);
        controller.navigate(location.search);

        this.setupMenuDados(bTodo, fTarefasCrud, controller);
    }

    setupBackendTodo() {
        // return new BackendLocalStorage({
        return new BackendNpoint({
            entities: [
                new BackendJson.BackendLocalEntity({
                    name: 'Tarefa',
                    properties: [
                        new Backend.Entity.Property({
                            name: 'nome',
                            notNull: true
                        }),
                        new Backend.Entity.Property({
                            name: 'notas'
                        }),
                        new Backend.Entity.Property({
                            name: 'idMae'
                            // TODO foreign key e todas as suas consequências (insert, update, delete)
                            // TODO Não permitir ser igual ao id (isso tá no frontend; tem que ir pro backend)
                        }),
                        new Backend.Entity.Property({
                            name: 'peso'
                        }),
                        new Backend.Entity.Property({
                            name: 'cumprida'
                        })
                    ]
                })
            ]
        // }); // BackendLocalStorage
        }, 'https://api.npoint.io/xxxx'); // BackendNpoint
        // TODO A URL acima não pode ficar no fonte, claro!
        // TODO Público: xxxx
        // TODO Privado: xxxx
        // TODO Ver se o POST funciona quando é privado.
    }

    setupFrontendTarefasCrud(bTodo) {
        const tarefasInputs = [
            {
                property: 'nome',
                display: 'Nome',
                type: 'text'
            },
            {
                property: 'notas',
                display: 'Notas',
                type: 'text'
            },
            {
                property: 'peso',
                display: 'Peso',
                type: 'number'
            },
            {
                property: 'idMae',
                display: 'Tarefa "mãe"',
                type: 'select'
            }
        ];

        return new FrontendCrud({
            selector: '#conteudo',
            titulo: 'Tarefas',
            entity: {
                genero: 'a',
                singularMaiusculo: 'Tarefa',
                singularMinusculo: 'tarefa'
            },
            select: {
                onToolbarCreated: (app, selector) => {
                    $(selector).append(`<button id="btnUnselectAll" type="button" class="btn bg-warning-subtle" title="Desmarcar todas">${EmojiUtils.broom}</button>`);
                    $('#btnUnselectAll').click(async () => {
                        $('#modais').empty();
                        $('#modais').append(`
                            <div id="modalBackendDesmarcar" class="modal fade" tabindex="-1" aria-labelledby="modalCrudLabel" aria-hidden="true">
                                <div class="modal-dialog modal-xl">
                                    <div class="modal-content">
                                        <div class="modal-header bg-warning-subtle">
                                            <h1 id="modalCrudLabel" class="modal-title fs-5">Todas as tarefas serão desmarcadas! Confirma?</h1>
                                        </div>
                                        <div class="modal-footer">
                                            <button id="modalBackendDesmarcarOk" type="button" class="btn btn-warning">Desmarcar</button>
                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `);
                        $('#modalBackendDesmarcar').modal('show');
                        $('#modalBackendDesmarcarOk').off();
                        $('#modalBackendDesmarcarOk').click(async () => {
                            app.navigate(`#update-desmarcarTodas`);
                        });
                    });
                }
            },
            insert: {
                inputs: tarefasInputs
            },
            update: {
                inputs: tarefasInputs
            },
            delete: {
                inputs: tarefasInputs
            }
        });
    }

    setupMenuDados(backend, frontend, controller) {
        $('#backend_exportar').click(async () => {
            const data = await backend.export();
            StringUtils.downloadString(data, `todo.${DateUtils.formatYYYYMMDDHHNNSS(new Date())}.json`);
            frontend.addMessage('success', '', 'Exportação feita com sucesso.');
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
                    .then(() => {
                        $('#storageUploadSpinner').addClass('d-none');
                        $('#storageUpload input').val(null);
                        controller.refresh();
                        frontend.addMessage('success', '', 'Importação feita com sucesso.');
                    });
            }
            reader.readAsText(file);
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
                            <div class="modal-footer bg-danger-subtle">
                                <button id="modalBackendLimparOk" type="button" class="btn btn-danger">Limpar</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            $('#modalBackendLimpar').modal('show');
            $('#modalBackendLimparOk').off();
            $('#modalBackendLimparOk').click(async () => {
                await backend.truncate();
                controller.refresh();
                frontend.addMessage('success', '', 'Limpeza feita com sucesso.');
                $('#modalBackendLimpar').modal('hide');
            });
        });
    }

    setupController(bTodo, fTarefasCrud) {
        return new App({
            routes: [
                new App.Route({
                    regex: new RegExp(/^\?pagina=Tarefa$/),
                    frontend: fTarefasCrud,
                    data: {
                        select: async () => {
                            await bTodo.beginTransaction();
                            try {
                                const cru = await bTodo.select('Tarefa');
                                const tarefas = Todo.Tarefa.complementaDados(cru);

                                const data = [];
                                for (const tarefa of tarefas) {
                                    let disabled = '';
                                    if (tarefa.idsFilhas.length > 0) {
                                        disabled = ' disabled';
                                    }
                                    let checked = '';
                                    if (tarefa.cumprida) {
                                        checked = ' checked';
                                    }
                                    let result = `
                                        <span class="col-1" style="width: 1px !important">
                                            <input class="form-check-input me-1" type="checkbox" value="" id="Tarefa_check_${tarefa.id}"${disabled}${checked}>
                                        </span>
                                        <span class="col">
                                            <label class="form-check-label" for="Tarefa_check_${tarefa.id}">${tarefa.nome}</label>
                                    `;
                                    if (tarefa.notas) {
                                        result += `
                                            <small>${tarefa.notas}</small>
                                        `;
                                    }
                                    result += `
                                        </span>
                                    `;
                                    data.push({
                                        id: tarefa.id,
                                        nome: `
                                            <span class="row indent${tarefa.indent}">
                                                ${result}
                                            </span>
                                        `
                                    });
                                }

                                return {
                                    data: data,
                                    columns: [
                                        {
                                            title: 'Tarefa', // TODO remover depois de documentar
                                            property: 'nome'
                                        }
                                    ],
                                    callback: async (app) => {
                                        for (const tarefa of tarefas) {
                                            $(`#Tarefa_check_${tarefa.id}`).click(async () => {
                                                app.navigate(`#update-cumprida`, { id: tarefa.id });
                                            });
                                        }
                                    }
                                };
                            } finally {
                                await bTodo.rollbackTransaction();
                            }
                        },
                        insert: async () => {
                            await bTodo.beginTransaction();
                            try {
                                return {
                                    form: {
                                        peso: 0
                                    },
                                    select: {
                                        idMae: Todo.Tarefa.comboTarefas(await bTodo.select('Tarefa'))
                                    }
                                };
                            } finally {
                                await bTodo.rollbackTransaction();
                            }
                        },
                        update: async (params) => {
                            await bTodo.beginTransaction();
                            try {
                                const tarefas = await bTodo.select('Tarefa');
                                const tarefa = tarefas.find(tarefa => tarefa.id == params.id);
                                return {
                                    form: { // TODO == tarefa?
                                        id: tarefa.id,
                                        nome: tarefa.nome,
                                        notas: tarefa.notas,
                                        peso: tarefa.peso,
                                        idMae: tarefa.idMae
                                    },
                                    select: {
                                        idMae: Todo.Tarefa.comboTarefas(tarefas)
                                    }
                                };
                            } finally {
                                await bTodo.rollbackTransaction();
                            }
                        },
                        delete: async (params) => {
                            await bTodo.beginTransaction();
                            try {
                                const tarefas = await bTodo.select('Tarefa');
                                const tarefa = tarefas.find(tarefa => tarefa.id == params.id);
                                return {
                                    form: { // TODO == tarefa?
                                        id: tarefa.id,
                                        nome: tarefa.nome,
                                        notas: tarefa.notas,
                                        peso: tarefa.peso,
                                        idMae: tarefa.idMae
                                    },
                                    select: {
                                        idMae: Todo.Tarefa.comboTarefas(tarefas)
                                    }
                                };
                            } finally {
                                await bTodo.rollbackTransaction();
                            }
                        }
                    },
                    action: {
                        'insert-ok': async (data) => {
                            await bTodo.beginTransaction();
                            try {
                                await bTodo.insert('Tarefa', data);
                            } finally {
                                await bTodo.commitTransaction();
                            }
                        },
                        'update-ok': async (data) => {
                            await bTodo.beginTransaction();
                            try {
                                await bTodo.update('Tarefa', data);
                            } finally {
                                await bTodo.commitTransaction();
                            }
                        },
                        'delete-ok': async (data) => {
                            await bTodo.beginTransaction();
                            try {
                                await bTodo.delete('Tarefa', data);
                            } finally {
                                await bTodo.commitTransaction();
                            }
                        },
                        'update-cumprida': async (data) => {
                            async function onCheck(id, cumprida) {
                                const tarefa = await bTodo.getById('Tarefa', id);
                                tarefa.cumprida = cumprida;
                                await bTodo.update('Tarefa', tarefa);
                                if (tarefa.idMae) {
                                    if (cumprida) {
                                        const tarefas = await bTodo.select('Tarefa');
                                        const mae = tarefas.find(x => x.id == tarefa.idMae);
                                        const irmas = tarefas.filter(x => x.idMae == mae.id);
                                        cumprida = true;
                                        for (const irma of irmas) {
                                            if (!irma.cumprida) {
                                                cumprida = false;
                                            }
                                        }
                                    }
                                    await onCheck(tarefa.idMae, cumprida);
                                }
                                return;
                            }

                            await bTodo.beginTransaction();
                            try {
                                await onCheck(data.id, $(`#selectItem_${data.id} input[type='checkbox']`).prop('checked'));
                                // app.refresh();
                            } finally {
                                await bTodo.commitTransaction();
                            }
                            return '#select';
                        },
                        'update-desmarcarTodas': async () => {
                            await bTodo.beginTransaction();
                            let count = 0;
                            try {
                                const tarefas = await bTodo.select('Tarefa');
                                for (const tarefa of tarefas) {
                                    if (tarefa.cumprida) {
                                        tarefa.cumprida = false;
                                        await bTodo.update('Tarefa', tarefa);
                                        count++;
                                    }
                                }
                                $('#modalBackendDesmarcar').modal('hide');
                            } finally {
                                await bTodo.commitTransaction();
                            }
                            await bTodo.beginTransaction();
                            if (count > 0) {
                                fTarefasCrud.addMessage('success', '', `${count} tarefa${count > 1 ? 's' : ''} desmarcada${count > 1 ? 's' : ''}.`);
                            }
                            return '#select';
                        }
                    }
                })
            ]
        });
    }
}
