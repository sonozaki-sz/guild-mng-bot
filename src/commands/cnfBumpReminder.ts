import { ChatInputCommandInteraction, Role, SlashCommandBuilder } from "discord.js";
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
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/start/success"), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/bumpReminder/start", { guild: interaction.guildId! }));
};

const executeStop = async (interaction: ChatInputCommandInteraction) => {
    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsBumpReminderEnabled, false);
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/stop/success"), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/bumpReminder/stop", { guild: interaction.guildId! }));
};

const executeSetMention = async (interaction: ChatInputCommandInteraction) => {
    const role = interaction.options.getRole("role", false);
    if (!role) {
        await keyvs.deleteValue(interaction.guildId!, KeyvKeys.BumpReminderMentionRole);
        const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/success", { role: __t("disabled") }), ReplyEmbedType.Success);
        interaction.reply({ embeds: [embed] });
        return;
    }

    if (!role.mentionable) {
        const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/notMentionable", { role: role.toString() }), ReplyEmbedType.Warn);
        interaction.reply({ embeds: [embed] });
        return;
    }

    await keyvs.setValue(interaction.guildId!, KeyvKeys.BumpReminderMentionRole, role);
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/set-mention/success", { role: role.toString() }), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
};

const executeStatus = async (interaction: ChatInputCommandInteraction) => {
    const isEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsBumpReminderEnabled) as boolean | undefined;
    const memtionRole = await keyvs.getValue(interaction.guildId!, KeyvKeys.BumpReminderMentionRole) as Role | undefined;
    const status = isEnabled ? __t("executing") : __t("stoping");
    const mentionRoleText = await (async () => {
        if (!memtionRole) return __t("disabled");
        const role = await interaction.guild?.roles.fetch(memtionRole.id);
        return role?.toString() || __t("disabled");
    })();
    const embed = getReplyEmbed(__t("bot/command/cnf-bump-reminder/status/success", { status: status, mentionRole: mentionRoleText }), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
};

export default cnfBumpReminderCommand;