import { ActivityType, Client, Events } from "discord.js";
import { BotEvent } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBot";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const readyEvent: BotEvent = {
    name: Events.ClientReady,
    once: true,
    execute: async (client: Client) => {
        logger.info(__t("log/bot/login", { name: client.user?.tag! }));
        client.user?.setActivity({ name: __t("grouwing"), type: ActivityType.Playing });
        client.guilds.cache.forEach(guild => {
            discordBotKeyvs.setkeyv(guild.id);
            logger.info(__t("log/keyvs/set", { namespace: guild.id }));
        });
    }
};

export default readyEvent;