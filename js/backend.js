"use strict";

class Backend {
    static Entity = class {
        static Property = class {
            #name = null;
            getName() {
                return this.#name;
            }
    
            #config = {};
            isIdentity() {
                return this.#config.identity;
            }
            isNotNull() {
                return this.#config.notNull;
            }
        
            constructor(name, config) {
                this.#name = name;
                if (config) {
                    this.#config = config;
                }
            }
        }

        #name = null;
        getName() {
            return this.#name;
        }

        #properties = null;

        constructor(name, properties) {
            this.#name = name;
            this.#properties = properties;
        }

        #newId() {
            // https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid#2117523
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }

        load() {
            const json = localStorage[this.#name];
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
            for (const property of this.#properties) {
                const propertyName = property.getName();
                let value = data[propertyName];

                if (property.isIdentity()) {
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

                if (value) {
                    result[propertyName] = value;
                } else {
                    if (property.isNotNull()) {
                        erros.push(`Property "${propertyName}" cannot be null.`);
                    }
                }
            }
            if (erros.length) {
                throw erros;
            }
            return result;
        }

        save(entities) {
            localStorage[this.#name] = JSON.stringify(entities);
        }
    }

    constructor(entities) {
        this.#entities = entities;
    }

    #entities = null;

    #getEntityByName(entityName) {
        return this.#entities.find((entity) => entity.getName() == entityName);
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

    async update(entityName, entityProperties, idProperty) {
        // TODO receber o filtro como parâmetro
        // TODO atualizar só as propriedades que vêm em entityProperties
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw `Entity "${entityName}" not found.`;
        }
        
        const entities = entity.load();
        const oldEntity = entities.filter((e) => e[idProperty] == entityProperties[idProperty]);
        if (oldEntity.length == 0) {
            throw `Entity "${entityName}" doesn't have an element with ${idProperty} = "${entityProperties[idProperty]}".`;
        }
        if (oldEntity.length > 1) {
            throw `Entity "${entityName}" has more than one element with ${idProperty} = "${entityProperties[idProperty]}".`;
        }
        // TODO Atualmente substitui completamente o objeto. Possibilidade: apenas alterar a oldEntity com os dados em entityProperties (assim dá pra fazer update em uma propriedade só)
        const newEntity = entity.validate('update', entityProperties);
        entities[entities.indexOf(oldEntity[0])] = newEntity;
        entity.save(entities);
        return 1;
    }

    async delete(entityName, idProperty, idValue) {
        // TODO receber o filtro como parâmetro
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw `Entity "${entityName}" not found.`;
        }
        
        const entities = entity.load();
        const restantes = entities.filter((entity) => entity[idProperty] != idValue);
        entity.save(restantes);
        return entities.length - restantes.length;
    }

    export(fileNamePrefix) {
        const result = {};
        for (const entity of this.#entities){
            result[entity.getName()] = entity.load();
        }
        StringUtils.downloadString(JSON.stringify(result), `${fileNamePrefix}.${DateUtils.formatYYYYMMDDHHNNSS(new Date())}.json`);
    }

    import(data) {
        for (const entity of this.#entities){
            const key = entity.getName();
            if (data[key]) {
                // TODO Na verdade, aqui seria melhor validar cada um (se existe, update; se não existe, insert)
                entity.save(data[key]);
            }
        }
    }

    dropDatabase() {
        for (const entity of this.#entities){
            entity.save(null);
        }
    }
}
