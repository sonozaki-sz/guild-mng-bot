import { ChannelType, ChatInputCommandInteraction, Collection, Colors, DiscordAPIError, EmbedBuilder, GuildChannel, PermissionFlagsBits, RESTJSONErrorCodes, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import { discordBotKeyvs } from "../services/discordBotKeyvs";
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
                await excuteStart(interaction);
                break;
            }
            case "stop": {
                await excuteStop(interaction);
                break;
            }
            case "status": {
                await excuteStatus(interaction);
                break;
            }
        }
    }
};

const refreshVac = async (interaction: ChatInputCommandInteraction) => {
    // 保存されているトリガーチャンネルが存在しない場合は削除する
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(interaction.guildId!);
    if (vacTriggerVcIds?.length) {
        const fetchedTriggerVcIds = <string[]>[];
        for (const vacTriggerVcId of vacTriggerVcIds) {
            const fetchedTriggerVc = await interaction.guild?.channels.fetch(vacTriggerVcId)
                .catch((reason: DiscordAPIError) => {
                    if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                        return undefined;
                    }
                    throw reason;
                });
            if (fetchedTriggerVc) {
                fetchedTriggerVcIds.push(fetchedTriggerVc.id);
            }
        }
        await discordBotKeyvs.setVacTriggerVcIds(interaction.guildId!, fetchedTriggerVcIds);
    }

    // 保存されている作成済みVCが存在しない場合は削除する
    const vacChannelIds = await discordBotKeyvs.getVacChannelIds(interaction.guildId!);
    if (vacChannelIds?.length) {
        const fetchedChannelIds = <string[]>[];
        for (const vacChannelId of vacChannelIds) {
            const fetchedChannel = await interaction.guild?.channels.fetch(vacChannelId)
                .catch((reason: DiscordAPIError) => {
                    if (reason.code === RESTJSONErrorCodes.UnknownChannel) {
                        return undefined;
                    }
                    throw reason;
                });
            if (fetchedChannel) {
                fetchedChannelIds.push(fetchedChannel.id);
            }
        }
        await discordBotKeyvs.setVacChannelIds(interaction.guildId!, fetchedChannelIds);
    }
};

const excuteStart = async (interaction: ChatInputCommandInteraction) => {
    await refreshVac(interaction);
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(interaction.guildId!) || <string[]>[];
    if (vacTriggerVcIds?.length) {
        const channels = await interaction.guild?.channels.fetch();
        if (!channels) return;
        const childTriggerVc = channels.filter(channel => {
            return channel !== null
                && channel.type === ChannelType.GuildVoice
                && channel.parentId === (interaction.channel as GuildChannel).parentId
                && vacTriggerVcIds.some(triggerVcId => triggerVcId === channel.id)
        }) as Collection<string, VoiceChannel>;
        if (childTriggerVc.size) {
            const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/alreadyStarting"), ReplyEmbedType.Warn);
            interaction.reply({ embeds: [embed] });
            return;
        }
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
        vacTriggerVcIds.push(triggerVc.id);
        await discordBotKeyvs.setVacTriggerVcIds(interaction.guildId!, vacTriggerVcIds)
        await discordBotKeyvs.deleteVacChannelIds(interaction.guildId!);
    } catch (error: any) {
        await triggerVc.delete();
        throw error;
    }
    const embed = getReplyEmbed(__t("bot/command/cnf-vac/start/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
    logger.info(__t("log/bot/vcAutoCreation/createTriggerChannel", { guild: interaction.guildId!, channel: triggerVc.id }));
};

const excuteStop = async (interaction: ChatInputCommandInteraction) => {
    await refreshVac(interaction);
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(interaction.guildId!);
    const replyAlreadyStopping = async () => {
        const embed = getReplyEmbed(__t("bot/command/cnf-vac/stop/notStarted"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    if (!vacTriggerVcIds?.length) {
        await replyAlreadyStopping();
        return;
    }
    const childTriggerVc = (await interaction.guild?.channels.fetch())?.filter(channel => {
        return channel !== null
            && channel.type === ChannelType.GuildVoice
            && channel.parentId === (interaction.channel as GuildChannel).parentId
            && vacTriggerVcIds.some(triggerVcId => triggerVcId === channel.id)
    }) as Collection<string, VoiceChannel>;
    if (!childTriggerVc.size) {
        await replyAlreadyStopping();
        return;
    } else {
        childTriggerVc.forEach(async (vc) => {
            await vc.delete();
            vacTriggerVcIds.splice(vacTriggerVcIds.indexOf(vc.id), 1);
            await discordBotKeyvs.setVacTriggerVcIds(interaction.guildId!, vacTriggerVcIds);
            logger.info(__t("log/bot/vcAutoCreation/deleteTriggerChannel", { guild: interaction.guildId!, channel: vc.id }));
        });
    }
    const embed = getReplyEmbed(__t("bot/command/cnf-vac/stop/success"), ReplyEmbedType.Success);
    await interaction.reply({ embeds: [embed] });
};

export const getStatusEmbed = async (interaction: ChatInputCommandInteraction) => {
    await refreshVac(interaction);
    const vacTriggerVcIds = await discordBotKeyvs.getVacTriggerVcIds(interaction.guildId!);
    const statusText = vacTriggerVcIds?.length ? __t("executing") : __t("stopping");
    const tiggerVcText = await (async () => {
        if (!vacTriggerVcIds?.length) return __t("notting");
        return await Promise.all(vacTriggerVcIds.map(async (vcId) => {
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
    })();
    const createdVcs = await (async () => {
        const createdVcIds = await discordBotKeyvs.getVacChannelIds(interaction.guildId!);
        if (!createdVcIds?.length) return __t("notting");
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
    })();
    const statusEmbed = new EmbedBuilder()
        .setTitle(__t("bot/vcAutoCreation"))
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