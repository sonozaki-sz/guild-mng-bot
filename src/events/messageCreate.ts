import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, DiscordAPIError, Events, Message, RESTJSONErrorCodes } from "discord.js";
import { debounce } from "lodash";
import { BotEvent, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
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
                    discordBotKeyvs.keyvs.setkeyv(message.guildId!);
                    logger.info(__t("log/keyvs/reset", { namespace: message.guildId! }));
                }
            });

        await debouncedExecuteStickMessage(message)?.catch((error: Error) => {
            const errorDesc = error.stack || error.message || "unknown error";
            logger.error(__t("log/bot/stickMessage/error", { guild: message.guildId!, channel: message.channelId, error: errorDesc }));
            if (error instanceof KeyvsError) {
                discordBotKeyvs.keyvs.setkeyv(message.guildId!);
                logger.info(__t("log/keyvs/reset", { namespace: message.guildId! }));
            }
        });
    }
};

const disboardUserId = "302050872383242240";
const bumpCommandName = "bump";

const executeBumpReminder = async (message: Message) => {
    const isBumpReminderEnabled = await discordBotKeyvs.getIsBumpReminderEnabled(message.guildId!);
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
    await discordBotKeyvs.setBumpReminderRemindDate(message.guildId!, twoHoursLaterMSec);
    collector.on("collect", async (interaction) => {
        switch (interaction.customId) {
            case "doRemind": {
                const mentionUserIds = await discordBotKeyvs.getBumpReminderMentionUserIds(message.guildId!);
                if (!mentionUserIds?.length) return;
                if (mentionUserIds.some(userId => userId === interaction.user.id)) {
                    const embed = getReplyEmbed(__t("bot/bumpReminder/alreadySetRemind"), ReplyEmbedType.Warn);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                mentionUserIds.push(interaction.user.id);
                await discordBotKeyvs.setBumpReminderMentionUserIds(message.guildId!, mentionUserIds);
                const embed = getReplyEmbed(__t("bot/bumpReminder/setRemind"), ReplyEmbedType.Success);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                logger.info(__t("log/bot/bumpReminder/setRemind", { guild: message.guildId!, user: interaction.user.toString() }));
                break;
            }
            case "doNotRemind": {
                const mentionUserIds = await discordBotKeyvs.getBumpReminderMentionUserIds(message.guildId!);
                if (mentionUserIds?.some(userId => userId === interaction.user.id)) {
                    const newMentionUserIds = mentionUserIds.filter(userId => userId !== interaction.user.id);
                    await discordBotKeyvs.setBumpReminderMentionUserIds(message.guildId!, newMentionUserIds);
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
        const rmdBumpDate = await discordBotKeyvs.getBumpReminderRemindDate(message.guildId!);
        if (!rmdBumpDate) return;
        if (rmdBumpDate <= Date.now()) {
            clearInterval(timerId);
            const mentionRoleId = await discordBotKeyvs.getBumpReminderMentionRoleId(message.guildId!);
            const mentionRoleText = await (async () => {
                if (!mentionRoleId) return "";
                const role = await message.guild?.roles.fetch(mentionRoleId);
                return role?.toString() || "";
            })();
            const mentionUsersText = await (async () => {
                const mentionUserIds = await discordBotKeyvs.getBumpReminderMentionUserIds(message.guildId!);
                if (!mentionUserIds) return "";
                return await Promise.all(mentionUserIds.map(async userId => {
                    const member = await bumpReminderMessage.guild?.members.fetch(userId);
                    return member?.toString() || "";
                })).then(members => members.toString());
            })();
            await discordBotKeyvs.deleteBumpReminderRemindDate(message.guildId!);
            await discordBotKeyvs.deleteBumpReminderMentionUserIds(message.guildId!);
            if (!mentionRoleText && !mentionUsersText) return;
            bumpReminderMessage.reply(__t("bot/bumpReminder/remindMessage", { mentionRole: mentionRoleText, mentionUsers: mentionUsersText }));
            logger.info(__t("log/bot/bumpReminder/remind", { guild: message.guildId! }));
        }
    }, 1000)
};

const executeStickMessage = async (message: Message) => {
    const stickedMessageIds = await discordBotKeyvs.getStickedMessageIds(message.guildId!);
    if (!stickedMessageIds?.has(message.channel.id)) return;
    const stickedMessageId = stickedMessageIds.get(message.channel.id);
    if (stickedMessageId === message.id) return;
    const stickedMessage = await message.channel.messages.fetch(stickedMessageId!)
        .catch(async (error: DiscordAPIError) => {
            if (error.code === RESTJSONErrorCodes.UnknownMessage) return undefined;
            throw error;
        });
    if (!stickedMessage) return;
    await stickedMessage.delete()
        .catch(async (error: DiscordAPIError) => {
            if (error.code === RESTJSONErrorCodes.UnknownMessage) return;
            throw error;
        });
    stickedMessageIds.delete(message.channel.id);
    const content = stickedMessage.content;
    const embeds = stickedMessage.embeds;
    const newStickMessage = await message.channel.send({ content, embeds });
    stickedMessageIds.set(message.channel.id, newStickMessage.id);
    await discordBotKeyvs.setStickedMessageIds(message.guildId!, stickedMessageIds);
    logger.info(__t("log/bot/stickMessage/execute", { guild: message.guildId!, channel: message.channel.id }));
};

const debouncedExecuteStickMessage = debounce(executeStickMessage, 3_000);

export default messageCreateEvent;