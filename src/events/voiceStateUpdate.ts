import { ChannelType, Events, VoiceState } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
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
                    discordBotKeyvs.keyvs.setkeyv(newState.guild.id);
                    logger.info(__t("log/keyvs/reset", { namespace: newState.guild.id }));
                    const embed = getReplyEmbed(__t("bot/config/reset", { namespace: newState.guild.id }), ReplyEmbedType.Info);
                    await newState.channel?.send({ embeds: [embed] });
                }
            });
    }
};

const executeCreateVc = async (oldState: VoiceState, newState: VoiceState) => {
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(newState.guild.id);
    const enteredTriggerVcId = vacTriggerVcIds?.find(triggerVcId => triggerVcId === newState.channelId);
    if (!enteredTriggerVcId) return;
    if (oldState.member && oldState.member.voice.channelId === enteredTriggerVcId) {
        const newChannel = await newState.guild.channels.create({
            parent: newState.channel?.parent,
            name: `${oldState.member.displayName}'s Room`,
            type: ChannelType.GuildVoice,
            userLimit: 99,
        })
        const vacChannelIds = await discordBotKeyvs.getVacChannelIds(newState.guild.id) || <string[]>[];
        vacChannelIds.push(newChannel.id);
        await discordBotKeyvs.setVacChannelIds(newState.guild.id, vacChannelIds);
        await oldState.member?.voice.setChannel(newChannel);
        logger.info(__t("log/bot/vcAutoCreation/createChannel", { guild: newState.guild.id, channel: newChannel.id }));
    }
};

const executeDeleteVc = async (oldState: VoiceState, newState: VoiceState) => {
    const vacChannelIds = await discordBotKeyvs.getVacChannelIds(newState.guild.id);
    if (!vacChannelIds) return;
    if (!vacChannelIds.some(channelId => channelId === oldState.channelId)) return;
    if (oldState.channel?.members.size !== 0) return;
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
