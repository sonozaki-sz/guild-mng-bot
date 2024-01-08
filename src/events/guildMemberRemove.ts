import { Events, GuildMember, PartialGuildMember, TextChannel } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed as getBotEmbed } from "../services/discord";
import { DiscordBotKeyvKeys, discordBotKeyvs } from "../services/discordBot";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const guildMemberRemoveEvent: BotEvent = {
    name: Events.GuildMemberRemove,
    execute: async (member: GuildMember | PartialGuildMember) => {
        await executeMemberLeaveLog(member);
    }
}

const executeMemberLeaveLog = async (member: GuildMember | PartialGuildMember) => {
    if (!member.guild.available) return;
    const memberLogChannelId = await discordBotKeyvs.getValue(member.guild.id, DiscordBotKeyvKeys.LeaveMemberLogChannel) as string | undefined;
    if (!memberLogChannelId) return;
    const memberLogChannel = await member.guild.channels.fetch(memberLogChannelId) as TextChannel | undefined;
    if (!memberLogChannel) return;
    const embed = getBotEmbed(__t("bot/memberLeaveLog/Message", { user: member.toString() }), ReplyEmbedType.Info);
    await memberLogChannel.send({ embeds: [embed] });
    logger.info(__t("log/bot/memberLeaveLog", { guild: member.guild.id, user: member.user.tag }));
}

export default guildMemberRemoveEvent;