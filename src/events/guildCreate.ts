import { Events, Guild } from "discord.js";
import { BotEvent } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBot";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const guildCreateEvent: BotEvent = {
    name: Events.GuildCreate,
    execute: async (guild: Guild) => {
        logger.info(__t("log/bot/guildEntry", { guild: `${guild.name}(${guild.id})` }));
        discordBotKeyvs.setkeyv(guild.id);
        logger.info(__t("log/keyvs/set", { namespace: guild.id }));
    }
};

export default guildCreateEvent;