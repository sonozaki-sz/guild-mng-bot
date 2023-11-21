import { ChatInputCommandInteraction, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { Command } from "../services/discord";
import { __t } from "../services/locale";

export const echoCommand: Command = {
    data: new SlashCommandSubcommandBuilder()
        .setName("echo")
        .setDescription(__t("bot/command/echo/description"))
        .addStringOption((option: SlashCommandStringOption) =>
            option.setName("text")
                .setDescription(__t("bot/command/echo/textOption/description"))
                .setRequired(true)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const text = interaction.options.getString("text")!;
        interaction.reply(text);
    }
};

export default echoCommand;