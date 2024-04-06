import { ChannelType, Events, VoiceState } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { DiscordBotKeyvKeys, discordBotKeyvs } from "../services/discordBot";
import { KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const voiceStateUpdateEvent: BotEvent = {
    name: Events.VoiceStateUpdate,
    execute: async (oldState: VoiceState, newState: VoiceState) => {
        executeVcAutoCreation(oldState, newState)
            .catch(async (error: Error) => {
                const errorDescUser = error.message || "unknown error";
                const userMsg = __t("bot/vcAutoCreation/error", { error: errorDescUser });
                const embed = getReplyEmbed(userMsg, ReplyEmbedType.Error);
                await newState.channel?.send({ embeds: [embed] });
                const errorDescLog = error.stack || error.message || "unknown error";
                const logMsg = __t("log/bot/vcAutoCreation/error", { guild: newState.guild.id, error: errorDescLog });
                logger.error(logMsg);
                if (error instanceof KeyvsError) {
                    discordBotKeyvs.setkeyv(newState.guild.id);
                    logger.info(__t("log/keyvs/reset", { namespace: newState.guild.id }));
                    const embed = getReplyEmbed(__t("bot/config/reset", { namespace: newState.guild.id }), ReplyEmbedType.Info);
                    await newState.channel?.send({ embeds: [embed] });
                }
            });
    }
};

// Cの自動作成機能を実行する
const executeVcAutoCreation = async (oldState: VoiceState, newState: VoiceState) => {
    const isVacEnabled = await discordBotKeyvs.getValue(newState.guild.id, DiscordBotKeyvKeys.IsVacEnabled) as boolean | undefined;
    if (!isVacEnabled) return;
    // トリガーVCに入室時に新しいVCを作成する
    const triggerVcId = await discordBotKeyvs.getValue(newState.guild.id, DiscordBotKeyvKeys.VacTriggerVcId) as string | undefined;
    if (!triggerVcId) {
        const embed = getReplyEmbed(__t("bot/vcAutoCreation/notSetTriggerVc"), ReplyEmbedType.Warn);
        await newState.channel?.send({ embeds: [embed] });
        return;
    }
    if (oldState.member && oldState.member.voice.channelId === triggerVcId) {
        const newChannel = await newState.guild.channels.create({
            name: `${oldState.member.displayName}'s Room`,
            type: ChannelType.GuildVoice,
            userLimit: 99,
        })
        const vacChannelIds = await discordBotKeyvs.getValue(newState.guild.id, DiscordBotKeyvKeys.VacChannelIds) as string[] || <string[]>[];
        vacChannelIds.push(newChannel.id);
        await discordBotKeyvs.setValue(newState.guild.id, DiscordBotKeyvKeys.VacChannelIds, vacChannelIds);
        await oldState.member?.voice.setChannel(newChannel);
        logger.info(__t("log/bot/vcAutoCreation/channelCreate", { guild: newState.guild.id, channel: newChannel.id }));
    }

    // 自動作成したVCを全員が退出時に削除する
    const vacChannelIds = await discordBotKeyvs.getValue(newState.guild.id, DiscordBotKeyvKeys.VacChannelIds) as string[] | undefined;
    if (!vacChannelIds) return;
    if (!vacChannelIds.some(channelId => channelId === oldState.channelId)) return;
    if (oldState.channel?.members.size !== 0) return;
    oldState.channel?.delete();
    discordBotKeyvs.setValue(newState.guild.id, DiscordBotKeyvKeys.VacChannelIds, vacChannelIds.filter(channelId => channelId !== oldState.channelId));
    logger.info(__t("log/bot/vcAutoCreation/channelDelete", { guild: oldState.guild.id, channel: oldState.channelId! }));
};

export default voiceStateUpdateEvent;
