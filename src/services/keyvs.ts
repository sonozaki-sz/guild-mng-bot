import Keyv from 'keyv';

export class Keyvs {
    private keyvs: Map<string, Keyv> = new Map();

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
        return this.keyvs.get(namespace)?.get(key)
            .catch((error: Error) => {
                throw new KeyvsError(error.message)
            });
    }

    async setValue(namespace: string, key: string, value: any, ttl?: number) {
        return this.keyvs.get(namespace)?.set(key, value, ttl)
            .catch((error: Error) => {
                throw new KeyvsError(error.message)
            });
    }

    async deleteValue(namespace: string, key: string) {
        return this.keyvs.get(namespace)?.delete(key)
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

export enum KeyvKeys {
    DestAfkVC = "destAfkVC",
    VacTriggerVC = "vcAutoCreation/triggerVC",
    IsVacEnabled = "vcAutoCreation/isEnabled",
    VacChannels = "vcAutoCreation/channels",
    ProfChannel = "profChannel",
    IsRmdBumpEnabled = "rmdBump/isEnabled",
    RmdBumpMentionRole = "rmdBump/mentionRole",
}

export class KeyvsError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export const keyvs = new Keyvs();

export default keyvs;
