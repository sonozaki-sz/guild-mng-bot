import { ChannelType, ChatInputCommandInteraction, GuildChannel, PermissionFlagsBits, SlashCommandBuilder, VoiceChannel } from "discord.js";
import keyvs, { KeyvKeys, KeyvsError } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";
import { GetReplyEmbed, ReplyEmbedType } from "../services/utility";
import { Command } from "../types";

export const vcAutoCreationCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("vac")
        .setDescription(__t("bot/command/vac/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription(__t("bot/command/vac/start/description"))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription(__t("bot/command/vac/stop/description"))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(__t("bot/command/vac/status/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "start": {
                const isValidVac: boolean = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsValidVac)
                    .catch(error => {
                        throw new KeyvsError(error)
                    });
                if (isValidVac) {
                    const embed = GetReplyEmbed(__t("bot/command/vac/start/alreadyStarting"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const triggerVC = await interaction.guild?.channels.create({
                    name: "CreateVC",
                    type: ChannelType.GuildVoice,
                    parent: (interaction.channel as GuildChannel).parent,
                })
                if (!triggerVC) {
                    const embed = GetReplyEmbed(__t("bot/command/vac/start/faild", { error: __t("bot/command/vac/start/createTriggerVCFaild") }), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                };
                try {
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.VacTriggerVC, triggerVC)
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsValidVac, true);
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.VacChannels, new Array<VoiceChannel>());
                } catch (error: any) {
                    triggerVC.delete();
                    throw new KeyvsError(error);
                }
                const embed = GetReplyEmbed(__t("bot/command/vac/start/success"), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                logger.info(__t("bot/vcAutoCreation/start", { guild: interaction.guildId! }));
                break;
            }
            case "stop": {
                const isValidVac: boolean = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsValidVac)
                    .catch(error => {
                        throw new KeyvsError(error);
                    });
                if (!isValidVac) {
                    const embed = GetReplyEmbed(__t("bot/command/vac/stop/alreadyStoping"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const triggerChannel: VoiceChannel = await keyvs.getValue(interaction.guildId!, KeyvKeys.VacTriggerVC)
                    .catch(error => {
                        throw new KeyvsError(error);
                    });
                const channel = interaction.guild?.channels.cache.find(channel => channel.id === triggerChannel.id);
                channel?.delete();
                try {
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsValidVac, false);
                    await keyvs.deleteValue(interaction.guildId!, KeyvKeys.VacTriggerVC)
                } catch (error: any) {
                    throw new KeyvsError(error);
                }
                const embed = GetReplyEmbed(__t("bot/command/vac/stop/success"), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                logger.info(__t("bot/vcAutoCreation/stop", { guild: interaction.guildId! }));
                break;
            }
            case "status": {
                const isValidVac: boolean = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsValidVac)
                    .catch(error => {
                        throw new KeyvsError(error);
                    });
                const statusText = isValidVac ? __t("executing") : __t("stoping");
                const embed = GetReplyEmbed(__t("bot/command/vac/status/success", { status: statusText }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
}

export default vcAutoCreationCommand;