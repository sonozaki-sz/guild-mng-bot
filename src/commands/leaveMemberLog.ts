import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { DiscordBotKeyvKeys, discordBotKeyvs } from "../services/discordBot";
import { __t } from "../services/locale";

export const LeaveMemberLogCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("leave-member-log")
        .setDescription(__t("bot/command/leaveMemberLog/description"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription(__t("bot/command/leaveMemberLog/start/description"))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription(__t("bot/command/leaveMemberLog/stop/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "start": {
                await discordBotKeyvs.setValue(interaction.guildId!, DiscordBotKeyvKeys.LeaveMemberLogChannel, interaction.channelId!);
                const embed = getReplyEmbed(__t("bot/command/leaveMemberLog/start/success"), ReplyEmbedType.Success);
                await interaction.reply({ embeds: [embed] });
                break;
            }
            case "stop": {
                await discordBotKeyvs.deleteValue(interaction.guildId!, DiscordBotKeyvKeys.LeaveMemberLogChannel);
                const embed = getReplyEmbed(__t("bot/command/leaveMemberLog/stop/success"), ReplyEmbedType.Success);
                await interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};

export default LeaveMemberLogCommand;