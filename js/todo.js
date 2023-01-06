"use strict";

$(document).ready(() => {
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
        const backend = new Backend([
            new Backend.Entity('Tarefa', [
                new Backend.Entity.Property('id', {
                    identity: true
                }),
                new Backend.Entity.Property('nome', {
                    notNull: true
                }),
                new Backend.Entity.Property('notas'),
                new Backend.Entity.Property('idMae')
            ])
        ]);

        const frontend = new Frontend([
            new Frontend.Route( // TODO Remover no final
                new RegExp(/^\?pagina=TarefaOld$/),
                new Frontend.Custom(
                    () => {
                        new OldTodo();
                    }
                )
            ),
            new Frontend.Route(
                new RegExp(/^\?pagina=Tarefa$/),
                new Frontend.Crud({
                    entity: {
                        singularMaiusculo: 'Tarefa',
                        singularMinusculo: 'tarefa',
                        pluralMaiusculo: 'Tarefas',
                        genero: 'a'
                    },
                    backend: {
                        backend: backend,
                        entity: 'Tarefa',
                        transformData: (tarefas) => {
                            return Todo.TarefaBackend.transformData(tarefas);
                        }
                    },
                    select: {
                        column: {
                            // property: 'nome', // => sem formatar
                            format: (tarefa) => {
                                let disabled = '';
                                if (tarefa.idsFilhas.length > 0) {
                                    disabled = 'disabled';
                                }
                                let result = `
                                    <input class="form-check-input me-1" type="checkbox" value="" id="Tarefa_${tarefa.id}"${disabled}>
                                    <label class="form-check-label" for="Tarefa_${tarefa.id}">${tarefa.nome}</label>
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
                    },
                    insert: {
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
                                    // valueProperty: 'id',  // => sem formatar
                                    // textProperty: 'nome', // => sem formatar,
                                    transformData: (tarefas) => {
                                        return Todo.TarefaBackend.transformData(tarefas);
                                    },
                                    // TODO me adiantei; é para o update
                                    // isEnabled: (tarefa) => {
                                    //     return tarefa.id != tarefa.idMae;
                                    // },
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
                    }
                })
            )
        ]);
    }
}
