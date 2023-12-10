import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command, EmbedPage, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";
import * as cnfAfk from "./cnfAfk";
import * as cnfBumpReminder from "./cnfBumpReminder";
import * as cnfVac from "./cnfVac";

export const cnfStatusListCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-status-list")
        .setDescription(__t("bot/command/cnf-status-list/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const replyEmbed = getReplyEmbed(__t("bot/command/getCnfStatusList"), ReplyEmbedType.Success);
        await interaction.reply({ embeds: [replyEmbed] });
        const cnfStatusEmbedList = [
            await cnfBumpReminder.getCnfStatusEmbed(interaction),
            await cnfAfk.getCnfStatusEmbed(interaction),
            await cnfVac.getCnfStatusEmbed(interaction),
        ];
        const cnfStatusEmbedsPage = new EmbedPage(interaction.channel!, cnfStatusEmbedList);
        await cnfStatusEmbedsPage.send({ time: 300_000 });
    }
};

export default cnfStatusListCommand;