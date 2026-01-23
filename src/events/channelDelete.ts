import { ChannelType, DMChannel, Events, GuildChannel, VoiceChannel } from "discord.js";
import { BotEvent } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
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
                    });
                break;
            }
        }
    }
};

const deleteVacTriggerVc = async (channel: VoiceChannel) => {
    // VC自動作成のトリガーVCが削除された場合、Keyvから該当VCを削除する
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(channel.guildId!);
    if (vacTriggerVcIds?.some(triggerVcId => triggerVcId === channel.id)) {
        vacTriggerVcIds.splice(vacTriggerVcIds.indexOf(channel.id), 1);
        await discordBotKeyvs.setVacTriggerVcIds(channel.guildId!, vacTriggerVcIds);
        logger.info(__t("log/bot/vcAutoCreation/deleteTriggerChannel", { guild: channel.guildId!, channel: channel.id }));
    }

    // 自動作成されたVCが手動削除された場合もvacChannelIdsから削除
    const vacChannelIds = await discordBotKeyvs.getVacChannelIds(channel.guildId!);
    if (vacChannelIds?.some(channelId => channelId === channel.id)) {
        vacChannelIds.splice(vacChannelIds.indexOf(channel.id), 1);
        await discordBotKeyvs.setVacChannelIds(channel.guildId!, vacChannelIds);
        logger.info(__t("log/bot/vcAutoCreation/deleteAutoCreatedChannel", { guild: channel.guildId!, channel: channel.id }));
    }
};

export default channelDeleteEvent;
