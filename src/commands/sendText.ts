import { ActionRowBuilder, ChannelType, ChatInputCommandInteraction, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { Command, Modal, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";

export const sendTextCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("send-text")
        .setDescription(__t("bot/command/send-text/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription(__t("bot/command/send-text/channelOption/Description"))
                .addChannelTypes(ChannelType.GuildText)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const channel = interaction.options.getChannel("channel") as TextChannel | undefined;
        const sentChannel = channel || interaction.channel!;
        sendTextModal.data = sentChannel;
        interaction.client.modals.set(sendTextModal.modal.data.custom_id!, sendTextModal);
        await interaction.showModal(sendTextModal.modal);
    }
};

const sendTextModal: Modal = {
    modal: new ModalBuilder()
        .setCustomId("sendText")
        .setTitle(__t("bot/command/send-text/modal/title"))
        .setComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .setComponents(new TextInputBuilder()
                .setCustomId("textInput")
                .setLabel(__t("bot/command/send-text/modal/textInput/placeholder"))
                .setStyle(TextInputStyle.Paragraph)
            )
        ),
    execute: async (interaction: ModalSubmitInteraction) => {
        await interaction.deferReply();
        const text = interaction.fields.getTextInputValue("textInput");
        const channel = sendTextModal.data as TextChannel;
        const sentChannel = await interaction.guild!.channels.fetch(channel.id) as TextChannel | undefined;
        if (!sentChannel) {
            await interaction.editReply(__t("bot/command/send-text/notFoundChannel"));
            return;
        }
        if (interaction.channel!.id === sentChannel.id) {
            await interaction.editReply(text);
        } else {
            await sentChannel?.send(text);
            const embed = getReplyEmbed(__t("bot/command/send-text/success", { channel: sentChannel.toString() }), ReplyEmbedType.Success);
            await interaction.editReply({ embeds: [embed] });
        }
    }
}

export default sendTextCommand;