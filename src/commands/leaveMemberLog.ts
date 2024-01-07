import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../services/discord";
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
                await interaction.reply(__t("bot/command/leaveMemberLog/start/success"));
                break;
            }
            case "stop": {
                await discordBotKeyvs.deleteValue(interaction.guildId!, DiscordBotKeyvKeys.LeaveMemberLogChannel);
                await interaction.reply(__t("bot/command/leaveMemberLog/stop/success"));
                break;
            }
        }
    }
};

export default LeaveMemberLogCommand;