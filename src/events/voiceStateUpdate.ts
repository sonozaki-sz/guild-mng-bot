import { ChannelType, Events, VoiceChannel, VoiceState } from "discord.js";
import { BotEvent, BotKeyvKeys, ReplyEmbedType, botKeyvs, getReplyEmbed } from "../services/discord";
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
                    botKeyvs.setkeyv(newState.guild.id);
                    logger.info(__t("log/keyvs/reset", { namespace: newState.guild.id }));
                    const embed = getReplyEmbed(__t("bot/config/reset", { namespace: newState.guild.id }), ReplyEmbedType.Info);
                    await newState.channel?.send({ embeds: [embed] });
                }
            });
    }
};

// Vcの自動作成機能を実行する
const executeVcAutoCreation = async (oldState: VoiceState, newState: VoiceState) => {
    const isVacEnabled = await botKeyvs.getValue(newState.guild.id, BotKeyvKeys.IsVacEnabled) as boolean | undefined;
    if (!isVacEnabled) return;
    // トリガーVcに入室時に新しいVcを作成する
    const triggerVc = await botKeyvs.getValue(newState.guild.id, BotKeyvKeys.VacTriggerVc) as VoiceChannel | undefined;
    if (!triggerVc) {
        const embed = getReplyEmbed(__t("bot/vcAutoCreation/notSetTriggerVc"), ReplyEmbedType.Warn);
        await newState.channel?.send({ embeds: [embed] });
        return;
    }
    if (oldState.member && oldState.member.voice.channelId === triggerVc.id) {
        const newChannel = await newState.guild.channels.create({
            name: `${oldState.member.displayName}'s room`,
            type: ChannelType.GuildVoice,
            parent: newState.channel?.parent,
            userLimit: 99,
        })
        const vacChannels = await botKeyvs.getValue(newState.guild.id, BotKeyvKeys.VacChannels) as Array<VoiceChannel> | undefined || new Array<VoiceChannel>();
        vacChannels.push(newChannel);
        await botKeyvs.setValue(newState.guild.id, BotKeyvKeys.VacChannels, vacChannels);
        await oldState.member?.voice.setChannel(newChannel);
        logger.info(__t("log/bot/vcAutoCreation/channelCreate", { guild: newState.guild.id, channel: newChannel.id }));
    }

    // 自動作成したVcを全員が退出時に削除する
    const vacChannels = await botKeyvs.getValue(newState.guild.id, BotKeyvKeys.VacChannels) as Array<VoiceChannel> | undefined;
    if (!vacChannels) return;
    if (!vacChannels.some(channel => channel.id === oldState.channelId)) return;
    if (oldState.channel?.members.size !== 0) return;
    oldState.channel?.delete();
    botKeyvs.setValue(newState.guild.id, BotKeyvKeys.VacChannels, vacChannels.filter(channel => channel.id !== oldState.channelId));
    logger.info(__t("log/bot/vcAutoCreation/channelDelete", { guild: oldState.guild.id, channel: oldState.channelId! }));
};

export default voiceStateUpdateEvent;
