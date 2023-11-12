import Keyv from 'keyv';

export class Keyvs {
    private keyvs: Map<string, Keyv> = new Map();

    setkeyv(namespace: string) {
        return this.keyvs.set(namespace, new Keyv("sqlite://storage/db.sqlite", { namespace: namespace }));
    }

    async deletekeyv(namespace: string) {
        await this.keyvs.get(namespace)?.clear();
        return this.keyvs.delete(namespace);
    }

    async getValue(namespace: string, key: string) {
        return this.keyvs.get(namespace)?.get(key);
    }

    async setValue(namespace: string, key: string, value: any, ttl?: number) {
        return this.keyvs.get(namespace)?.set(key, value, ttl);
    }

    async deleteValue(namespace: string, key: string) {
        return this.keyvs.get(namespace)?.delete(key);
    }

    async clearKeyvs() {
        this.keyvs.forEach(async keyv => await keyv.clear());
        return this.keyvs.clear();
    }
}

export enum KeyvKeys {
    DestAfkVC = "destAfkVC",
    VacTriggerVC = "vcAutoCreation/triggerVC",
    IsValidVac = "vcAutoCreation/isValidVac",
    VacChannels = "vcAutoCreation/channels",
}

// interface KysvsError extends Error { };
// interface KeyvsErrorConstructor extends ErrorConstructor {
//     new(message?: string, options?: ErrorOptions): KysvsError;
//     (message?: string, options?: ErrorOptions): KysvsError;
// }
// export declare const KeyvsError: KeyvsErrorConstructor;

export class KeyvsError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export const keyvs = new Keyvs();

export default keyvs;
