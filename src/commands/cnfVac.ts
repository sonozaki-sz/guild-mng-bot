import { ChannelType, ChatInputCommandInteraction, Colors, DiscordAPIError, EmbedBuilder, GuildChannel, PermissionFlagsBits, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";
import { logger } from "../services/logger";

export const cnfVacCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-vac")
        .setDescription(__t("bot/command/cnf-vac/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription(__t("bot/command/cnf-vac/start/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("stop")
                .setDescription(__t("bot/command/cnf-vac/stop/description"))
        ).addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription(__t("bot/command/cnf-vac/status/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "start": {
                excuteStart(interaction);
                break;
            }
            case "stop": {
                excuteStop(interaction);
                break;
            }
            case "status": {
                excuteStatus(interaction);
                break;
            }
        }
    }
};

const excuteStart = async (interaction: ChatInputCommandInteraction) => {
    const isVacEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled) as boolean | undefined;
    if (isVacEnabled) {
        const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/alreadyStarting"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    const triggerVC = await interaction.guild?.channels.create({
        name: "CreateVC",
        type: ChannelType.GuildVoice,
        parent: (interaction.channel as GuildChannel).parent,
    })
    if (!triggerVC) {
        const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/faild", { error: __t("bot/command/cnf-vac/start/createTriggerVCFaild") }), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    };
    try {
        await keyvs.setValue(interaction.guildId!, KeyvKeys.VacTriggerVC, triggerVC)
        await keyvs.setValue(interaction.guildId!, KeyvKeys.IsVacEnabled, true);
        await keyvs.setValue(interaction.guildId!, KeyvKeys.VacChannels, new Array<VoiceChannel>());
    } catch (error) {
        triggerVC.delete();
    }
    const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/vcAutoCreation/start", { guild: interaction.guildId! }));
};

const excuteStop = async (interaction: ChatInputCommandInteraction) => {
    const isVacEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled) as boolean | undefined;
    if (!isVacEnabled) {
        const embed = getReplyEmbed(__t("bot/command/cnf-vac/stop/alreadyStoping"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
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
    const embed = getReplyEmbed(__t("bot/command/cnf-vac/stop/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/vcAutoCreation/stop", { guild: interaction.guildId! }));
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    const statusText = await (async () => {
        const isVacEnabled = await keyvs.getValue(interaction.guildId!, KeyvKeys.IsVacEnabled) as boolean | undefined;
        return isVacEnabled ? __t("executing") : __t("stoping");
    })();
    const tiggerVcText = await (async () => {
        const triggerVC = await keyvs.getValue(interaction.guildId!, KeyvKeys.VacTriggerVC) as VoiceChannel | undefined;
        if (triggerVC) {
            const fetchedTriggerVC = await interaction.guild?.channels.fetch(triggerVC.id)
                .catch((reason: DiscordAPIError) => {
                    if (reason.code === 10003) {
                        return undefined;
                    }
                    throw reason;
                });
            if (fetchedTriggerVC) return fetchedTriggerVC.toString();
        }
        return __t("unset");
    })();
    const createdVCs = await (async () => {
        const createdVCs = await keyvs.getValue(interaction.guildId!, KeyvKeys.VacChannels) as Array<VoiceChannel> | undefined;
        if (createdVCs?.length) {
            return await Promise.all(createdVCs.map(async (vc) => {
                const fetchedVC = await interaction.guild?.channels.fetch(vc.id)
                    .catch((reason: DiscordAPIError) => {
                        if (reason.code === 10003) {
                            return undefined;
                        }
                        throw reason;
                    });
                if (fetchedVC) return fetchedVC.toString();
                return __t("notting");
            })).then(vcs => vcs.toString());
        }
        return __t("notting");
    })();
    const statusEmbed = new EmbedBuilder()
        .setTitle(__t("bot/vac"))
        .setColor(Colors.Blue)
        .setFields(
            { name: __t("status"), value: statusText },
            { name: __t("triggerVC"), value: tiggerVcText },
            { name: __t("createdVC"), value: createdVCs },
        );
    return statusEmbed;
};

const excuteStatus = async (interaction: ChatInputCommandInteraction) => {
    const replyEmbed = getReplyEmbed(__t("bot/command/getCnfStatus"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [replyEmbed] });
    const statusEmbed = await getStatusEmbed(interaction);
    await interaction.followUp({ embeds: [statusEmbed] });
};

export default cnfVacCommand;