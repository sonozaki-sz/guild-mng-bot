import { ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordAPIError, Events, Message, Role, User } from "discord.js";
import { getStickedMessages, setStickedMessages } from "../services/botUtilty";
import { BotEvent, BotKeyvKeys, ReplyEmbedType, botKeyvs, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const messageCreateEvent: BotEvent = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        await executeBumpReminder(message);
        await executeStickMessage(message);
    }
};

const disboardUserId = "302050872383242240";
const bumpCommandName = "bump";

const executeBumpReminder = async (message: Message) => {
    const isBumpReminderEnabled = await botKeyvs.getValue(message.guildId!, BotKeyvKeys.IsBumpReminderEnabled) as boolean | undefined;
    if (!isBumpReminderEnabled) return;
    if (message.author.id !== disboardUserId) return;
    if (message.interaction?.commandName !== bumpCommandName) return;
    logger.info(__t("log/bot/bumpReminder/detectBump", { guild: message.guildId! }));
    const twoHoursLaterMSec = message.createdTimestamp + 2 * 60 * 60 * 1000;
    const twoHoursLaterSec = Math.floor(twoHoursLaterMSec / 1000);
    const embedDesc = __t("bot/bumpReminder/bumpMessage", { time: `<t:${twoHoursLaterSec}:T>`, diffCurTime: `<t:${twoHoursLaterSec}:R>` });
    const embed = getReplyEmbed(embedDesc, ReplyEmbedType.Info);
    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("doRemind")
                .setLabel(__t("bot/bumpReminder/button/doRemind"))
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔔"),
            new ButtonBuilder()
                .setCustomId("doNotRemind")
                .setLabel(__t("bot/bumpReminder/button/doNotRemind"))
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔕")
        );
    const bumpReminderMessage = await message.channel.send({ embeds: [embed], components: [actionRow] });
    const collector = bumpReminderMessage.createMessageComponentCollector({ time: 2 * 60 * 60 * 1000 });
    await botKeyvs.setValue(message.guildId!, BotKeyvKeys.BumpReminderRmdDate, twoHoursLaterMSec);
    collector.on("collect", async (interaction) => {
        switch (interaction.customId) {
            case "doRemind": {
                const mentionUsers = await botKeyvs.getValue(message.guildId!, BotKeyvKeys.BumpReminderMentionUsers) as Array<User> || new Array<User>();
                if (mentionUsers.some(user => user.id === interaction.user.id)) {
                    const embed = getReplyEmbed(__t("bot/bumpReminder/alreadySetRemind"), ReplyEmbedType.Warn);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                mentionUsers.push(interaction.user);
                await botKeyvs.setValue(message.guildId!, BotKeyvKeys.BumpReminderMentionUsers, mentionUsers);
                const embed = getReplyEmbed(__t("bot/bumpReminder/setRemind"), ReplyEmbedType.Success);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                logger.info(__t("log/bot/bumpReminder/setRemind", { guild: message.guildId!, user: interaction.user.toString() }));
                break;
            }
            case "doNotRemind": {
                const mentionUsers = await botKeyvs.getValue(message.guildId!, BotKeyvKeys.BumpReminderMentionUsers) as Array<User> || new Array<User>();
                if (mentionUsers.some(user => user.id === interaction.user.id)) {
                    const newMentionUsers = mentionUsers.filter(user => user.id !== interaction.user.id);
                    await botKeyvs.setValue(message.guildId!, BotKeyvKeys.BumpReminderMentionUsers, newMentionUsers);
                }
                const embed = getReplyEmbed(__t("bot/bumpReminder/cancelRemind"), ReplyEmbedType.Success);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                logger.info(__t("log/bot/bumpReminder/cancelRemind", { guild: message.guildId!, user: interaction.user.toString() }));
                break;
            }
        }
    });
    collector.once("end", async () => {
        bumpReminderMessage.edit({ components: [] });
    });

    const timerId = setInterval(async () => {
        const rmdBumpDate = await botKeyvs.getValue(message.guildId!, BotKeyvKeys.BumpReminderRmdDate) as number | undefined;
        if (!rmdBumpDate) return;
        if (rmdBumpDate <= Date.now()) {
            clearInterval(timerId);
            const mentionRole = await botKeyvs.getValue(message.guildId!, BotKeyvKeys.BumpReminderMentionRole) as Role | undefined;
            const mentionRoleText = await (async () => {
                if (!mentionRole) return "";
                const role = await message.guild?.roles.fetch(mentionRole.id);
                return role?.toString() || "";
            })();
            const mentionUsersText = await (async () => {
                const mentionUsers = await botKeyvs.getValue(message.guildId!, BotKeyvKeys.BumpReminderMentionUsers) as Array<User> | undefined;
                if (!mentionUsers) return "";
                return await Promise.all(mentionUsers.map(async user => {
                    const member = await bumpReminderMessage.guild?.members.fetch(user.id);
                    return member?.toString() || "";
                })).then(members => members.toString());
            })();
            await botKeyvs.deleteValue(message.guildId!, BotKeyvKeys.BumpReminderRmdDate);
            await botKeyvs.deleteValue(message.guildId!, BotKeyvKeys.BumpReminderMentionUsers);
            if (!mentionRoleText && !mentionUsersText) return;
            bumpReminderMessage.reply(__t("bot/bumpReminder/remindMessage", { mentionRole: mentionRoleText, mentionUsers: mentionUsersText }));
            logger.info(__t("log/bot/bumpReminder/remind", { guild: message.guildId! }));
        }
    }, 1000)
};

const executeStickMessage = async (message: Message) => {
    const stickedMessages = await getStickedMessages(message.guildId!);
    if (!stickedMessages.has(message.channel.id)) return;
    const stickedMessageId = stickedMessages.get(message.channel.id);
    if (stickedMessageId === message.id) return;
    // FIXME: send()したあとにもう一度fetch()が呼ばれる問題を回避するために例外を握り潰している。
    const stickedMessage = await message.channel.messages.fetch(stickedMessageId!)
        .catch(async (error: DiscordAPIError) => {
            if (error.code === 10008) return undefined;
            throw error;
        });
    if (!stickedMessage) return;
    const content = stickedMessage.content;
    const embeds = stickedMessage.embeds;
    await stickedMessage.delete()
        .catch(async (error: DiscordAPIError) => {
            if (error.code === 10008) return;
            throw error;
        });
    stickedMessages.delete(message.channel.id);
    const newStickMessage = await message.channel.send({ content, embeds });
    stickedMessages.set(message.channel.id, newStickMessage.id);
    await setStickedMessages(message.guildId!, stickedMessages);
};

export default messageCreateEvent;