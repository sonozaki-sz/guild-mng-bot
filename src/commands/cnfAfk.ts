import { ChannelType, ChatInputCommandInteraction, Colors, DiscordAPIError, EmbedBuilder, PermissionFlagsBits, RESTJSONErrorCodes, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
import { __t } from "../services/locale";

export const cnfAfkCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-afk")
        .setDescription(__t("bot/command/cnf-afk/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName("set-dest")
                .setDescription(__t("bot/command/cnf-afk/set-dest/description"))
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(__t("bot/command/cnf-afk/set-dest/channelOption/description"))
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true)
                )
        ).addSubcommand(subcommand =>
            subcommand
                .setName("get-dest")
                .setDescription(__t("bot/command/cnf-afk/get-dest/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(__t("bot/command/cnf-afk/status/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "set-dest": {
                await executeSetDest(interaction);
                break;
            }
            case "get-dest": {
                await executeGetDest(interaction);
                break;
            }
            case "status": {
                await executeStatus(interaction);
                break;
            }
        }
    }
};

const executeSetDest = async (interaction: ChatInputCommandInteraction) => {
    const channel = interaction.options.getChannel("channel") as VoiceChannel;
    await discordBotKeyvs.setDestAfkVcId(interaction.guildId!, channel.id)
    const embed = getReplyEmbed(__t("bot/command/cnf-afk/set-dest/success", { channel: channel.toString() }), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

const executeGetDest = async (interaction: ChatInputCommandInteraction) => {
    const afkChannelId = await discordBotKeyvs.getDestAfkVcId(interaction.guildId!);
    if (!afkChannelId) {
        const embed = getReplyEmbed(__t("bot/command/unsetDestAfk"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    const channel = await interaction.guild?.channels.fetch(afkChannelId)
        .catch((reason: DiscordAPIError) => {
            if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                return undefined;
            }
            throw reason;
        });
    if (!channel) {
        const embed = getReplyEmbed(__t("bot/command/notFoundDestAfk"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    const embed = getReplyEmbed(__t("bot/command/cnf-afk/get-dest/success", { channel: channel.toString() }), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    const afkChannelId = await discordBotKeyvs.getDestAfkVcId(interaction.guildId!);
    const fetchedAfkChannel = await (async () => {
        if (!afkChannelId) {
            return undefined;
        }
        return await interaction.guild?.channels.fetch(afkChannelId)
            .catch((reason: DiscordAPIError) => {
                if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                    return undefined;
                }
                throw reason;
            });
    })();
    const status = fetchedAfkChannel ? __t("enabled") : __t("disabled");
    const statusEmbed = new EmbedBuilder()
        .setTitle(__t("bot/afk"))
        .setColor(Colors.Blue)
        .setFields(
            { name: __t("status"), value: status },
            { name: __t("destChannel"), value: fetchedAfkChannel?.toString() || __t("unset") }
        );
    return statusEmbed;
};

const executeStatus = async (interaction: ChatInputCommandInteraction) => {
    const replyEmbed = getReplyEmbed(__t("bot/command/getStatus/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [replyEmbed] });
    const statusEmbed = await getStatusEmbed(interaction);
    await interaction.followUp({ embeds: [statusEmbed] });
};

export default cnfAfkCommand;