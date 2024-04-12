import { ChannelType, DMChannel, Events, GuildChannel, VoiceChannel } from "discord.js";
import { BotEvent } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
import { KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const channelDeleteEvent: BotEvent = {
    name: Events.ChannelDelete,
    execute: async (channel: DMChannel | GuildChannel) => {
        switch (channel.type) {
            case ChannelType.GuildVoice: {
                await deleteVacTriggerVc(channel as VoiceChannel)
                    .catch((error: Error) => {
                        const errorDesc = error.stack || error.message || "unknown error";
                        const logMsg = __t("log/bot/vcAutoCreation/error", { guild: channel.guildId, error: errorDesc });
                        logger.error(logMsg);
                        if (error instanceof KeyvsError) {
                            discordBotKeyvs.keyvs.setkeyv(channel.guildId);
                            logger.info(__t("log/keyvs/reset", { namespace: channel.guildId }));
                        }
                    });
                break;
            }
        }
    }
};

const deleteVacTriggerVc = async (channel: VoiceChannel) => {
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(channel.guildId!);
    if (vacTriggerVcIds?.some(triggerVcId => triggerVcId === channel.id)) {
        vacTriggerVcIds.splice(vacTriggerVcIds.indexOf(channel.id), 1);
        await discordBotKeyvs.setVacTriggerVcIds(channel.guildId!, vacTriggerVcIds);
        logger.info(__t("log/bot/vcAutoCreation/deleteTriggerChannel", { guild: channel.guildId!, channel: channel.id }));
    }
};

export default channelDeleteEvent;
