import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";

export const cnfProfChannelCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-prof-ch")
        .setDescription(__t("bot/command/cnf-prof-ch/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName("set-ch")
                .setDescription(__t("bot/command/cnf-prof-ch/set-ch/description"))
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(__t("bot/command/cnf-prof-ch/set-ch/channelOption/description"))
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ).addSubcommand(subcommand =>
            subcommand
                .setName("get-ch")
                .setDescription(__t("bot/command/cnf-prof-ch/get-ch/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "set-ch": {
                const channel: TextChannel = interaction.options.getChannel("channel")!;
                keyvs.setValue(interaction.guildId!, KeyvKeys.ProfChannel, channel);
                const embed = getReplyEmbed(__t("bot/command/cnf-prof-ch/set-ch/success", { channel: channel.toString() }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
            case "get-ch": {
                const profChannel: TextChannel | undefined = await keyvs.getValue(interaction.guildId!, KeyvKeys.ProfChannel);
                if (!profChannel) {
                    const embed = getReplyEmbed(__t("bot/command/unsetProfChannel"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const channel = interaction.guild?.channels.cache.get(profChannel.id);
                if (!channel) {
                    const embed = getReplyEmbed(__t("bot/command/modal/faild"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const embed = getReplyEmbed(__t("bot/command/cnf-prof-ch/get-ch/success", { channel: channel.toString() }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};

export default cnfProfChannelCommand;