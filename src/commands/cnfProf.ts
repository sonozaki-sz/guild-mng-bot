import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";
import { GetReplyEmbed, ReplyEmbedType } from "../services/utility";
import { Command } from "../types";

export const cnfProfChannelCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-prof")
        .setDescription(__t("bot/command/cnf-prof/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName("set-ch")
                .setDescription(__t("bot/command/cnf-prof/set-ch/description"))
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(__t("bot/command/cnf-prof/set-ch/channelOption/description"))
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("get-ch")
                .setDescription(__t("bot/command/cnf-prof/get-ch/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "set-ch": {
                const channel: TextChannel = interaction.options.getChannel("channel")!;
                keyvs.setValue(interaction.guildId!, KeyvKeys.ProfChannel, channel);
                const embed = GetReplyEmbed(__t("bot/command/cnf-prof/set-ch/success", { channel: channel.toString() }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
            case "get-ch": {
                const profChannel: TextChannel = await keyvs.getValue(interaction.guildId!, KeyvKeys.ProfChannel);
                if (!profChannel) {
                    const embed = GetReplyEmbed(__t("bot/command/unsetProfChannel"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const channel = interaction.guild?.channels.cache.get(profChannel.id);
                if (!channel) {
                    const embed = GetReplyEmbed(__t("bot/command/notFoundProfChannel"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const embed = GetReplyEmbed(__t("bot/command/cnf-prof/get-ch/success", { channel: channel.toString() }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};

export default cnfProfChannelCommand;