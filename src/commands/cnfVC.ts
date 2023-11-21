import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, GetReplyEmbed, ReplyEmbedType } from "../services/discord";
import { __t } from "../services/locale";

export const cnfVCCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-vc")
        .setDescription(__t("bot/command/cnf-vc/description"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("rename")
                .setDescription(__t("bot/command/cnf-vc/rename/description"))
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription(__t("bot/command/cnf-vc/rename/nameOption/description"))
                        .setRequired(true)
                )
        ).addSubcommand(subcommand =>
            subcommand
                .setName("user-limit")
                .setDescription(__t("bot/command/cnf-vc/user-limit/description"))
                .addNumberOption(option =>
                    option
                        .setName("user-limit")
                        .setDescription(__t("bot/command/cnf-vc/user-limit/userLimitOption/description"))
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(true)
                )
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const member = interaction.guild?.members.cache.get(interaction.user.id);
        if (!member?.voice.channel) {
            const embed = GetReplyEmbed(__t("bot/command/cnf-vc/notInVC"), ReplyEmbedType.Warn);
            interaction.reply({ embeds: [embed] });
            return;
        }
        switch (interaction.options.getSubcommand()) {
            case "rename": {
                const name = interaction.options.getString("name")!;
                member.voice.channel.setName(name)
                    .then(channel => {
                        const embed = GetReplyEmbed(__t("bot/command/cnf-vc/rename/success", { channel: channel.toString(), name: channel.name }), ReplyEmbedType.Success);
                        interaction.reply({ embeds: [embed] });
                    }).catch((error) => {
                        const embed = GetReplyEmbed(__t("bot/command/cnf-vc/rename/faild", { error: error.toString() }), ReplyEmbedType.Warn);
                        interaction.reply({ embeds: [embed] });
                    });
                break;
            }
            case "user-limit": {
                const userLimit = interaction.options.getNumber("user-limit")!;
                const userLimitText = userLimit ? `${userLimit}${__t("peaple")}` : __t("unlimited");
                member.voice.channel.setUserLimit(userLimit)
                    .then(channel => {
                        const embed = GetReplyEmbed(__t("bot/command/cnf-vc/user-limit/success", { channel: channel.toString(), userLimit: userLimitText }), ReplyEmbedType.Success);
                        interaction.reply({ embeds: [embed] });
                    }).catch((error) => {
                        const embed = GetReplyEmbed(__t("bot/command/cnf-vc/user-limit/faild", { channel: member.voice.channel?.toString()!, error: error.toString() }), ReplyEmbedType.Warn);
                        interaction.reply({ embeds: [embed] });
                    });
                break;
            }
        }
    }
};

export default cnfVCCommand;