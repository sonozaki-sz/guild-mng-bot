import { ChannelType, DMChannel, Events, GuildChannel, VoiceChannel } from "discord.js";
import { BotEvent } from "../services/discord";
import { DiscordBotKeyvKeys, discordBotKeyvs } from "../services/discordBot";
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
                            discordBotKeyvs.setkeyv(channel.guildId);
                            logger.info(__t("log/keyvs/reset", { namespace: channel.guildId }));
                        }
                    });
                break;
            }
        }
    }
};

const stopVcAutoCreation = async (channel: VoiceChannel) => {
    const isVacEnabled = await discordBotKeyvs.getValue(channel.guildId!, DiscordBotKeyvKeys.IsVacEnabled) as boolean | undefined;
    if (isVacEnabled) {
        const triggerChannelId = await discordBotKeyvs.getValue(channel.guildId!, DiscordBotKeyvKeys.VacTriggerVcId) as string | undefined;
        if (channel.id === triggerChannelId) {
            await discordBotKeyvs.setValue(channel.guildId!, DiscordBotKeyvKeys.IsVacEnabled, false);
            await discordBotKeyvs.deleteValue(channel.guildId!, DiscordBotKeyvKeys.VacTriggerVcId);
            logger.info(__t("log/bot/vcAutoCreation/stop", { guild: channel.guildId }));
        }
    }
};

export default channelDeleteEvent;
