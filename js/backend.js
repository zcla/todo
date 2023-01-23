"use strict";

/* abstract */ class Backend {
    /* abstract */ static Entity = class {
        static Property = class {
            constructor(config) {
            //  config {
            //      name: string            => Nome da propriedade.
            //      identity: boolean       => Autonumeração, usada para os IDs.
            //      notNull: boolean        => Indica se a propriedade pode ser nula.
            //  }

                this.#config = config;
            }

            #config = {};
            getConfig() {
                return this.#config;
            }
        }

        constructor(config) {
            //  config {
            //      name: string        => Nome da entidade.
            //      properties: []      => Array de Backend.Entity.Property.
            //  }

            this.#config = config;
            this.#config.properties.unshift(
                new Backend.Entity.Property({
                    name: 'id',
                    identity: true
                })
            );
        }

        #config = null;
        getConfig() {
            return this.#config;
        }

        #newId() {
            // https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid#2117523
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }

        load() {
            throw 'Implementar na subclasse.';
        }

        save(entities) {
            throw 'Implementar na subclasse.';
        }

        drop() {
            throw 'Implementar na subclasse.';
        }

        validate(operation, data) {
            const erros = [];
            const result = {};
            for (const property of this.#config.properties) {
                const propertyName = property.getConfig().name;
                let value = data[propertyName];

                if (property.getConfig().identity) {
                    switch (operation) {
                        case 'insert':
                            if (value) {
                                erros.push(`Identity property "${propertyName}" must be empty in ${operation} operations.`);
                            }
                            value = this.#newId();
                            break;
                        case 'update':
                            if (!value) {
                                debugger;
                                erros.push(`Identity property "${propertyName}" cannot be empty in ${operation} operations.`);
                            }
                            break;
                        default:
                            debugger;
                            throw [`I don't know how to handle the operation "${operation}"`];
                    }
                }

                if (!value) {
                    if (property.getConfig().notNull) {
                        erros.push(`Property "${propertyName}" cannot be null.`);
                    }
                }
                result[propertyName] = value;
            }
            if (erros.length) {
                throw erros;
            }
            return result;
        }
    }

    constructor(config) {
        //  config {
        //      entities: []    => Array de Backend.Entity.
        //  }
        this.#config = config;
    }

    #config = null;
    getConfig() {
        return this.#config;
    }
    // TODO Exigir begin transaction; implementar commit e rollback

    #getEntityByName(entityName) {
        return this.getConfig().entities.find((entity) => entity.getConfig().name == entityName);
    }

    async select(entityName) {
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw `Entity "${entityName}" not found.`;
        }
        return entity.load();
    }

    async getById(entityName, id) {
        const select = await this.select(entityName);
        return select.find((item) => item.id == id);
    }

    async insert(entityName, entityProperties) {
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw `Entity "${entityName}" not found.`;
        }
        
        const entities = entity.load();
        const newEntity = entity.validate('insert', entityProperties);
        entities.push(newEntity);
        entity.save(entities);
        return newEntity.id;
    }

    async update(entityName, properties) {
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw `Entity "${entityName}" not found.`;
        }
        
        const entities = entity.load();
        let filtered = entities.filter((entity) => entity.id == properties.id);
        if (filtered.length == 0) {
            throw `Entity "${entityName}" doesn't have an element with id = "${properties.id}".`;
        }
        if (filtered.length > 1) {
            throw `Entity "${entityName}" has more than one element with id = "${properties.id}".`;
        }
        const oldEntity = filtered[0];
        const newEntity = entity.validate('update', properties);
        for (const key of Object.keys(newEntity)) {
            oldEntity[key] = newEntity[key];
        }
        entity.save(entities);
        return 1;
    }

    async delete(entityName, properties) {
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw `Entity "${entityName}" not found.`;
        }
        
        const entities = entity.load();
        const restantes = entities.filter((entity) => entity.id != properties.id);
        if (entities.length - restantes.length == 0) {
            throw `Entity "${entityName}" doesn't have an element with id = "${properties.id}".`;
        }
        if (entities.length - restantes.length > 1) {
            throw `Entity "${entityName}" has more than one element with id = "${properties.id}".`;
        }
        entity.save(restantes);
        return entities.length - restantes.length;
    }

    async export() {
        const result = {};
        for (const entity of this.getConfig().entities){
            result[entity.getConfig().name] = entity.load();
        }
        return JSON.stringify(result);
    }

    async import(data) {
        /* TODO Seria bom que a importação fosse realmente uma importação; hoje ela substitui os dados pelos que vieram.
                Problema: o insert causa erro porque a entidade já vem com id. Poderia desabilitar, mas isso poderia causar inconsistência.
                Parece um problema insolúvel por precisar conhecer os dados que vêm.
                Problema de não fazer: os dados importados podem ser inconsistentes.
        */
        for (const entity of this.getConfig().entities){
            const key = entity.getConfig().name;
            if (data[key]) {
                entity.save(data[key]);
            }
        }
    }

    async truncate() {
        for (const entity of this.getConfig().entities){
            entity.drop();
        }
    }
}

class BackendLocalStorage extends Backend {
    static BackendLocalEntity = class extends Backend.Entity {
        load() {
            const json = localStorage[this.getConfig().name];
            if (json === undefined) {
                return [];
            }
            return JSON.parse(json);
        }

        save(entities) {
            localStorage[this.getConfig().name] = JSON.stringify(entities);
        }

        drop() {
            localStorage.removeItem(this.getConfig().name);
        }
    }
}

// TODO Criar Backend json: https://jsonkeeper.com/b/O3AP e https://api.jsonserve.com/FCiKcB
