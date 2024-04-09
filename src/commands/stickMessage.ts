import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Collection, Colors, ComponentType, DiscordAPIError, EmbedBuilder, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, RESTJSONErrorCodes, SlashCommandBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { Command, Modal, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
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
                await executeStart(interaction);
                break;
            }
            case "delete": {
                await executeDelete(interaction);
                break;
            }
            case "status": {
                await executeStatus(interaction);
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
                if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                    return undefined;
                }
                throw reason;
            }) as TextChannel | undefined;
        if (!stickChannel) {
            const embed = getReplyEmbed(__t("bot/command/stick-msg/start/notFoundChannel"), ReplyEmbedType.Warn);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        const stickedMessageIds = await discordBotKeyvs.getStickedMessageIds(interaction.guild!.id) || new Collection<string, string>();
        if (stickedMessageIds.has(stickChannel.id)) {
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
                        deleteStickMessage(stickChannel, stickedMessageIds);
                        await stickMessage(stickChannel, text, stickedMessageIds);
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
        await stickMessage(stickChannel, text, stickedMessageIds);
        const embed = getReplyEmbed(__t("bot/command/stick-msg/start/success", { channel: stickChannel.toString() }), ReplyEmbedType.Success);
        await interaction.followUp({ embeds: [embed] });
    }
}

const stickMessage = async (stickChannel: TextChannel, message: string, sticedMessageIds: Collection<string, string>) => {
    const sentMessage = await stickChannel.send(message);
    sticedMessageIds.set(stickChannel.id, sentMessage.id);
    await discordBotKeyvs.setStickedMessageIds(stickChannel.guildId, sticedMessageIds);
};

const executeStart = async (interaction: ChatInputCommandInteraction) => {
    const channel = interaction.options.getChannel("channel") || interaction.channel!;
    if (channel.type === ChannelType.GuildText) {
        stickTextModal.data = channel;
        interaction.client.modals.set(stickTextModal.modal.data.custom_id!, stickTextModal);
        await interaction.showModal(stickTextModal.modal);
    }
};

const deleteStickMessage = async (stickChannel: TextChannel, stickedMessageIds: Collection<string, string>) => {
    const stickedMessageId = stickedMessageIds.get(stickChannel.id);
    if (!stickedMessageId) return;
    const stickedMessage = await stickChannel.messages.fetch(stickedMessageId)
        .catch((error: DiscordAPIError) => {
            if (error.code === RESTJSONErrorCodes.UnknownMessage) return undefined;
            throw error;
        });
    if (stickedMessage) {
        await stickedMessage.delete()
            .catch((error: DiscordAPIError) => {
                if (error.code === RESTJSONErrorCodes.UnknownMessage) return;
                throw error;
            });
    }
    stickedMessageIds.delete(stickChannel.id);
    await discordBotKeyvs.setStickedMessageIds(stickChannel.guildId, stickedMessageIds);
};

const executeDelete = async (interaction: ChatInputCommandInteraction) => {
    const stickedMessageIds = await discordBotKeyvs.getStickedMessageIds(interaction.guildId!);
    if (!stickedMessageIds?.size) {
        const embed = getReplyEmbed(__t("bot/command/stick-msg/delete/notSticked"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    for (const channelId of stickedMessageIds.keys()) {
        const stickChannel = await interaction.guild?.channels.fetch(channelId);
        if (!stickChannel) {
            stickedMessageIds.delete(channelId);
        }
    }
    await discordBotKeyvs.setStickedMessageIds(interaction.guildId!, stickedMessageIds);
    const channel = interaction.options.getChannel("channel") as TextChannel || interaction.channel! as TextChannel;
    deleteStickMessage(channel, stickedMessageIds);
    const embed = getReplyEmbed(__t("bot/command/stick-msg/delete/success", { channel: channel.toString() }), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    const stickedMessageChannels = await (async () => {
        const stickedMessageIds = await discordBotKeyvs.getStickedMessageIds(interaction.guildId!);
        if (!stickedMessageIds?.size) return __t("notting");
        const stickedMessageChannelIds = stickedMessageIds.keys();
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
    const replyEmbed = getReplyEmbed(__t("bot/command/getStatus/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [replyEmbed] });
    const statusEmbed = await getStatusEmbed(interaction);
    await interaction.followUp({ embeds: [statusEmbed] });
};

export default stickMessageCommand;