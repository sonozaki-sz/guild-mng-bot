import { ChannelType, DMChannel, Events, GuildChannel, VoiceChannel } from "discord.js";
import { BotEvent } from "../services/discord";
import keyvs, { KeyvKeys, KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const channelDeleteEvent: BotEvent = {
    name: Events.ChannelDelete,
    execute: async (channel: DMChannel | GuildChannel) => {
        switch (channel.type) {
            case ChannelType.GuildVoice: {
                // VCの自動作成機能実行中にトリガーチャンネルが消されたとき、自動作成機能を停止する。
                stopVCAutoCreation(channel as VoiceChannel)
                    .catch((error: Error) => {
                        const errorDesc = error.stack || error.message || "unknown error";
                        const logMsg = __t("log/bot/vcAutoCreation/error", { guild: channel.guildId, error: errorDesc });
                        logger.error(logMsg);
                        if (error instanceof KeyvsError) {
                            keyvs.setkeyv(channel.guildId);
                            logger.info(__t("log/keyvs/reset", { namespace: channel.guildId }));
                        }
                    });
                break;
            }
        }
    }
};

// VCの自動作成機能実行中にトリガーチャンネルが消されたとき、自動作成機能を停止する。
const stopVCAutoCreation = async (channel: VoiceChannel) => {
    const isVacEnabled = await keyvs.getValue(channel.guildId!, KeyvKeys.IsVacEnabled) as boolean | undefined;
    if (isVacEnabled) {
        const triggerChannel = await keyvs.getValue(channel.guildId!, KeyvKeys.VacTriggerVC) as VoiceChannel | undefined;
        if (channel.id === triggerChannel?.id) {
            await keyvs.setValue(channel.guildId!, KeyvKeys.IsVacEnabled, false);
            await keyvs.deleteValue(channel.guildId!, KeyvKeys.VacTriggerVC);
            logger.info(__t("log/bot/vcAutoCreation/stop", { guild: channel.guildId }));
        }
    }
};

export default channelDeleteEvent;
