import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command, EmbedPage, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";
import * as cnfAfk from "./cnfAfk";
import * as cnfBumpReminder from "./cnfBumpReminder";
import * as cnfVac from "./cnfVac";
import * as leaveMemberLog from "./leaveMemberLog";
import * as stickMessage from "./stickMessage";

export const statusListCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("status-list")
        .setDescription(__t("bot/command/status-list/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const replyEmbed = getReplyEmbed(__t("bot/command/getStatusList/success"), ReplyEmbedType.Success);
        await interaction.reply({ embeds: [replyEmbed] });
        const statusEmbedList = [
            await cnfBumpReminder.getStatusEmbed(interaction),
            await cnfAfk.getStatusEmbed(interaction),
            await cnfVac.getStatusEmbed(interaction),
            await stickMessage.getStatusEmbed(interaction),
            await leaveMemberLog.getStatusEmbed(interaction),
        ];
        const statusEmbedsPage = new EmbedPage(interaction.channel!, statusEmbedList);
        await statusEmbedsPage.send({ time: 300_000 });
    }
};

export default statusListCommand;