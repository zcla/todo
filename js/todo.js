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
                        })
                    ]
                })
            ]
        });

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
                                            disabled = 'disabled';
                                        }
                                        let result = `
                                            <input class="form-check-input me-1" type="checkbox" value="" id="Tarefa_check_${tarefa.id}"${disabled}>
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
