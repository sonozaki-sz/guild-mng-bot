import { Events, Interaction } from "discord.js";
import { BotEvent, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import keyvs, { KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const interactionCreateEvent: BotEvent = {
    name: Events.InteractionCreate,
    execute: async (interaction: Interaction) => {
        interaction.isAnySelectMenu()
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            const cooldown = interaction.client.cooldowns.get(`${interaction.commandName}-${interaction.user.username}`);
            if (!command) {
                logger.error(__t("log/bot/command/notFound", { command: interaction.commandName }));
                return;
            }
            if (command.cooldown && cooldown) {
                if (Date.now() < cooldown) {
                    const cooldownTime = Math.floor(Math.abs(Date.now() - cooldown) / 1000);
                    const embed = getReplyEmbed(__t("bot/command/cooldown", { cooldown: cooldownTime.toString() }), ReplyEmbedType.Error);
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    setTimeout(() => interaction.deleteReply(), 5000);
                    return;
                }
                interaction.client.cooldowns.set(`${interaction.commandName}-${interaction.user.username}`, Date.now() + command.cooldown * 1000);
                setTimeout(() => {
                    interaction.client.cooldowns.delete(`${interaction.commandName}-${interaction.user.username}`)
                }, command.cooldown * 1000);
            } else if (command.cooldown && !cooldown) {
                interaction.client.cooldowns.set(`${interaction.commandName}-${interaction.user.username}`, Date.now() + command.cooldown * 1000);
            }
            command.execute(interaction)
                .then(() => {
                    logger.info(__t("log/bot/command/execute/success", { command: interaction.commandName, guild: interaction.guildId! }));
                }).catch((error: Error) => {
                    const errorDescMsg = error.message || "unknown error";
                    const replyMsg = __t("log/bot/command/execute/faild", { command: interaction.commandName, guild: interaction.guildId!, error: errorDescMsg });
                    const embed = getReplyEmbed(replyMsg, ReplyEmbedType.Error);
                    interaction.reply({ embeds: [embed] });
                    const errorDescLog = error.stack || error.message || "unknown error";
                    const logMsg = __t("log/bot/command/execute/faild", { command: interaction.commandName, guild: interaction.guildId!, error: errorDescLog });
                    logger.error(logMsg);
                    interaction
                    if (error instanceof KeyvsError) {
                        keyvs.setkeyv(interaction.guildId!);
                        logger.info(__t("log/keyvs/reset", { namespace: interaction.guildId! }));
                        const embed = getReplyEmbed(__t("bot/config/reset", { namespace: interaction.guildId! }), ReplyEmbedType.Info);
                        interaction.channel?.send({ embeds: [embed] });
                    }
                });
        } else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                logger.error(__t("log/bot/command/notFound", { command: interaction.commandName }));
                return;
            }
            if (!command.autocomplete) {
                logger.error(__t("log/bot/command/autocomplete/undefined", { command: interaction.commandName }));
                return;
            }
            command.autocomplete(interaction)
                .then(() => {
                    logger.info(__t("log/bot/command/autocomplete/success", { command: interaction.commandName, guild: interaction.guildId! }));
                }).catch((error: Error) => {
                    const errorDesc = error.stack || error.message || "unknown error";
                    logger.error(__t("log/bot/command/autocomplete/faild", { command: interaction.commandName, guild: interaction.guildId!, error: errorDesc }));
                });
        } else if (interaction.isModalSubmit()) {
            const modal = interaction.client.modals.get(interaction.customId);
            if (!modal) {
                logger.error(__t("log/bot/command/modal/notFound", { modal: interaction.customId }));
                return;
            }
            modal.execute(interaction)
                .then(() => {
                    logger.info(__t("log/bot/command/modal/success", { modal: interaction.customId, guild: interaction.guildId! }));
                }).catch((error: Error) => {
                    const errorDesc = error.stack || error.message || "unknown error";
                    logger.error(__t("log/bot/command/modal/faild", { modal: interaction.customId, guild: interaction.guildId!, error: errorDesc }));
                });
        }
    }
};

export default interactionCreateEvent;
