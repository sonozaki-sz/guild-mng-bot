import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";

export const sendTextCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("send-text")
        .setDescription(__t("bot/command/send-text/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription(__t("bot/command/send-text/textOption/description"))
                .setRequired(true)
        ).addChannelOption(option =>
            option
                .setName("channel")
                .setDescription(__t("bot/command/send-text/channelOption/description"))
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const text = interaction.options.getString("text")!;
        const channel: TextChannel | null = interaction.options.getChannel("channel")
        const sentText = (await interaction.channel?.messages.fetch(text))?.content || text;
        if (channel?.isTextBased) {
            channel.send(sentText);
        } else {
            interaction.channel?.send(sentText);
        }
        const sendChannel = channel || interaction.channel!;
        const embed = getReplyEmbed(__t("bot/command/send-text/success", { channel: sendChannel?.toString() }), ReplyEmbedType.Success);
        interaction.reply({ embeds: [embed] });
    }
};

export default sendTextCommand;