import { Events, Guild } from "discord.js";
import { BotEvent } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
import { KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const guildDeleteEvent: BotEvent = {
    name: Events.GuildDelete,
    execute: async (guild: Guild) => {
        logger.info(__t("log/bot/guildLeaving", { guild: `${guild.name}(${guild.id})` }));
        await discordBotKeyvs.keyvs.deletekeyv(guild.id)
            .catch((error: Error) => {
                const errorDesc = error.stack || error.message || "unknown error";
                logger.error(__t("log/bot/keyvs/delete/faild", { guild: guild.id, error: errorDesc }));
                if (error instanceof KeyvsError) {
                    discordBotKeyvs.keyvs.setkeyv(guild.id);
                    logger.info(__t("log/keyvs/reset", { namespace: guild.id }));
                }
            })
        logger.info(__t("log/keyvs/delete", { namespace: guild.id }));
    }
};

export default guildDeleteEvent;