import { Events } from "discord.js";
import keyvs from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";
import { BotEvent } from "../types/discord";

export const guildDeleteEvent: BotEvent = {
    name: Events.GuildDelete,
    execute: (guild) => {
        keyvs.deletekeyv(guild.id);
        logger.info(__t("keyvs/delete", { namespace: guild.id }));
    }
}

export default guildDeleteEvent;