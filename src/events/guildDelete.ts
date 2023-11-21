import { Events } from "discord.js";
import { BotEvent } from "../services/discord";
import keyvs from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const guildDeleteEvent: BotEvent = {
    name: Events.GuildDelete,
    execute: (guild) => {
        keyvs.deletekeyv(guild.id);
        logger.info(__t("keyvs/delete", { namespace: guild.id }));
    }
}

export default guildDeleteEvent;