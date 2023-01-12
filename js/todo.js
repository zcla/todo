"use strict";

$(document).ready(() => {
    // Hander geral de erros
    window.addEventListener('error', (e) => {
        Frontend.Page.addMessage('danger', `Erro inesperado! ${EmojiUtils.grimacing_face}`, `${e.error.stack.replace('\n', '<br>')}`);
        console.debug(e);
    });

    // Inicia
    new Todo();
});

const backend = new Backend({
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
                    // TODO Não permitir ser igual ao id (isso tá no frontend; tem que ir pro backend tb)
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

class Todo {
    static TarefaBackend = class {
        static transformData(tarefas) {
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

    static async onTarefaSelectClick(id) {
        async function setCumprida(id, cumprida) {
            const tarefa = await backend.getById('Tarefa', id);
            tarefa.cumprida = cumprida;
            backend.update('Tarefa', tarefa);
        }

        const tr = $(`#Tarefa_${id}`);
        const checkbox = $(`#Tarefa_${id} input[type='checkbox']`);
        setCumprida(id, checkbox.prop('checked'));
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
                    setCumprida(parentId, true);
                    if (indent > 1) {
                        Todo.onTarefaSelectClick(parentId);
                    }
                    break;
                }
                const currentChildId = currentChild.attr('id').split('_')[1];
                if (!$(`#Tarefa_check_${currentChildId}`).prop('checked')) {
                    // Se tem ao menos um não checado
                    $(`#Tarefa_check_${parentId}`).prop('checked', false);
                    setCumprida(parentId, false);
                    if (indent > 1) {
                        Todo.onTarefaSelectClick(parentId);
                    }
                    break;
                }
                currentChild = currentChild.next();
            }
        }
        Frontend.Page.refresh();
    }

    static async onTarefaUnselectAll() {
        $.when(backend.select('Tarefa')).then((data) => {
            for (const tarefa of data) {
                tarefa.cumprida = false;
                backend.update('Tarefa', tarefa);
            }
            Frontend.Page.refresh();
        });
    }

    constructor() {
        const tarefas = {
            inputs: [
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
                        backend: backend,
                        entity: 'Tarefa',
                        transformData: (tarefas) => {
                            return Todo.TarefaBackend.transformData(tarefas);
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
                            }
                        }
                    }
                }
            ]
        };

        const frontend = new Frontend({
            routes: [
                new Frontend.Route(
                    new RegExp(/^\?pagina=Tarefa$/),
                    new Frontend.Crud({
                        entity: {
                            backend: backend,
                            name: 'Tarefa',
                            genero: 'a',
                            singularMaiusculo: 'Tarefa',
                            singularMinusculo: 'tarefa',
                            pluralMaiusculo: 'Tarefas',
                            transformData: (tarefas) => {
                                return Todo.TarefaBackend.transformData(tarefas);
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
                            toolbar: [
                                {
                                    button: `<button id="btnUnselectAll" type="button" class="btn bg-warning-subtle" title="Desmarcar todas">${EmojiUtils.broom}</button>`,
                                    setupEvents: () => {
                                        $('#btnUnselectAll').click(() => {
                                            Todo.onTarefaUnselectAll();
                                        });
                                    }
                                }
                            ]
                        },
                        insert: {
                            inputs: tarefas.inputs
                        },
                        update: {
                            inputs: tarefas.inputs
                        },
                        delete: {
                            inputs: tarefas.inputs
                        }
                    })
                )
            ]
        });
    }
}
