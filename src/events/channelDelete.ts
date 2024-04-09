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
                stopVcAutoCreation(channel as VoiceChannel)
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

const stopVcAutoCreation = async (channel: VoiceChannel) => {
    const isVacEnabled = await discordBotKeyvs.getIsVacEnabled(channel.guildId!);
    if (isVacEnabled) {
        const triggerChannelId = await discordBotKeyvs.getVacTriggerVcId(channel.guildId!);
        if (channel.id === triggerChannelId) {
            await discordBotKeyvs.setIsVacEnabled(channel.guildId!, false);
            await discordBotKeyvs.deleteVacTriggerVcId(channel.guildId!);
            logger.info(__t("log/bot/vcAutoCreation/stop", { guild: channel.guildId }));
        }
    }
};

export default channelDeleteEvent;
