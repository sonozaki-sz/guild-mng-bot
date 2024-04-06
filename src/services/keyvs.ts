import { Collection } from 'discord.js';
import Keyv from 'keyv';

export class Keyvs {
    private keyvs: Collection<string, Keyv> = new Collection();

    setkeyv(namespace: string) {
        return this.keyvs.set(namespace, new Keyv("sqlite://storage/db.sqlite", { namespace: namespace }));
    }

    async deletekeyv(namespace: string) {
        await this.keyvs.get(namespace)?.clear()
            .catch((error: Error) => {
                throw new KeyvsError(error.message);
            });
        return this.keyvs.delete(namespace);
    }

    async getValue(namespace: string, key: string) {
        return await this.keyvs.get(namespace)?.get(key)
            .catch((error: Error) => {
                throw new KeyvsError(error.message)
            });
    }

    async setValue(namespace: string, key: string, value: any, ttl?: number) {
        return await this.keyvs.get(namespace)?.set(key, value, ttl)
            .catch((error: Error) => {
                throw new KeyvsError(error.message)
            });
    }

    async getCollection(namespace: string, key: string) {
        const value = await this.getValue(namespace, key) as string | undefined;
        if (!value) return new Collection<string, any>();
        return new Collection<string, any>(Object.entries(JSON.parse(value)));
    }

    async setCollection(namespace: string, key: string, collection: Collection<string, any>, ttl?: number) {
        return await this.setValue(namespace, key, JSON.stringify(Object.fromEntries(collection)), ttl);
    }

    async deleteValue(namespace: string, key: string) {
        return await this.keyvs.get(namespace)?.delete(key)
            .catch((error: Error) => {
                throw new KeyvsError(error.message)
            });
    }

    async clearKeyvs() {
        this.keyvs.forEach(async keyv => await keyv.clear()
            .catch((error: Error) => {
                throw new KeyvsError(error.message)
            }));
        return this.keyvs.clear();
    }
}

export class KeyvsError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
