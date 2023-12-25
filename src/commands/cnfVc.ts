import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";

export const cnfVcCommand: Command = {
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
    cooldown: 60,
    execute: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply();
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        if (!member?.voice.channel) {
            const embed = getReplyEmbed(__t("bot/command/cnf-vc/notInVc"), ReplyEmbedType.Warn);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        switch (interaction.options.getSubcommand()) {
            case "rename": {
                const name = interaction.options.getString("name")!;
                await member.voice.channel.setName(name)
                    .then(async (channel) => {
                        const embed = getReplyEmbed(__t("bot/command/cnf-vc/rename/success", { channel: channel.toString(), name: channel.name }), ReplyEmbedType.Success);
                        await interaction.editReply({ embeds: [embed] });
                    }).catch(async (error: Error) => {
                        const embed = getReplyEmbed(__t("bot/command/cnf-vc/rename/faild", { error: error.message }), ReplyEmbedType.Error);
                        await interaction.editReply({ embeds: [embed] });
                    });
                return;
            }
            case "user-limit": {
                const userLimit = interaction.options.getNumber("user-limit")!;
                const userLimitText = userLimit ? `${userLimit}${__t("peaple")}` : __t("unlimited");
                await member.voice.channel.setUserLimit(userLimit)
                    .then(async (channel) => {
                        const embed = getReplyEmbed(__t("bot/command/cnf-vc/user-limit/success", { channel: channel.toString(), userLimit: userLimitText }), ReplyEmbedType.Success);
                        await interaction.editReply({ embeds: [embed] });
                    }).catch(async (error) => {
                        const embed = getReplyEmbed(__t("bot/command/cnf-vc/user-limit/faild", { channel: member.voice.channel?.toString()!, error: error.toString() }), ReplyEmbedType.Warn);
                        await interaction.editReply({ embeds: [embed] });
                    });
                return;
            }
        }
    }
};

export default cnfVcCommand;