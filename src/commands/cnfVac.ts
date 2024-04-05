import { ChannelType, ChatInputCommandInteraction, Colors, DiscordAPIError, EmbedBuilder, GuildChannel, PermissionFlagsBits, RESTJSONErrorCodes, SlashCommandBuilder } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { DiscordBotKeyvKeys, discordBotKeyvs } from "../services/discordBot";
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
    const isVacEnabled = await discordBotKeyvs.getValue(interaction.guildId!, DiscordBotKeyvKeys.IsVacEnabled) as boolean | undefined;
    if (isVacEnabled) {
        const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/alreadyStarting"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    const triggerVc = await interaction.guild?.channels.create({
        name: "CreateVC",
        type: ChannelType.GuildVoice,
        parent: (interaction.channel as GuildChannel).parent,
    })
    if (!triggerVc) {
        const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/faild", { error: __t("bot/command/cnf-vac/start/createTriggerVcFaild") }), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    };
    try {
        let array = [];
        await discordBotKeyvs.setValue(interaction.guildId!, DiscordBotKeyvKeys.VacTriggerVcId, triggerVc.id)
        await discordBotKeyvs.setValue(interaction.guildId!, DiscordBotKeyvKeys.IsVacEnabled, true);
        await discordBotKeyvs.setValue(interaction.guildId!, DiscordBotKeyvKeys.VacChannelIds, <string[]>[]);
    } catch (error) {
        triggerVc.delete();
    }
    const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/vcAutoCreation/start", { guild: interaction.guildId! }));
};

const excuteStop = async (interaction: ChatInputCommandInteraction) => {
    const isVacEnabled = await discordBotKeyvs.getValue(interaction.guildId!, DiscordBotKeyvKeys.IsVacEnabled) as boolean | undefined;
    if (!isVacEnabled) {
        const embed = getReplyEmbed(__t("bot/command/cnf-vac/stop/alreadyStoping"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    const triggerVcId = await discordBotKeyvs.getValue(interaction.guildId!, DiscordBotKeyvKeys.VacTriggerVcId) as string | undefined;
    if (triggerVcId) {
        const fetchedTriggerVc = await interaction.guild?.channels.fetch(triggerVcId)
            .catch((reason: DiscordAPIError) => {
                if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                    return undefined;
                }
                throw reason;
            });
        if (fetchedTriggerVc) fetchedTriggerVc.delete();
        await discordBotKeyvs.deleteValue(interaction.guildId!, DiscordBotKeyvKeys.VacTriggerVcId);
    }
    await discordBotKeyvs.setValue(interaction.guildId!, DiscordBotKeyvKeys.IsVacEnabled, false);
    const embed = getReplyEmbed(__t("bot/command/cnf-vac/stop/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/vcAutoCreation/stop", { guild: interaction.guildId! }));
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    const statusText = await (async () => {
        const isVacEnabled = await discordBotKeyvs.getValue(interaction.guildId!, DiscordBotKeyvKeys.IsVacEnabled) as boolean | undefined;
        return isVacEnabled ? __t("executing") : __t("stoping");
    })();
    const tiggerVcText = await (async () => {
        const triggerVcId = await discordBotKeyvs.getValue(interaction.guildId!, DiscordBotKeyvKeys.VacTriggerVcId) as string | undefined;
        if (triggerVcId) {
            const fetchedTriggerVc = await interaction.guild?.channels.fetch(triggerVcId)
                .catch((reason: DiscordAPIError) => {
                    if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                        return undefined;
                    }
                    throw reason;
                });
            if (fetchedTriggerVc) return fetchedTriggerVc.toString();
        }
        return __t("unset");
    })();
    const createdVcs = await (async () => {
        const createdVcIds = await discordBotKeyvs.getValue(interaction.guildId!, DiscordBotKeyvKeys.VacChannelIds) as string[] | undefined;
        if (createdVcIds?.length) {
            return await Promise.all(createdVcIds.map(async (vcId) => {
                const fetchedVc = await interaction.guild?.channels.fetch(vcId)
                    .catch((reason: DiscordAPIError) => {
                        if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                            return undefined;
                        }
                        throw reason;
                    });
                if (fetchedVc) return fetchedVc.toString();
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
            { name: __t("triggerVc"), value: tiggerVcText },
            { name: __t("createdVc"), value: createdVcs },
        );
    return statusEmbed;
};

const excuteStatus = async (interaction: ChatInputCommandInteraction) => {
    const replyEmbed = getReplyEmbed(__t("bot/command/getStatus/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [replyEmbed] });
    const statusEmbed = await getStatusEmbed(interaction);
    await interaction.followUp({ embeds: [statusEmbed] });
};

export default cnfVacCommand;