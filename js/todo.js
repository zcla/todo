"use strict";

$(document).ready(() => {
    // Hander geral de erros
    window.addEventListener('error', (e) => {
        Frontend.Page.addMessage('danger', `Erro inesperado! ${EmojiUtils.grimacing_face}`, `${e.error.stack.replace('\n', '<br>')}`);
        console.debug(e);
    });

    // Inicia
    Todo.init();
});

class Todo {
    static bTodo = null;
    static fTarefasCrud = null;
    static cTodo = null;

    static init() {
        Todo.setupBackendTodo();
        Todo.setupFrontendTarefasCrud();
        // TODO Domain? (com as regras de negócio)
        Todo.setupController();
    }

    static setupBackendTodo() {
        Todo.bTodo = new Backend({
            id: 'todo',
            entities: [
                new Backend.Entity({
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
        });
    }

    static setupFrontendTarefasCrud() {
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
                type: 'select',
                selectData: [
                    ['', '']
                ],
                selectBackend: {
                    backend: Todo.bTodo, // TODO Usar Frontend.Crud.entity.backendId
                    entity: 'Tarefa',
                    transformData: (tarefas) => {
                        return Todo.transformData(tarefas);
                    },
                    disabled: (tarefaSelect, tarefaForm) => {
                        return tarefaSelect.id == tarefaForm.id;
                    },
                    // valueProperty: 'id',  // => sem formatar
                    // textProperty: 'nome'  // => sem formatar,
                    format: (tarefa) => {
                        let indent = '&nbsp;&nbsp;&nbsp;'.repeat(tarefa.indent);
                        return {
                            value: tarefa.id,
                            text: `${indent}${tarefa.nome}`
                        };
                    }
                }
            }
        ];

        Todo.fTarefasCrud = new Frontend.Crud({
            entity: {
                backendId: 'todo',
                name: 'Tarefa',
                genero: 'a',
                singularMaiusculo: 'Tarefa',
                singularMinusculo: 'tarefa',
                pluralMaiusculo: 'Tarefas',
                transformData: (tarefas) => {
                    return Todo.transformData(tarefas);
                }
            },
            select: {
                columns: [
                    {
                        titulo: 'Tarefa',
                        // property: 'nome', // => sem formatar
                        format: (tarefa) => {
                            let disabled = '';
                            if (tarefa.idsFilhas.length > 0) {
                                disabled = ' disabled';
                            }
                            let checked = '';
                            if (tarefa.cumprida) {
                                checked = ' checked';
                            }
                            let result = `
                                            <input class="form-check-input me-1" type="checkbox" value="" id="Tarefa_check_${tarefa.id}"${disabled}${checked} onclick="javascript:Todo.onTarefaSelectClick('${tarefa.id}')">
                                            <label class="form-check-label" for="Tarefa_check_${tarefa.id}">${tarefa.nome}</label>
                                        `;
                            if (tarefa.notas) {
                                result += `
                                                <small>${tarefa.notas}</small>
                                            `;
                            }
                            return `
                                            <span class="indent${tarefa.indent}">
                                                ${result}
                                            </span>
                                        `;
                        }
                    }
                ],
                onToolbacCreated: (selector) => {
                    $(selector).append(`<button id="btnUnselectAll" type="button" class="btn bg-warning-subtle" title="Desmarcar todas">${EmojiUtils.broom}</button>`);
                    $('#btnUnselectAll').click(() => {
                        Todo.onTarefaUnselectAll();
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

    static setupController() {
        Todo.cTodo = new Controller({
            routes: [
                new Controller.Route({
                    regex: new RegExp(/^\?pagina=Tarefa$/),
                    frontend: Todo.fTarefasCrud,
                    backends: [
                        Todo.bTodo
                    ]
                })
            ]
        });
    }

    static transformData(tarefas) {
        // TODO Isso é controller, não frontend
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

    static async onTarefaSelectClick(id) {
        // TODO Isso é negócio, não frontend
        async function setCumprida(id, cumprida) {
            const tarefa = await Todo.bTodo.getById('Tarefa', id);
            tarefa.cumprida = cumprida;
            await Todo.bTodo.update('Tarefa', tarefa);
        }

        const tr = $(`#Tarefa_${id}`);
        const checkbox = $(`#Tarefa_${id} input[type='checkbox']`);
        await setCumprida(id, checkbox.prop('checked'));
        const indent = parseInt(checkbox.parent().attr('class').substring(6));
        if (indent > 0) {
            let parent = tr.prev();
            while (parent.children('td').first().children('span').attr('class') != `indent${indent - 1}`) {
                parent = parent.prev();
            }
            const parentId = parent.attr('id').split('_')[1];
            let currentChild = parent.next();
            while (true) {
                if ((!currentChild.length) || currentChild.find(`.indent${indent - 1}`).length) {
                    // Se acabou ou chegou ao próximo "parent" é porque todos estão "checados"
                    $(`#Tarefa_${parentId} input[type='checkbox']`).prop('checked', true);
                    await setCumprida(parentId, true);
                    if (indent > 1) {
                        Todo.onTarefaSelectClick(parentId);
                    }
                    break;
                }
                const currentChildId = currentChild.attr('id').split('_')[1];
                if (!$(`#Tarefa_check_${currentChildId}`).prop('checked')) {
                    // Se tem ao menos um não checado
                    $(`#Tarefa_check_${parentId}`).prop('checked', false);
                    await setCumprida(parentId, false);
                    if (indent > 1) {
                        Todo.onTarefaSelectClick(parentId);
                    }
                    break;
                }
                currentChild = currentChild.next();
            }
        }
        this.fTarefasCrud.refresh();
    }

    static async onTarefaUnselectAll() {
        // TODO Isso é negócio, não frontend
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
        const thisTodo = this;
        $('#modalBackendDesmarcarOk').click(() => {
            $.when(Todo.bTodo.select('Tarefa')).then((data) => {
                for (const tarefa of data) {
                    tarefa.cumprida = false;
                    Todo.bTodo.update('Tarefa', tarefa);
                }
                $('#modalBackendDesmarcar').modal('hide');
                thisTodo.fTarefasCrud.refresh();
            });
        });
    }
}
