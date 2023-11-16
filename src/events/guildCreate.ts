import { Events } from "discord.js";
import keyvs from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";
import { BotEvent } from "../types/discord";

export const guildCreateEvent: BotEvent = {
    name: Events.GuildCreate,
    execute: (guild) => {
        keyvs.setkeyv(guild.id);
        logger.info(__t("keyvs/set", { namespace: guild.id }));
    }
}

export default guildCreateEvent;