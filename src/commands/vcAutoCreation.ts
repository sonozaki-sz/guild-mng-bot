import { ChannelType, ChatInputCommandInteraction, GuildChannel, PermissionFlagsBits, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, GetReplyEmbed, ReplyEmbedType } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const vcAutoCreationCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("vac")
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
                const isVacEnabled: boolean | undefined = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled);
                if (isVacEnabled) {
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
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.IsVacEnabled, true);
                    await keyvs.setValue(interaction.guildId!, KeyvKeys.VacChannels, new Array<VoiceChannel>());
                } catch (error) {
                    triggerVC.delete();
                }
                const embed = GetReplyEmbed(__t("bot/command/vac/start/success"), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                logger.info(__t("bot/vcAutoCreation/start", { guild: interaction.guildId! }));
                break;
            }
            case "stop": {
                const isVacEnabled: boolean | undefined = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled);
                if (!isVacEnabled) {
                    const embed = GetReplyEmbed(__t("bot/command/vac/stop/alreadyStoping"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const triggerChannel: VoiceChannel | undefined = await keyvs.getValue(interaction.guildId!, KeyvKeys.VacTriggerVC);
                if (!triggerChannel) {

                }
                const embed = GetReplyEmbed(__t("bot/command/vac/stop/success"), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                logger.info(__t("bot/vcAutoCreation/stop", { guild: interaction.guildId! }));
                break;
            }
            case "status": {
                const isVacEnabled: boolean | undefined = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled);
                const statusText = isVacEnabled ? __t("executing") : __t("stoping");
                const embed = GetReplyEmbed(__t("bot/command/vac/status/success", { status: statusText }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};

export default vcAutoCreationCommand;