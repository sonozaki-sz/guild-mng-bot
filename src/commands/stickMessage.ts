import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Collection, Colors, ComponentType, DiscordAPIError, EmbedBuilder, Guild, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, PermissionFlagsBits, RESTJSONErrorCodes, SlashCommandBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
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
        const stickMessageChannel = stickTextModal.data as TextChannel | undefined;
        if (!stickMessageChannel) {
            const embed = getReplyEmbed(__t("bot/command/stick-msg/start/notFoundChannel"), ReplyEmbedType.Warn);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        const stickMessagePairs = await discordBotKeyvs.getStickMessageChannelIdMessageIdPairs(interaction.guild!.id) || new Collection<string, string>();
        if (stickMessagePairs.has(stickMessageChannel.id)) {
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
                        await deleteStickMessage(stickMessageChannel);
                        await stickMessage(stickMessageChannel, text, stickMessagePairs);
                        const embed = getReplyEmbed(__t("bot/command/stick-msg/start/success/restick", { channel: stickMessageChannel.toString() }), ReplyEmbedType.Success);
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
                    const embed = getReplyEmbed(__t("operationTimedOut"), ReplyEmbedType.Warn);
                    await interaction.followUp({ embeds: [embed] });
                }
                await interaction.editReply({ components: [] });
            });
            return;
        }
        await stickMessage(stickMessageChannel, text, stickMessagePairs);
        const embed = getReplyEmbed(__t("bot/command/stick-msg/start/success", { channel: stickMessageChannel.toString() }), ReplyEmbedType.Success);
        await interaction.followUp({ embeds: [embed] });
    }
}

const refreshStickMessage = async (guild: Guild) => {
    const stickMessagePairs = await discordBotKeyvs.getStickMessageChannelIdMessageIdPairs(guild.id);
    if (!stickMessagePairs?.size) return;
    await discordBotKeyvs.setStickMessageChannelIdMessageIdPairs(guild.id, stickMessagePairs);
    for (const [channelId, messageId] of stickMessagePairs.entries()) {
        const stickMessageChannel = await guild.channels.fetch(channelId)
            .catch((error: DiscordAPIError) => {
                if (error.code === RESTJSONErrorCodes.UnknownChannel) return undefined;
                throw error;
            }) as TextChannel | undefined;
        if (!stickMessageChannel) {
            stickMessagePairs.delete(channelId);
            continue;
        }
        const stickMessage = await stickMessageChannel.messages.fetch(messageId)
            .catch((error: DiscordAPIError) => {
                if (error.code === RESTJSONErrorCodes.UnknownMessage) return undefined;
                throw error;
            });
        if (!stickMessage) {
            stickMessagePairs.delete(channelId);
            continue;
        }
    }
    await discordBotKeyvs.setStickMessageChannelIdMessageIdPairs(guild.id, stickMessagePairs);
};

const stickMessage = async (stickMessageChannel: TextChannel, message: string, stickMessageChannelIdMessageIdPairs: Collection<string, string>) => {
    const sentMessage = await stickMessageChannel.send(message);
    stickMessageChannelIdMessageIdPairs.set(stickMessageChannel.id, sentMessage.id);
    await discordBotKeyvs.setStickMessageChannelIdMessageIdPairs(stickMessageChannel.guildId, stickMessageChannelIdMessageIdPairs);
};

enum StickMessageDeleteStatus {
    Success,
    notSticked,
    NotFoundChannel,
    NotFoundMessage,
    UnknownError,
}

const deleteStickMessage = async (stickMessageChannel: TextChannel) => {
    const stickMessagePairs = await discordBotKeyvs.getStickMessageChannelIdMessageIdPairs(stickMessageChannel.guildId);
    if (!stickMessagePairs?.has(stickMessageChannel.id)) return StickMessageDeleteStatus.notSticked;
    const stickMessageId = stickMessagePairs.get(stickMessageChannel.id);
    if (!stickMessageId) return StickMessageDeleteStatus.NotFoundChannel;
    const stickMessage = await stickMessageChannel.messages.fetch(stickMessageId)
        .catch((error: DiscordAPIError) => {
            if (error.code === RESTJSONErrorCodes.UnknownMessage) return undefined;
            throw error;
        });
    if (!stickMessage) return StickMessageDeleteStatus.NotFoundMessage;
    else {
        await stickMessage.delete()
            .catch((error: DiscordAPIError) => {
                if (error.code === RESTJSONErrorCodes.UnknownMessage) return;
                throw error;
            });
    }
    stickMessagePairs.delete(stickMessageChannel.id);
    await discordBotKeyvs.setStickMessageChannelIdMessageIdPairs(stickMessageChannel.guildId, stickMessagePairs);
    return StickMessageDeleteStatus.Success;
};

const executeStart = async (interaction: ChatInputCommandInteraction) => {
    const stickMessageChannel = interaction.options.getChannel("channel") || interaction.channel! as TextChannel;
    await refreshStickMessage(interaction.guild!);
    if (stickMessageChannel.type === ChannelType.GuildText) {
        stickTextModal.data = stickMessageChannel;
        interaction.client.modals.set(stickTextModal.modal.data.custom_id!, stickTextModal);
        await interaction.showModal(stickTextModal.modal);
    }
};

const executeDelete = async (interaction: ChatInputCommandInteraction) => {
    await refreshStickMessage(interaction.guild!);
    const stickMessageChannel = interaction.options.getChannel("channel") as TextChannel || interaction.channel! as TextChannel;
    const deleteStatus = await deleteStickMessage(stickMessageChannel);
    if (deleteStatus !== StickMessageDeleteStatus.Success) {
        const embed = getReplyEmbed(__t("bot/command/stick-msg/delete/notSticked"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    const embed = getReplyEmbed(__t("bot/command/stick-msg/delete/success", { channel: stickMessageChannel.toString() }), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    await refreshStickMessage(interaction.guild!);
    const stickMessageChannels = await (async () => {
        const stickMessagePairs = await discordBotKeyvs.getStickMessageChannelIdMessageIdPairs(interaction.guildId!);
        if (!stickMessagePairs?.size) return __t("notting");
        const stickMessageChannelIds = stickMessagePairs.keys();
        return await Promise.all(Array.from(stickMessageChannelIds).map(async channelId => {
            return `<#${channelId}>`;
        })).then(channels => channels.toString());
    })();
    const statusEmbed = new EmbedBuilder()
        .setTitle(__t("bot/stickMessage"))
        .setColor(Colors.Blue)
        .setFields([
            { name: __t("stickMessageChannel"), value: stickMessageChannels },
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