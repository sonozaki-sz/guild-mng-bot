import { ChannelType, Events, VoiceChannel, VoiceState } from "discord.js";
import keyvs, { KeyvKeys, KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";
import { GetReplyEmbed, ReplyEmbedType } from "../services/utility";
import { BotEvent } from "../types";

export const voiceStateUpdateEvent: BotEvent = {
    name: Events.VoiceStateUpdate,
    execute: async (oldState: VoiceState, newState: VoiceState) => {
        executeVCAutoCreation(oldState, newState)
            .catch((error: Error) => {
                const errorDescUser = error.message || "unknown error";
                const userMsg = __t("bot/vcAutoCreation/error/userMessage", { error: errorDescUser });
                const embed = GetReplyEmbed(userMsg, ReplyEmbedType.Error);
                newState.channel?.send({ embeds: [embed] });
                const errorDescLog = error.stack || error.message || "unknown error";
                const logMsg = __t("bot/vcAutoCreation/error/logMessage", { guild: newState.guild.id, error: errorDescLog });
                logger.error(logMsg);
                if (error instanceof KeyvsError) {
                    keyvs.setkeyv(newState.guild.id);
                    logger.info(__t("keyvs/reset", { namespace: newState.guild.id }));
                    const embed = GetReplyEmbed(__t("bot/config/reset", { namespace: newState.guild.id }), ReplyEmbedType.Info);
                    newState.channel?.send({ embeds: [embed] });
                }
            });
    }
}

// VCの自動作成機能を実行する
const executeVCAutoCreation = async (oldState: VoiceState, newState: VoiceState) => {
    const isValidVac: boolean = await keyvs.getValue(newState.guild.id, KeyvKeys.IsValidVac);
    if (!isValidVac) return;
    // トリガーVCに入室時にVCを作成する
    const triggerVC: VoiceChannel = await keyvs.getValue(newState.guild.id, KeyvKeys.VacTriggerVC);
    if (oldState.member?.voice.channelId === triggerVC.id) {
        const newChannel = await newState.guild.channels.create({
            name: `${oldState.member.displayName}'s room`,
            type: ChannelType.GuildVoice,
            parent: newState.channel?.parent,
            userLimit: 99,
        })
        const createChannels = await keyvs.getValue(newState.guild.id, KeyvKeys.VacChannels);
        createChannels.push(newChannel);
        await keyvs.setValue(newState.guild.id, KeyvKeys.VacChannels, createChannels);
        await oldState.member?.voice.setChannel(newChannel);
        logger.info(__t("bot/vcAutoCreation/channelCreate", { guild: newState.guild.id, channel: newChannel.id }));
    }

    // 自動作成したVCを全員が退出時に削除する
    const createChannels: VoiceChannel[] = await keyvs.getValue(newState.guild.id, KeyvKeys.VacChannels);
    if (!createChannels) return;
    if (!createChannels.some(channel => channel.id === oldState.channelId)) return;
    if (oldState.channel?.members.size !== 0) return;
    oldState.channel?.delete();
    keyvs.setValue(newState.guild.id, KeyvKeys.VacChannels, createChannels.filter(channel => channel.id !== oldState.channelId));
    logger.info(__t("bot/vcAutoCreation/channelDelete", { guild: oldState.guild.id, channel: oldState.channelId! }));
}

export default voiceStateUpdateEvent;
