import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Events, Message, Role, User } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { DiscordBotKeyvKeys, discordBotKeyvs } from "../services/discordBot";
import { KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const messageCreateEvent: BotEvent = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        await executeBumpReminder(message)
            .catch((error: Error) => {
                const errorDesc = error.stack || error.message || "unknown error";
                logger.error(__t("log/bot/bumpReminder/error", { guild: message.guildId!, channel: message.channelId, error: errorDesc }));
                if (error instanceof KeyvsError) {
                    discordBotKeyvs.setkeyv(message.guildId!);
                    logger.info(__t("log/keyvs/reset", { namespace: message.guildId! }));
                }
            });
    }
};

const disboardUserId = "302050872383242240";
const bumpCommandName = "bump";

const executeBumpReminder = async (message: Message) => {
    const isBumpReminderEnabled = await discordBotKeyvs.getValue(message.guildId!, DiscordBotKeyvKeys.IsBumpReminderEnabled) as boolean | undefined;
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
    const bumpReminderMessage = await message.reply({ embeds: [embed], components: [actionRow] });
    const collector = bumpReminderMessage.createMessageComponentCollector<ComponentType.Button>({ time: 2 * 60 * 60 * 1000 });
    await discordBotKeyvs.setValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderRmdDate, twoHoursLaterMSec);
    collector.on("collect", async (interaction) => {
        switch (interaction.customId) {
            case "doRemind": {
                const mentionUsers = await discordBotKeyvs.getValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderMentionUsers) as Array<User> || new Array<User>();
                if (mentionUsers.some(user => user.id === interaction.user.id)) {
                    const embed = getReplyEmbed(__t("bot/bumpReminder/alreadySetRemind"), ReplyEmbedType.Warn);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                mentionUsers.push(interaction.user);
                await discordBotKeyvs.setValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderMentionUsers, mentionUsers);
                const embed = getReplyEmbed(__t("bot/bumpReminder/setRemind"), ReplyEmbedType.Success);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                logger.info(__t("log/bot/bumpReminder/setRemind", { guild: message.guildId!, user: interaction.user.toString() }));
                break;
            }
            case "doNotRemind": {
                const mentionUsers = await discordBotKeyvs.getValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderMentionUsers) as Array<User> || new Array<User>();
                if (mentionUsers.some(user => user.id === interaction.user.id)) {
                    const newMentionUsers = mentionUsers.filter(user => user.id !== interaction.user.id);
                    await discordBotKeyvs.setValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderMentionUsers, newMentionUsers);
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
        const rmdBumpDate = await discordBotKeyvs.getValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderRmdDate) as number | undefined;
        if (!rmdBumpDate) return;
        if (rmdBumpDate <= Date.now()) {
            clearInterval(timerId);
            const mentionRole = await discordBotKeyvs.getValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderMentionRole) as Role | undefined;
            const mentionRoleText = await (async () => {
                if (!mentionRole) return "";
                const role = await message.guild?.roles.fetch(mentionRole.id);
                return role?.toString() || "";
            })();
            const mentionUsersText = await (async () => {
                const mentionUsers = await discordBotKeyvs.getValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderMentionUsers) as Array<User> | undefined;
                if (!mentionUsers) return "";
                return await Promise.all(mentionUsers.map(async user => {
                    const member = await bumpReminderMessage.guild?.members.fetch(user.id);
                    return member?.toString() || "";
                })).then(members => members.toString());
            })();
            await discordBotKeyvs.deleteValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderRmdDate);
            await discordBotKeyvs.deleteValue(message.guildId!, DiscordBotKeyvKeys.BumpReminderMentionUsers);
            if (!mentionRoleText && !mentionUsersText) return;
            bumpReminderMessage.reply(__t("bot/bumpReminder/remindMessage", { mentionRole: mentionRoleText, mentionUsers: mentionUsersText }));
            logger.info(__t("log/bot/bumpReminder/remind", { guild: message.guildId! }));
        }
    }, 1000)
};

export default messageCreateEvent;