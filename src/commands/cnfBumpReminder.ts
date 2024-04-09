import { ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const cnfBumpReminderCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-bump-reminder")
        .setDescription(__t("bot/command/cnf-bump-reminder/description"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription(__t("bot/command/cnf-bump-reminder/start/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription(__t("bot/command/cnf-bump-reminder/stop/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("set-mention")
                .setDescription(__t("bot/command/cnf-bump-reminder/set-mention/description"))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(__t("bot/command/cnf-bump-reminder/set-mention/roleOption/description"))
                        .setRequired(false)
                )
        ).addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(__t("bot/command/cnf-bump-reminder/status/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "start": {
                await executeStart(interaction);
                break;
            }
            case "stop": {
                await executeStop(interaction);
                break;
            }
            case "set-mention": {
                await executeSetMention(interaction);
                break;
            }
            case "status": {
                await executeStatus(interaction);
                break;
            }
        }
    }
};

const executeStart = async (interaction: ChatInputCommandInteraction) => {
    await discordBotKeyvs.setIsBumpReminderEnabled(interaction.guildId!, true);
    await discordBotKeyvs.deleteBumpReminderMentionUserIds(interaction.guildId!);
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/start/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/bumpReminder/start", { guild: interaction.guildId! }));
};

const executeStop = async (interaction: ChatInputCommandInteraction) => {
    await discordBotKeyvs.setIsBumpReminderEnabled(interaction.guildId!, false);
    await discordBotKeyvs.deleteBumpReminderMentionUserIds(interaction.guildId!);
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/stop/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/bumpReminder/stop", { guild: interaction.guildId! }));
};

const executeSetMention = async (interaction: ChatInputCommandInteraction) => {
    const role = interaction.options.getRole("role", false);
    if (!role) {
        await discordBotKeyvs.deleteBumpReminderMentionRoleId(interaction.guildId!);
        const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/success", { role: __t("disabled") }), ReplyEmbedType.Success);
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (!role.mentionable) {
        const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/notMentionable", { role: role.toString() }), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }

    await discordBotKeyvs.setBumpReminderMentionRoleId(interaction.guildId!, role.id);
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/success", { role: role.toString() }), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    const statusText = await (async () => {
        const isEnabled = await discordBotKeyvs.getIsBumpReminderEnabled(interaction.guildId!);
        return isEnabled ? __t("executing") : __t("stoping");
    })();
    const mentionRoleText = await (async () => {
        const memtionRoleId = await discordBotKeyvs.getBumpReminderMentionRoleId(interaction.guildId!);
        if (!memtionRoleId) return __t("unset");
        const role = await interaction.guild?.roles.fetch(memtionRoleId);
        return role?.toString() || __t("unset");
    })();
    const mentionUsersText = await (async () => {
        const mentionUserIds = await discordBotKeyvs.getBumpReminderMentionUserIds(interaction.guildId!);
        if (!mentionUserIds?.length) return __t("notting");
        return await Promise.all(mentionUserIds.map(async userId => {
            const member = await interaction.guild?.members.fetch(userId)
                .catch(() => undefined);
            return member?.toString() || __t("notFoundUser");
        })).then(members => members.toString());
    })();
    const statusEmbed = new EmbedBuilder()
        .setTitle(__t("bot/bumpReminder"))
        .setColor(Colors.Blue)
        .setFields(
            { name: __t("status"), value: statusText },
            { name: __t("mentionRole"), value: mentionRoleText },
            { name: __t("mentionUsers"), value: mentionUsersText },
        );
    return statusEmbed;
};

const executeStatus = async (interaction: ChatInputCommandInteraction) => {
    const replyEmbed = getReplyEmbed(__t("bot/command/getStatus/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [replyEmbed] });
    const statusEmbed = await getStatusEmbed(interaction);
    await interaction.followUp({ embeds: [statusEmbed] });
};

export default cnfBumpReminderCommand;