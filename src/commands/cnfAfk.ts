import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, ReplyEmbedType, getReplyEmbed } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";

export const cnfAfkCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("cnf-afk")
        .setDescription(__t("bot/command/cnf-afk/description"))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName("set-dest")
                .setDescription(__t("bot/command/cnf-afk/set-dest/description"))
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(__t("bot/command/cnf-afk/set-dest/channelOption/description"))
                        .addChannelTypes(ChannelType.GuildVoice)
                        .setRequired(true)
                )
        ).addSubcommand(subcommand =>
            subcommand
                .setName("get-dest")
                .setDescription(__t("bot/command/cnf-afk/get-dest/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "set-dest": {
                const channel = interaction.options.getChannel("channel") as VoiceChannel;
                await keyvs.setValue(interaction.guildId!, KeyvKeys.DestAfkVC, channel)
                const embed = getReplyEmbed(__t("bot/command/cnf-afk/set-dest/success", { channel: channel.toString() }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
            case "get-dest": {
                const afkChannel = await keyvs.getValue(interaction.guildId!, KeyvKeys.DestAfkVC) as VoiceChannel | undefined;
                if (!afkChannel) {
                    const embed = getReplyEmbed(__t("bot/command/unsetDestAfk"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const channel = await interaction.guild?.channels.fetch(afkChannel.id);
                if (!channel) {
                    const embed = getReplyEmbed(__t("bot/command/notFoundDestAfk"), ReplyEmbedType.Warn);
                    interaction.reply({ embeds: [embed] });
                    return;
                }
                const embed = getReplyEmbed(__t("bot/command/cnf-afk/get-dest/success", { channel: channel.toString() }), ReplyEmbedType.Success);
                interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};

export default cnfAfkCommand;