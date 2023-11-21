import { ActivityType, Client, Events } from "discord.js";
import { BotEvent } from "../services/discord";
import keyvs from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const readyEvent: BotEvent = {
    name: Events.ClientReady,
    once: true,
    execute: async (client: Client) => {
        logger.info(__t("bot/ready", { name: client.user?.tag! }));
        client.user?.setActivity({ name: __t("grouwing"), type: ActivityType.Playing });
        client.guilds.cache.forEach(guild => {
            keyvs.setkeyv(guild.id);
            logger.info(__t("keyvs/set", { namespace: guild.id }));
        });
    }
};

export default readyEvent;