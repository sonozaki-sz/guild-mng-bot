import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, Message, Role, User } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const messageCreateEvent: BotEvent = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        executeBumpReminder(message);
    }
};

const disboardUserID = "302050872383242240";
const bumpCommandName = "bump";

const executeBumpReminder = async (message: Message) => {
    const isBumpReminderEnabled = await keyvs.getValue(message.guildId!, KeyvKeys.IsBumpReminderEnabled) as boolean | undefined;
    if (!isBumpReminderEnabled) return;
    if (message.author.id !== disboardUserID) return;
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
    await keyvs.setValue(message.guildId!, KeyvKeys.BumpReminderRmdDate, twoHoursLaterMSec);
    collector.on("collect", async (interaction) => {
        switch (interaction.customId) {
            case "doRemind": {
                const mentionUsers = await (async () => {
                    const mentionUsers = await keyvs.getValue(message.guildId!, KeyvKeys.BumpReminderMentionUsers) as Array<User> | undefined;
                    if (!mentionUsers) return new Array<User>();
                    return mentionUsers;
                })();
                if (mentionUsers.some(user => user.id === interaction.user.id)) {
                    const embed = getReplyEmbed(__t("bot/bumpReminder/alreadySetRemind"), ReplyEmbedType.Warn);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                mentionUsers.push(interaction.user);
                await keyvs.setValue(message.guildId!, KeyvKeys.BumpReminderMentionUsers, mentionUsers);
                const embed = getReplyEmbed(__t("bot/bumpReminder/setRemind"), ReplyEmbedType.Info);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                logger.info(__t("log/bot/bumpReminder/setRemind", { guild: message.guildId! }));
                break;
            }
            case "doNotRemind": {
                const mentionUsers = await (async () => {
                    const mentionUsers = await keyvs.getValue(message.guildId!, KeyvKeys.BumpReminderMentionUsers) as Array<User> | undefined;
                    if (!mentionUsers) return new Array<User>();
                    return mentionUsers;
                })();
                if (mentionUsers.some(user => user.id === interaction.user.id)) {
                    const newMentionUsers = mentionUsers.filter(user => user.id !== interaction.user.id);
                    await keyvs.setValue(message.guildId!, KeyvKeys.BumpReminderMentionUsers, newMentionUsers);
                }
                const embed = getReplyEmbed(__t("bot/bumpReminder/cancelRemind"), ReplyEmbedType.Info);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                logger.info(__t("log/bot/bumpReminder/cancelRemind", { guild: message.guildId! }));
                break;
            }
        }
    });
    collector.once("end", async (_, reason) => {
        bumpReminderMessage.edit({ components: [] });
    });

    const timerID = setInterval(async () => {
        const rmdBumpDate = await keyvs.getValue(message.guildId!, KeyvKeys.BumpReminderRmdDate) as number | undefined;
        if (!rmdBumpDate) return;
        if (rmdBumpDate <= Date.now()) {
            clearInterval(timerID);
            const mentionRole = await keyvs.getValue(message.guildId!, KeyvKeys.BumpReminderMentionRole) as Role | undefined;
            const mentionRoleText = await (async () => {
                if (!mentionRole) return "";
                const role = await bumpReminderMessage.guild?.roles.fetch(mentionRole.id);
                return role?.toString() || "";
            })();
            const mentionUsersText = await (async () => {
                const mentionUsers = await keyvs.getValue(message.guildId!, KeyvKeys.BumpReminderMentionUsers) as Array<User> | undefined;
                if (!mentionUsers) return "";
                return await Promise.all(mentionUsers.map(async user => {
                    const member = await bumpReminderMessage.guild?.members.fetch(user.id);
                    return member?.toString() || "";
                })).then(members => members.toString());
            })();
            await keyvs.deleteValue(message.guildId!, KeyvKeys.BumpReminderRmdDate);
            await keyvs.deleteValue(message.guildId!, KeyvKeys.BumpReminderMentionUsers);
            if (!mentionRoleText && !mentionUsersText) return;
            bumpReminderMessage.reply(__t("bot/bumpReminder/remindMessage", { mentionRole: mentionRoleText, mentionUsers: mentionUsersText }));
            logger.info(__t("log/bot/bumpReminder/remind", { guild: message.guildId! }));
        }
    }, 10)
};

export default messageCreateEvent;