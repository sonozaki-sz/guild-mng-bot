import { DiscordAPIError, Events, GuildMember, PartialGuildMember, RESTJSONErrorCodes, TextChannel } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed as getBotEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
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
    const leaveMemberLogChannelId = await discordBotKeyvs.getLeaveMemberLogChannelId(member.guild.id);
    if (!leaveMemberLogChannelId) return;
    const leaveMemberLogChannel = await member.guild.channels.fetch(leaveMemberLogChannelId)
        .catch((reason: DiscordAPIError) => {
            if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                return undefined;
            }
            throw reason;
        }) as TextChannel | null | undefined;
    if (!leaveMemberLogChannel) return;
    const embed = getBotEmbed(__t("bot/memberLeaveLog/message", { user: member.toString() }), ReplyEmbedType.Info);
    await leaveMemberLogChannel.send({ embeds: [embed] });
    logger.info(__t("log/bot/sendMemberLeaveLog", { guild: member.guild.id, channel: leaveMemberLogChannelId, user: member.user.tag }));
}

export default guildMemberRemoveEvent;