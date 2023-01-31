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

        async validate(operation, data) {
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
                            throw [ new Error(`I don't know how to handle the operation "${operation}"`) ];
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

    #getEntityByName(entityName) {
        return this.getConfig().entities.find((entity) => entity.getConfig().name == entityName);
    }

    #intransaction = false;

    async beginTransaction() {
        if (this.#intransaction) {
            throw new Error('The backend is already in a transaction.');
        }
        this.#intransaction = true;
    }

    async commitTransaction() {
        if (!this.#intransaction) {
            throw new Error('The backend is not in a transaction.');
        }
        this.#intransaction = false;
    }

    async rollbackTransaction() {
        if (!this.#intransaction) {
            throw new Error('The backend is not in a transaction.');
        }
        this.#intransaction = false;
    }

    async select(entityName) {
        if (!this.#intransaction) {
            throw new Error('The backend is not in a transaction.');
        }
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw new Error(`Entity "${entityName}" not found.`);
        }
        return entity;
    }

    async getById(entityName, id) {
        const select = await this.select(entityName);
        return select.find((item) => item.id == id);
    }

    // TODO Falta: exportar, importar, limpar.
    async insert(entityName, properties) {
        // TODO Os dois métodos abaixo são EXATAMENTE iguais; unificar.
        if (!this.#intransaction) {
            throw new Error('The backend is not in a transaction.');
        }
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw new Error(`Entity "${entityName}" not found.`);
        }
        return entity;
    }

    async update(entityName, properties) {
        if (!this.#intransaction) {
            throw new Error('The backend is not in a transaction.');
        }
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw new Error(`Entity "${entityName}" not found.`);
        }
        return entity;
    }

    async delete(entityName, properties) {
        if (!this.#intransaction) {
            throw new Error('The backend is not in a transaction.');
        }
        const entity = this.#getEntityByName(entityName);
        if (!entity) {
            throw new Error(`Entity "${entityName}" not found.`);
        }
        return entity;
    }
}

// TODO Mover pra cá tudo o que não faz referência a localStorage; fazer BackendLocalStorage extends BackendJson.
// class BackendJson extends Backend {
// }

class BackendLocalStorage extends Backend {
    static BackendLocalEntity = class extends Backend.Entity {
        #backend = null;

        setBackend(backend) {
            this.#backend = backend;
        }
    }

    constructor(config) {
        super(config);
        for (const entity of config.entities) {
            entity.setBackend(this);
        }
    }

    #transactionData = null;

    async select(entityName) {
        const entity = await super.select(entityName);
        const id = entity.getConfig().name;
        if (!this.#transactionData[id]) {
            let json = localStorage[entity.getConfig().name];
            if (json === undefined) {
                json = '[]';
            }
            this.#transactionData[id] = JSON.parse(json);
        }
        return this.#transactionData[id];
    }

    async insert(entityName, properties) {
        const entity = await super.insert(entityName, properties);
        const entities = await this.select(entityName);
        const newEntity = await entity.validate('insert', properties);
        entities.push(newEntity);
        return newEntity.id;
    }

    async update(entityName, properties) {
        const entity = await super.update(entityName, properties);
        const entities = await this.select(entityName);
        let filtered = entities.filter((entity) => entity.id == properties.id);
        if (filtered.length == 0) {
            this.rollbackTransaction();
            throw new Error(`Entity "${entityName}" doesn't have an element with id = "${properties.id}".`);
        }
        if (filtered.length > 1) {
            this.rollbackTransaction();
            throw new Error(`Entity "${entityName}" has more than one element with id = "${properties.id}".`);
        }
        const oldEntity = filtered[0];
        const newEntity = await entity.validate('update', properties);
        for (const key of Object.keys(newEntity)) {
            oldEntity[key] = newEntity[key];
        }
        return filtered.length;
    }

    async delete(entityName, properties) {
        const entity = await super.delete(entityName, properties);
        const entities = await this.select(entityName);
        const restantes = entities.filter((entity) => entity.id != properties.id);
        if (entities.length - restantes.length == 0) {
            this.rollbackTransaction();
            throw new Error(`Entity "${entityName}" doesn't have an element with id = "${properties.id}".`);
        }
        if (entities.length - restantes.length > 1) {
            this.rollbackTransaction();
            throw new Error(`Entity "${entityName}" has more than one element with id = "${properties.id}".`);
        }
        this.#transactionData[entityName] = restantes;
        return entities.length - restantes.length;
    }

    async beginTransaction() {
        console.log('beginTransaction()');
        super.beginTransaction();
        this.#transactionData = {};
    }

    async commitTransaction() {
        console.log('commitTransaction()');
        super.commitTransaction();
        for (const entityName of Object.keys(this.#transactionData)) {
            const data = this.#transactionData[entityName];
            if (data.length) {
                localStorage[entityName] = JSON.stringify(data);
            } else {
                localStorage.removeItem(entityName);
            }
        }
        this.#transactionData = null;
    }

    async rollbackTransaction() {
        console.log('rollbackTransaction()');
        super.rollbackTransaction();
        this.#transactionData = null;
    }

    async export() {
        await this.beginTransaction();
        try {
            const result = {};
            for (const entity of this.getConfig().entities){
                result[entity.getConfig().name] = await this.select(entity.getConfig().name);
            }
            return JSON.stringify(result);
        } finally {
            await this.rollbackTransaction();
        }
    }

    async import(data) {
        /* TODO Seria bom que a importação fosse realmente uma importação; hoje ela substitui os dados pelos que vieram.
                Problema: o insert causa erro porque a entidade já vem com id. Poderia desabilitar, mas isso poderia causar inconsistência.
                Parece um problema insolúvel por precisar conhecer os dados que vêm.
                Problema de não fazer: os dados importados podem ser inconsistentes.
        */
        for (const entity of this.getConfig().entities){
            await this.beginTransaction();
            try {
                const key = entity.getConfig().name;
                if (data[key]) {
                    this.#transactionData[entity.getConfig().name] = data[key];
                }
            } finally {
                await this.commitTransaction();
            }
        }
    }

    async truncate() {
        await this.beginTransaction();
        try {
            for (const entity of this.getConfig().entities){
                this.#transactionData[entity.getConfig().name] = [];
            }
        } finally {
            await this.commitTransaction();
        }
    }
}

// TODO Criar Backend json: https://jsonkeeper.com/b/O3AP e https://api.jsonserve.com/FCiKcB
