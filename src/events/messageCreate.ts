import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Events, Message, Role } from "discord.js";
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
    const isBumpReminderEnabled: boolean | undefined = await keyvs.getValue(message.guildId!, KeyvKeys.IsBumpReminderEnabled);
    if (!isBumpReminderEnabled) return;
    if (message.author.id !== disboardUserID) return;
    if (message.interaction?.commandName !== bumpCommandName) return;
    logger.info(__t("log/bot/bumpReminder/detectBump", { guild: message.guildId! }));
    const twoHoursLaterMSec = message.createdTimestamp + 2 * 60 * 60 * 1000;
    const twoHoursLaterSec = Math.floor(twoHoursLaterMSec / 1000);
    const embedDesc = __t("bot/bumpReminder/bumpMessage", { time: `<t:${twoHoursLaterSec}:T>`, diffCurTime: `<t:${twoHoursLaterSec}:R>` });
    const embed = getReplyEmbed(embedDesc, ReplyEmbedType.Info);
    const actionRow = new ActionRowBuilder<ButtonBuilder>({
        components: [
            {
                type: ComponentType.Button,
                style: ButtonStyle.Primary,
                customId: "doRemind",
                label: __t("bot/bumpReminder/button/doRemind"),
                emoji: "🔔",
            },
            {
                type: ComponentType.Button,
                style: ButtonStyle.Danger,
                customId: "doNotRemind",
                label: __t("bot/bumpReminder/button/doNotRemind"),
                emoji: "🔕",
            }
        ]
    });
    const bumpReminderMessage = await message.channel.send({ embeds: [embed], components: [actionRow] });
    const collector = bumpReminderMessage.createMessageComponentCollector({ time: 60_000 });
    collector.on("collect", async (interaction) => {
        collector.stop("buttonClicked");
        switch (interaction.customId) {
            case "doRemind": {
                const embed = getReplyEmbed(__t("bot/bumpReminder/setRemind"), ReplyEmbedType.Info);
                await bumpReminderMessage.reply({ embeds: [embed] });
                logger.info(__t("log/bot/bumpReminder/setRemind", { guild: message.guildId! }));
                setTimeout(async () => {
                    const mentionRole: Role | undefined = await keyvs.getValue(message.guildId!, KeyvKeys.BumpReminderMentionRole);
                    const mentionRoleText = await (async () => {
                        if (!mentionRole) return "";
                        const role = await interaction.guild?.roles.fetch(mentionRole.id);
                        return role?.toString() || "";
                    })();
                    const user = interaction.user.toString();
                    bumpReminderMessage.reply(__t("bot/bumpReminder/remindMessage", { mentionRole: mentionRoleText, user: user }));
                    logger.info(__t("log/bot/bumpReminder/remind", { guild: message.guildId! }));
                }, 2 * 60 * 60 * 1000);
                break;
            }
            case "doNotRemind": {
                const embed = getReplyEmbed(__t("bot/bumpReminder/cancelRemind"), ReplyEmbedType.Info);
                bumpReminderMessage.reply({ embeds: [embed] });
                logger.info(__t("log/bot/bumpReminder/cancelRemind", { guild: message.guildId! }));
                break;
            }
        }
    });
    collector.once("end", async (interactions, reason) => {
        bumpReminderMessage.edit({ components: [] });
        if (reason === "time") {
            const embed = getReplyEmbed(__t("bot/bumpReminder/cancelRemind"), ReplyEmbedType.Info);
            bumpReminderMessage.reply({ embeds: [embed] });
            logger.info(__t("log/bot/bumpReminder/cancelRemind", { guild: message.guildId! }));
        }
    });
};

export default messageCreateEvent;