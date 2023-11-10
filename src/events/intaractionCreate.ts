import { Events, Interaction } from "discord.js";
import keyvs, { KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";
import { GetReplyEmbed, ReplyEmbedType } from "../services/utility";
import { BotEvent, Command } from "../types";

export const interactionCreateEvent: BotEvent = {
    name: Events.InteractionCreate,
    execute: (interaction: Interaction) => {
        interaction.isAnySelectMenu()
        if (interaction.isChatInputCommand()) {
            const command: Command = interaction.client.commands.get(interaction.commandName);
            const cooldown: number = interaction.client.cooldowns.get(`${interaction.commandName}-${interaction.user.username}`);
            if (!command) {
                logger.error(__t("bot/command/notFound", { command: interaction.commandName }));
                return;
            }
            if (command.cooldown && cooldown) {
                if (Date.now() < cooldown) {
                    const cooldownTime = Math.floor(Math.abs(Date.now() - cooldown) / 1000);
                    interaction.reply(__t("bot/command/cooldown", { cooldown: cooldownTime.toString() }));
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
                    logger.info(__t("bot/command/execute/success", { command: interaction.commandName, guild: interaction.guildId! }));
                }).catch((error: Error) => {
                    const errorDescMsg = error.message || "unknown error";
                    const replyMsg = __t("bot/command/execute/faild", { command: interaction.commandName, guild: interaction.guildId!, error: errorDescMsg });
                    const embed = GetReplyEmbed(replyMsg, ReplyEmbedType.Error);
                    interaction.reply({ embeds: [embed] });
                    const errorDescLog = error.stack || error.message || "unknown error";
                    const logMsg = __t("bot/command/execute/faild", { command: interaction.commandName, guild: interaction.guildId!, error: errorDescLog });
                    logger.error(logMsg);
                    interaction
                    if (error instanceof KeyvsError) {
                        keyvs.setkeyv(interaction.guildId!);
                        logger.info(__t("keyvs/reset", { namespace: interaction.guildId! }));
                        const embed = GetReplyEmbed(__t("bot/config/reset", { namespace: interaction.guildId! }), ReplyEmbedType.Info);
                        interaction.channel?.send({ embeds: [embed] });
                    }
                });
        } else if (interaction.isAutocomplete()) {
            const command: Command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                logger.error(__t("bot/command/notFound", { command: interaction.commandName }));
                return;
            }
            if (!command.autocomplete) {
                logger.error(__t("bot/command/autocomplete/undefined", { command: interaction.commandName }));
                return;
            }
            command.autocomplete(interaction)
                .then(() => {
                    logger.info(__t("bot/command/autocomplete/success", { command: interaction.commandName, guild: interaction.guildId! }));
                }).catch((error: Error) => {
                    const errorDesc = error.stack || error.message || "unknown error";
                    logger.error(__t("bot/command/autocomplete/faild", { command: interaction.commandName, guild: interaction.guildId!, error: errorDesc }));
                });
        } else if (interaction.isModalSubmit()) {
            const command: Command = interaction.client.commands.get(interaction.customId);
            if (!command) {
                logger.error(__t("bot/command/notFound", { command: interaction.customId }));
                return;
            }
            if (!command.modal) {
                logger.error(__t("bot/command/modal/undefined", { command: interaction.customId }));
                return;
            }
            command.modal(interaction)
                .then(() => {
                    logger.info(__t("bot/command/modal/success", { command: interaction.customId, guild: interaction.guildId! }));
                }).catch((error: Error) => {
                    const errorDesc = error.stack || error.message || "unknown error";
                    logger.error(__t("bot/command/modal/faild", { command: interaction.customId, guild: interaction.guildId!, error: errorDesc }));
                });
        }
    }
}

export default interactionCreateEvent;
