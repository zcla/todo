"use strict";

class OldTodo {
    constructor() {
        const backend = newBackend();
        $('#backend_exportar').click(() => {
            backend.export('todo');
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
            OldFrontend.adicionaMensagem('warning', '', 'Essa opção foi desabilitada por segurança. Para reabilitar é necessário mudar o código fonte.');
            // backend.dropDatabase();
            // window.location.reload();
        });
        new OldController('Tarefa', backend);

        function newBackend() {
            return new Backend([
                Tarefa()
            ]);
        }

        function Tarefa() {
            return new Backend.Entity('Tarefa', [
                new Backend.Entity.Property('id', {
                    identity: true
                }),
                new Backend.Entity.Property('nome', {
                    notNull: true
                }),
                new Backend.Entity.Property('notas'),
                new Backend.Entity.Property('idMae')
            ]);
        }
    }
}

class OldController {
    constructor(paginaDefault, backend) {
        window.addEventListener('error', this.#onError.bind(this)); // TODO Não funciona a partir de certo ponto (eventos e promises, parece)
        this.#evalUrl(paginaDefault, backend);
    }

    #onError(e) {
        OldFrontend.adicionaMensagem('danger', `Erro inesperado! ${EmojiUtils.grimacing_face}`, `${e.message}<br>${e.error}`);
        console.log(e);
        debugger;
    }

    #evalUrl(paginaDefault, backend) {
        const params = UrlUtils.getUrlParams();
        let pagina = params.pagina;
        if (!pagina) {
            UrlUtils.gotoUrl(`?pagina=${paginaDefault}`);
            return;
        }
        delete params.pagina;
        try {
            eval(`new OldFrontend_${pagina}(backend, params)`);
        } catch (error) {
            OldFrontend.adicionaMensagem('danger', 'Erro!', `Página desconhecida: <i>${pagina}</i>.`);
        }
    }
}

class OldFrontend {
    static adicionaMensagem(tipo, titulo, mensagem, selector) {
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
}

class OldFrontend_TarefaOld {
    constructor(backend, params) {
        this.#setupPage(backend);
    }

    #setupPage(backend) {
        $('#conteudo').append(`
            <h1>Tarefas</h1>
            <div id="Tarefa" class="mb-3">
                <div class="btn-toolbar mb-3">
                    <div class="btn-group">
                        <button id="btnTarefaIncluir" type="button" class="btn btn-primary">Incluir</button>
                    </div>
                </div>
                <ul class="list-group"></ul>
            </div>
        `);
        $('#include').load('include_Tarefa.html', () => {
            this.#setupEvents(backend);
            this.update(backend);
        });
    }

    #setupEvents(backend) {
        $('#btnTarefaIncluir').click(() => {
            $('#tarefaIncluirNome').val('');
            $('#tarefaIncluirNotas').val('');
            $.when(this.#setupComboMae(backend, '#tarefaIncluirMae')).then((data) => {
                $('#tarefaIncluirMae').val('');
                $('#tarefaIncluir').modal('show');
                $('#tarefaIncluirNome').focus();
                $('#tarefaIncluirIncluir').off();
                $('#tarefaIncluirIncluir').click(() => {
                    const tarefa = {
                        nome: $('#tarefaIncluirNome').val(),
                        notas: $('#tarefaIncluirNotas').val(),
                        idMae: $('#tarefaIncluirMae').val()
                    };
                    $.when(backend.insert('Tarefa', tarefa)).then((data) => {
                        OldFrontend.adicionaMensagem('info', '', `Tarefa incluída.`);
                        $('#tarefaIncluir').modal('hide');
                        this.update(backend);
                    }).catch((failFilter) => {
                        for (const msg of failFilter) {
                            OldFrontend.adicionaMensagem('danger', '', msg, '#tarefaIncluirMensagens');
                        }
                    });
                });
            });
        });
    }

    async #setupComboMae(backend, selector) {
        $(selector).empty();
        $(selector).append(`
            <option selected></option>
        `);
        const tarefas = OldFrontend_Entity_Tarefa.instancia(await backend.select('Tarefa'));
        for (const tarefa of tarefas) {
            let indent = '&nbsp;&nbsp;&nbsp;'.repeat(tarefa.indent);
            $(selector).append(`
                <option value="${tarefa.id}">${indent}${tarefa.nome}</option>
            `);
        }
    }

    update(backend) {
        $.when(backend.select('Tarefa')).then((data) => {
            const tarefas = OldFrontend_Entity_Tarefa.instancia(data);
            $('#Tarefa .list-group').empty();
            for (const tarefa of tarefas) {
                let disabled = '';
                if (tarefa.idsFilhas.length > 0) {
                    disabled = 'disabled';
                }
                let htmlTarefa = `
                    <input class="form-check-input me-1" type="checkbox" value="" id="Tarefa_${tarefa.id}"${disabled}>
                    <label class="form-check-label" for="Tarefa_${tarefa.id}">${tarefa.nome}</label>
                `;
                if (tarefa.notas) {
                    htmlTarefa += `
                        <small>${tarefa.notas}</small>
                    `;
                }
                $('#Tarefa .list-group').append(`
                    <li class="list-group-item indent${tarefa.indent}">
                        ${htmlTarefa}
                        <button id="TarefaExcluir_${tarefa.id}" type="button" class="btn btn-sm btn-danger float-end">Excluir</button>
                        <button id="TarefaAlterar_${tarefa.id}" type="button" class="btn btn-sm btn-primary float-end me-2">Alterar</button>
                    </li>
                `);

                $(`#TarefaAlterar_${tarefa.id}`).click(() => {
                    $('#tarefaAlterarNome').val(tarefa.nome);
                    $('#tarefaAlterarNotas').val(tarefa.notas);
                    $.when(this.#setupComboMae(backend, '#tarefaAlterarMae')).then((data) => {
                        $('#tarefaAlterarMae').val(tarefa.idMae);
                        $('#tarefaAlterar').modal('show');
                        $('#tarefaAlterarNome').focus();
                        $('#tarefaAlterarAlterar').off();
                        $('#tarefaAlterarAlterar').click(() => {
                            const alterar = {
                                id: tarefa.id,
                                nome: $('#tarefaAlterarNome').val(),
                                notas: $('#tarefaAlterarNotas').val(),
                                idMae: $('#tarefaAlterarMae').val()
                            };
                            $.when(backend.update('Tarefa', alterar, 'id')).then((data) => {
                                OldFrontend.adicionaMensagem('info', '', `Tarefas alteradas: ${data}.`);
                                $('#tarefaAlterar').modal('hide');
                                this.update(backend);
                            }).catch((failFilter) => {
                                for (const msg of failFilter) {
                                    OldFrontend.adicionaMensagem('danger', '', msg, '#tarefaAlterarMensagens');
                                }
                            });
                        });
                    });
                });
                $(`#TarefaExcluir_${tarefa.id}`).click(() => {
                    $('#tarefaExcluir .modal-body').empty();
                    $('#tarefaExcluir .modal-body').append(htmlTarefa);
                    $('#tarefaExcluir').modal('show');
                    $('#tarefaExcluirExcluir').off();
                    $('#tarefaExcluirExcluir').click(() => {
                        $.when(backend.delete('Tarefa', 'id', tarefa.id)).then((data) => {
                            $('#tarefaExcluir').modal('hide');
                            this.update(backend);
                            OldFrontend.adicionaMensagem('info', '', `Tarefas excluídas: ${data}.`);
                        });
                    });
                });
            }
        });
    }
}

class OldFrontend_Entity_Tarefa {
    static instancia(tarefas) {
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
