import { ChannelType, ChatInputCommandInteraction, DiscordAPIError, GuildChannel, PermissionFlagsBits, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const cnfVacCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-vac")
        .setDescription(__t("bot/command/vac/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription(__t("bot/command/vac/start/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription(__t("bot/command/vac/stop/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(__t("bot/command/vac/status/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "start": {
                const isVacEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled) as boolean | undefined;
                if (isVacEnabled) {
                    const embed = getReplyEmbed(__t("bot/command/vac/start/alreadyStarting"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const triggerVC = await interaction.guild?.channels.create({
                    name: "CreateVC",
                    type: ChannelType.GuildVoice,
                    parent: (interaction.channel as GuildChannel).parent,
                })
                if (!triggerVC) {
                    const embed = getReplyEmbed(__t("bot/command/vac/start/faild", { error: __t("bot/command/vac/start/createTriggerVCFaild") }), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                };
                try {
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.VacTriggerVC, triggerVC)
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsVacEnabled, true);
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.VacChannels, new Array<VoiceChannel>());
                } catch (error) {
                    triggerVC.delete();
                }
                const embed = getReplyEmbed(__t("bot/command/vac/start/success"), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                logger.info(__t("log/bot/vcAutoCreation/start", { guild: interaction.guildId! }));
                break;
            }
            case "stop": {
                const isVacEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled) as boolean | undefined;
                if (!isVacEnabled) {
                    const embed = getReplyEmbed(__t("bot/command/vac/stop/alreadyStoping"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const triggerVC = await keyvs.getValue(interaction.guildId!, KeyvKeys.VacTriggerVC) as VoiceChannel | undefined;
                if (triggerVC) {
                    const fetchedTriggerVC = await interaction.guild?.channels.fetch(triggerVC.id)
                        .catch((reason: DiscordAPIError) => {
                            if (reason.code === 10003) {
                                return undefined;
                            }
                            throw reason;
                        });
                    if (fetchedTriggerVC) fetchedTriggerVC.delete();
                    await keyvs.deleteValue(interaction.guildId!, KeyvKeys.VacTriggerVC);
                }
                await keyvs.setValue(interaction.guildId!, KeyvKeys.IsVacEnabled, false);
                const embed = getReplyEmbed(__t("bot/command/vac/stop/success"), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                logger.info(__t("log/bot/vcAutoCreation/stop", { guild: interaction.guildId! }));
                break;
            }
            case "status": {
                const isVacEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled) as boolean | undefined;
                const statusText = isVacEnabled ? __t("executing") : __t("stoping");
                const embed = getReplyEmbed(__t("bot/command/vac/status/success", { status: statusText }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};

export default cnfVacCommand;