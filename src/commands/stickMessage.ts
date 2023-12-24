import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Collection, Colors, ComponentType, DiscordAPIError, EmbedBuilder, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { getStickedMessages, setStickedMessages } from "../services/botUtilty";


import { Command, Modal, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";

export const stickMessageCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("stick-msg")
        .setDescription(__t("bot/command/stick-msg/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription(__t("bot/command/stick-msg/start/description"))
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(__t("bot/command/stick-msg/start/channelOption/description"))
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription(__t("bot/command/stick-msg/delete/description"))
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(__t("bot/command/stick-msg/delete/channelOption/description"))
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(__t("bot/command/stick-msg/status/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "start": {
                executeStart(interaction);
                break;
            }
            case "delete": {
                executeDelete(interaction);
                break;
            }
            case "status": {
                executeStatus(interaction);
                break;
            }
        }
    }
}

const stickTextModal: Modal = {
    modal: new ModalBuilder()
        .setCustomId("stickText")
        .setTitle(__t("bot/command/stick-msg/modal/title"))
        .setComponents(new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .setComponents(new TextInputBuilder()
                .setCustomId("inputStickText")
                .setLabel(__t("bot/command/stick-msg/modal/inputStickText/label"))
                .setStyle(TextInputStyle.Paragraph)
            )
        ),
    execute: async (interaction: ModalSubmitInteraction) => {
        await interaction.deferReply();
        const text = interaction.fields.getTextInputValue("inputStickText");
        const channel = stickTextModal.data as TextChannel;
        const stickChannel = await interaction.guild!.channels.fetch(channel.id)
            .catch((reason: DiscordAPIError) => {
                if (reason.code === 10003) {
                    return undefined;
                }
                throw reason;
            }) as TextChannel | undefined;
        if (!stickChannel) {
            const embed = getReplyEmbed(__t("bot/command/stick-msg/start/notFoundChannel"), ReplyEmbedType.Warn);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        const stickedMessages = await getStickedMessages(interaction.guild!.id);
        if (stickedMessages.has(stickChannel.id)) {
            const embed = getReplyEmbed(__t("bot/command/stick-msg/start/alreadySticked"), ReplyEmbedType.Warn);
            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setCustomId("delete")
                        .setLabel(__t("delete"))
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("cancel")
                        .setLabel(__t("cancel"))
                        .setStyle(ButtonStyle.Primary)
                ])
            const reply = await interaction.editReply({ embeds: [embed], components: [actionRow] });
            const collector = reply.createMessageComponentCollector<ComponentType.Button>({ time: 60_000 });
            collector?.on("collect", async (buttonInteraction) => {
                switch (buttonInteraction.customId) {
                    case "delete": {
                        deleteStickMessage(stickChannel, stickedMessages);
                        await stickMessage(stickChannel, text, stickedMessages);
                        const embed = getReplyEmbed(__t("bot/command/stick-msg/start/success/restick", { channel: stickChannel.toString() }), ReplyEmbedType.Success);
                        await interaction.followUp({ embeds: [embed] });
                        break;
                    }
                    case "cancel": {
                        const embed = getReplyEmbed(__t("bot/command/stick-msg/start/cancel"), ReplyEmbedType.Success);
                        await interaction.followUp({ embeds: [embed] });
                        break;
                    }
                }
                collector.stop("delete");
            });
            collector.once("end", async (_, reason) => {
                if (reason === "time") {
                    const embed = getReplyEmbed(__t("operationTimeedOut"), ReplyEmbedType.Warn);
                    await interaction.followUp({ embeds: [embed] });
                }
                await interaction.editReply({ components: [] });
            });
            return;
        }
        await stickMessage(stickChannel, text, stickedMessages);
        const embed = getReplyEmbed(__t("bot/command/stick-msg/start/success", { channel: stickChannel.toString() }), ReplyEmbedType.Success);
        await interaction.followUp({ embeds: [embed] });
    }
}

const stickMessage = async (stickChannel: TextChannel, message: string, sticedMessages: Collection<string, string>) => {
    const sentMessage = await stickChannel.send(message);
    sticedMessages.set(stickChannel.id, sentMessage.id);
    await setStickedMessages(stickChannel.guildId, sticedMessages);
};

const executeStart = async (interaction: ChatInputCommandInteraction) => {
    const channel = interaction.options.getChannel("channel") || interaction.channel!;
    if (channel.type === ChannelType.GuildText) {
        stickTextModal.data = channel;
        interaction.client.modals.set(stickTextModal.modal.data.custom_id!, stickTextModal);
        await interaction.showModal(stickTextModal.modal);
    }
};

const deleteStickMessage = async (stickChannel: TextChannel, stickedMessages: Collection<string, string>) => {
    const stickedMessageId = stickedMessages.get(stickChannel.id);
    const stickedMessage = await stickChannel.messages.fetch(stickedMessageId!)
        .catch((error: DiscordAPIError) => {
            if (error.code === 10008) return undefined;
            throw error;
        });
    if (stickedMessage) {
        await stickedMessage.delete()
            .catch((error: DiscordAPIError) => {
                if (error.code === 10008) return;
                throw error;
            });
    }
    stickedMessages.delete(stickChannel.id);
    await setStickedMessages(stickChannel.guildId, stickedMessages);
};

const executeDelete = async (interaction: ChatInputCommandInteraction) => {
    const channel = interaction.options.getChannel("channel") as TextChannel || interaction.channel! as TextChannel;
    const stickedMessages = await getStickedMessages(interaction.guildId!);
    deleteStickMessage(channel, stickedMessages);
    const embed = getReplyEmbed(__t("bot/command/stick-msg/delete/success", { channel: channel.toString() }), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    const stickedMessageChannels = await (async () => {
        const stickedMessages = await getStickedMessages(interaction.guildId!);
        if (!stickedMessages.size) return __t("notting");
        const stickedMessageChannelIds = stickedMessages.keys();
        return await Promise.all(Array.from(stickedMessageChannelIds).map(async channelId => {
            return `<#${channelId}>`;
        })).then(channels => channels.toString());
    })();
    const statusEmbed = new EmbedBuilder()
        .setTitle(__t("bot/stickMessage"))
        .setColor(Colors.Blue)
        .setFields([
            { name: __t("stickedMessageChannel"), value: stickedMessageChannels },
        ])
    return statusEmbed;
};

const executeStatus = async (interaction: ChatInputCommandInteraction) => {
    const replyEmbed = getReplyEmbed(__t("bot/command/getStatus"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [replyEmbed] });
    const statusEmbed = await getStatusEmbed(interaction);
    await interaction.followUp({ embeds: [statusEmbed] });
};

export default stickMessageCommand;