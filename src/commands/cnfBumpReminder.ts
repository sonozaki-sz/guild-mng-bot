import { ChatInputCommandInteraction, Colors, EmbedBuilder, Role, SlashCommandBuilder, User } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
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
                executeStart(interaction);
                break;
            }
            case "stop": {
                executeStop(interaction);
                break;
            }
            case "set-mention": {
                executeSetMention(interaction);
                break;
            }
            case "status": {
                executeStatus(interaction);
                break;
            }
        }
    }
};

const executeStart = async (interaction: ChatInputCommandInteraction) => {
    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsBumpReminderEnabled, true);
    await keyvs.setValue(interaction.guildId!, KeyvKeys.BumpReminderMentionUsers, new Array<User>());
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/start/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/bumpReminder/start", { guild: interaction.guildId! }));
};

const executeStop = async (interaction: ChatInputCommandInteraction) => {
    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsBumpReminderEnabled, false);
    await keyvs.deleteValue(interaction.guildId!, KeyvKeys.BumpReminderMentionUsers);
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/stop/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/bumpReminder/stop", { guild: interaction.guildId! }));
};

const executeSetMention = async (interaction: ChatInputCommandInteraction) => {
    const role = interaction.options.getRole("role", false);
    if (!role) {
        await keyvs.deleteValue(interaction.guildId!, KeyvKeys.BumpReminderMentionRole);
        const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/success", { role: __t("disabled") }), ReplyEmbedType.Success);
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (!role.mentionable) {
        const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/notMentionable", { role: role.toString() }), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }

    await keyvs.setValue(interaction.guildId!, KeyvKeys.BumpReminderMentionRole, role);
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/success", { role: role.toString() }), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

export const getCnfStatus = async (interaction: ChatInputCommandInteraction) => {
    const statusText = await (async () => {
        const isEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsBumpReminderEnabled) as boolean | undefined;
        return isEnabled ? __t("executing") : __t("stoping");
    })();
    const mentionRoleText = await (async () => {
        const memtionRole = await keyvs.getValue(interaction.guildId!, KeyvKeys.BumpReminderMentionRole) as Role | undefined;
        if (!memtionRole) return __t("unset");
        const role = await interaction.guild?.roles.fetch(memtionRole.id);
        return role?.toString() || __t("unset");
    })();
    const mentionUsersText = await (async () => {
        const mentionUsers = await keyvs.getValue(interaction.guildId!, KeyvKeys.BumpReminderMentionUsers) as Array<User> | undefined;
        if (!mentionUsers) return __t("notting");
        return await Promise.all(mentionUsers.map(async user => {
            const member = await interaction.guild?.members.fetch(user.id)
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
    const replyEmbed = getReplyEmbed(__t("bot/command/getCnfStatus"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [replyEmbed] });
    const statusEmbed = await getCnfStatus(interaction);
    await interaction.followUp({ embeds: [statusEmbed] });
};

export default cnfBumpReminderCommand;