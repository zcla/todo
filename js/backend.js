"use strict";

class Backend {
    static Entity = class {
        static Property = class {
            constructor(config) {
                this.#config = config;
            }

            #config = {};
            getConfig() {
                return this.#config;
            }
        }

        constructor(config) {
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

        drop() {
            localStorage.removeItem(this.#config.name);
        }

        load() {
            const json = localStorage[this.#config.name];
            if (json === undefined) {
                return [];
            }
            return JSON.parse(json);
        }

        validate(operation, data) {
            const erros = [];
            if (!['insert', 'update', 'delete'].includes(operation)) {
                throw [`Invalid operation "${operation}".`];
            }
            const result = {};
            for (const property of this.#config.properties) {
                const propertyName = property.getConfig().name;
                let value = data[propertyName];

                if (property.getConfig().identity) {
                    switch (operation) {
                        case 'insert':
                            if (value) {
                                debugger;
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

        save(entities) {
            localStorage[this.#config.name] = JSON.stringify(entities);
        }
    }

    constructor(config) {
        this.#config = config;
    }

    #config = null;
    getConfig() {
        return this.#config;
    }

    #getEntityByName(entityName) {
        return this.#config.entities.find((entity) => entity.getConfig().name == entityName);
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

    export() {
        const result = {};
        for (const entity of this.#config.entities){
            result[entity.getConfig().name] = entity.load();
        }
        StringUtils.downloadString(JSON.stringify(result), `${this.#config.id}.${DateUtils.formatYYYYMMDDHHNNSS(new Date())}.json`);
    }

    import(data) {
        for (const entity of this.#config.entities){
            const key = entity.getConfig().name;
            if (data[key]) {
                // TODO Na verdade, aqui seria melhor validar cada um (se existe, update; se não existe, insert)
                entity.save(data[key]);
            }
        }
    }

    clearAllData() {
        for (const entity of this.#config.entities){
            entity.drop();
        }
    }
}
