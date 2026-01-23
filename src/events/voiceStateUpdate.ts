import { ChannelType, Events, VoiceState } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
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
            });
    }
};

const executeCreateVc = async (oldState: VoiceState, newState: VoiceState) => {
    // トリガーチャンネルが設定されていないときは何もしない
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(newState.guild.id);
    if (!vacTriggerVcIds) return;
    // メンバーがVCに入室していないときは何もしない
    if (!newState.channelId) return;
    // メンバーが入室したVCがトリガーVCでないときは何もしない
    if (!vacTriggerVcIds.includes(newState.channelId)) return;

    // 新しいVCを作成してメンバーを移動させる
    const newChannel = await newState.guild.channels.create({
        parent: newState.channel?.parent,
        name: `${newState.member?.displayName}'s Room`,
        type: ChannelType.GuildVoice,
        userLimit: 99,
    })
    const vacChannelIds = await discordBotKeyvs.getVacChannelIds(newState.guild.id) || <string[]>[];
    vacChannelIds.push(newChannel.id);
    await discordBotKeyvs.setVacChannelIds(newState.guild.id, vacChannelIds);
    await newState.member?.voice.setChannel(newChannel);
    logger.info(__t("log/bot/vcAutoCreation/createChannel", { guild: newState.guild.id, channel: newChannel.id }));
};

const executeDeleteVc = async (oldState: VoiceState, newState: VoiceState) => {
    // 自動作成したVCがないときは何もしない
    const vacChannelIds = await discordBotKeyvs.getVacChannelIds(newState.guild.id);
    if (!vacChannelIds) return;
    // 退出したVCが自動作成されたVCでないときは何もしない
    if (!vacChannelIds.some(channelId => channelId === oldState.channelId)) return;
    // 退出したVCにまだメンバーがいるときは何もしない
    if (oldState.channel?.members.size !== 0) return;
    // VCを削除し、Keyvからも削除する
    oldState.channel?.delete();
    vacChannelIds.splice(vacChannelIds.indexOf(oldState.channelId!), 1);
    discordBotKeyvs.setVacChannelIds(newState.guild.id, vacChannelIds);
    logger.info(__t("log/bot/vcAutoCreation/deleteChannel", { guild: oldState.guild.id, channel: oldState.channelId! }));
};

const executeVcAutoCreation = async (oldState: VoiceState, newState: VoiceState) => {
    // トリガーVCに入室時に新しいVCを作成する
    await executeCreateVc(oldState, newState);

    // 自動作成したVCを全員が退出時に削除する
    await executeDeleteVc(oldState, newState);
};

export default voiceStateUpdateEvent;
