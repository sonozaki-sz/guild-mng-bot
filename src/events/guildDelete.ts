import { Events, Guild } from "discord.js";
import { BotEvent, botKeyvs } from "../services/discord";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const guildDeleteEvent: BotEvent = {
    name: Events.GuildDelete,
    execute: async (guild: Guild) => {
        logger.info(__t("log/bot/guildLeaving", { guild: `${guild.name}(${guild.id})` }));
        botKeyvs.deletekeyv(guild.id);
        logger.info(__t("log/keyvs/delete", { namespace: guild.id }));
    }
};

export default guildDeleteEvent;