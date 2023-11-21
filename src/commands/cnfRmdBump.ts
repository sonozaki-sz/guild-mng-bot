import { ChatInputCommandInteraction, Role, SlashCommandBuilder } from "discord.js";
import { GetReplyEmbed, ReplyEmbedType } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";
import { Command } from "../types/discord";

export const cnfRmdBumpCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-rmd-bump")
        .setDescription(__t("bot/command/cnf-rmd-bump/description"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription(__t("bot/command/cnf-rmd-bump/start/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription(__t("bot/command/cnf-rmd-bump/stop/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("set-mention")
                .setDescription(__t("bot/command/cnf-rmd-bump/set-mention/description"))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(__t("bot/command/cnf-rmd-bump/set-mention/roleOption/description"))
                        .setRequired(false)
                )
        ).addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(__t("bot/command/cnf-rmd-bump/status/description"))
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
}

const executeStart = async (interaction: ChatInputCommandInteraction) => {
    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsRmdBumpEnabled, true);
    const embed = GetReplyEmbed(__t("bot/command/cnf-rmd-bump/start/success"), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
};

const executeStop = async (interaction: ChatInputCommandInteraction) => {
    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsRmdBumpEnabled, false);
    const embed = GetReplyEmbed(__t("bot/command/cnf-rmd-bump/stop/success"), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
};

const executeSetMention = async (interaction: ChatInputCommandInteraction) => {
    const role = interaction.options.getRole("role", false);
    if (!role) {
        await keyvs.deleteValue(interaction.guildId!, KeyvKeys.RmdBumpMentionRole);
        const embed = GetReplyEmbed(__t("bot/command/cnf-rmd-bump/set-mention/success", { role: __t("disabled") }), ReplyEmbedType.Success);
        interaction.reply({ embeds: [embed] });
        return;
    }

    if (!role.mentionable) {
        const embed = GetReplyEmbed(__t("bot/command/cnf-rmd-bump/set-mention/notMentionable", { role: role.toString() }), ReplyEmbedType.Warn);
        interaction.reply({ embeds: [embed] });
        return;
    }

    await keyvs.setValue(interaction.guildId!, KeyvKeys.RmdBumpMentionRole, role);
    const embed = GetReplyEmbed(__t("bot/command/cnf-rmd-bump/set-mention/success", { role: role.toString() }), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
};

const executeStatus = async (interaction: ChatInputCommandInteraction) => {
    const isEnabled: boolean | undefined = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsRmdBumpEnabled);
    const memtionRole: Role | undefined = await keyvs.getValue(interaction.guildId!, KeyvKeys.RmdBumpMentionRole);
    const status = isEnabled ? __t("executing") : __t("stoping");
    const mentionRoleText = (() => {
        if (!memtionRole) return __t("disabled");
        const role = interaction.guild?.roles.cache.get(memtionRole.id);
        return role?.toString() || __t("disabled");
    })();
    const embed = GetReplyEmbed(__t("bot/command/cnf-rmd-bump/status/success", { status: status, mentionRole: mentionRoleText }), ReplyEmbedType.Success);
    interaction.reply({ embeds: [embed] });
};


export default cnfRmdBumpCommand;