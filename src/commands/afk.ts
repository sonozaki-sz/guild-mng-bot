import { ChatInputCommandInteraction, SlashCommandBuilder, VoiceChannel } from "discord.js";
import keyvs, { KeyvKeys, KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { GetReplyEmbed, ReplyEmbedType } from "../services/utility";
import { Command } from "../types";

export const afkCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription(__t("bot/command/afk/description"))
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(__t("bot/command/afk/userOption/description"))
                .setRequired(true)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser("user")!;
        const member = interaction.guild?.members.cache.find(member => member.id === user.id);
        if (!member) {
            const embed = GetReplyEmbed(__t("bot/command/afk/notFoundUser", { user: user.toString() }), ReplyEmbedType.Warn);
            interaction.reply({ embeds: [embed] });
            return;
        }
        const afkChannel: VoiceChannel = await keyvs.getValue(interaction.guildId!, KeyvKeys.DestAfkVC)
            .catch((error) => {
                throw new KeyvsError(error);
            });
        if (!afkChannel) {
            const embed = GetReplyEmbed(__t("bot/command/notSetDestAfk"), ReplyEmbedType.Warn);
            interaction.reply({ embeds: [embed] });
            return;
        }
        const channel = interaction.guild?.channels.cache.find(channel => channel.id === afkChannel.id);
        if (!channel) {
            const embed = GetReplyEmbed(__t("bot/command/notFoundDestAfk"), ReplyEmbedType.Warn);
            interaction.reply({ embeds: [embed] });
            return;
        }
        if (channel.id === member.voice.channel?.id) {
            const embed = GetReplyEmbed(__t("bot/command/afk/alreadyAfk", { user: member.toString(), channel: channel.toString() }), ReplyEmbedType.Warn);
            interaction.reply({ embeds: [embed] });
            return;
        }
        member.voice.setChannel(channel.id)
            .then(() => {
                const embed = GetReplyEmbed(__t("bot/command/afk/success", { user: member.toString(), channel: channel.toString() }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
            }).catch((error) => {
                const embed = GetReplyEmbed(__t("bot/command/afk/faild", { user: member.toString(), error: error.toString() }), ReplyEmbedType.Warn);
                interaction.reply({ embeds: [embed] });
            });
    }
}

export default afkCommand;
