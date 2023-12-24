import { ChannelType, DMChannel, Events, GuildChannel, VoiceChannel } from "discord.js";
import { BotEvent, BotKeyvKeys, botKeyvs } from "../services/discord";
import { KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const channelDeleteEvent: BotEvent = {
    name: Events.ChannelDelete,
    execute: async (channel: DMChannel | GuildChannel) => {
        switch (channel.type) {
            case ChannelType.GuildVoice: {
                // Vcの自動作成機能実行中にトリガーチャンネルが消されたとき、自動作成機能を停止する。
                stopVcAutoCreation(channel as VoiceChannel)
                    .catch((error: Error) => {
                        const errorDesc = error.stack || error.message || "unknown error";
                        const logMsg = __t("log/bot/vcAutoCreation/error", { guild: channel.guildId, error: errorDesc });
                        logger.error(logMsg);
                        if (error instanceof KeyvsError) {
                            botKeyvs.setkeyv(channel.guildId);
                            logger.info(__t("log/keyvs/reset", { namespace: channel.guildId }));
                        }
                    });
                break;
            }
        }
    }
};

// Vcの自動作成機能実行中にトリガーチャンネルが消されたとき、自動作成機能を停止する。
const stopVcAutoCreation = async (channel: VoiceChannel) => {
    const isVacEnabled = await botKeyvs.getValue(channel.guildId!, BotKeyvKeys.IsVacEnabled) as boolean | undefined;
    if (isVacEnabled) {
        const triggerChannel = await botKeyvs.getValue(channel.guildId!, BotKeyvKeys.VacTriggerVc) as VoiceChannel | undefined;
        if (channel.id === triggerChannel?.id) {
            await botKeyvs.setValue(channel.guildId!, BotKeyvKeys.IsVacEnabled, false);
            await botKeyvs.deleteValue(channel.guildId!, BotKeyvKeys.VacTriggerVc);
            logger.info(__t("log/bot/vcAutoCreation/stop", { guild: channel.guildId }));
        }
    }
};

export default channelDeleteEvent;
