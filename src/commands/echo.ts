import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../services/discord";
import { __t } from "../services/locale";

export const echoCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("echo")
        .setDescription(__t("bot/command/echo/description"))
        .addStringOption(option =>
            option.setName("text")
                .setDescription(__t("bot/command/echo/textOption/description"))
                .setRequired(true)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const text = interaction.options.getString("text")!;
        await interaction.reply(text);
    }
};

export default echoCommand;