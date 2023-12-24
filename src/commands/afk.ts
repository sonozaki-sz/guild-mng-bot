import { ChatInputCommandInteraction, DiscordAPIError, SlashCommandBuilder, VoiceChannel } from "discord.js";
import "../services/discord";
import { BotKeyvKeys, Command, ReplyEmbedType, botKeyvs, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";

export const afkCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription(__t("bot/command/afk/description"))
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(__t("bot/command/afk/userOption/description"))
                .setRequired(true)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser("user")!;
        const member = await interaction.guild?.members.fetch(user.id);
        if (!member) {
            const embed = getReplyEmbed(__t("bot/command/notFoundUser", { user: user.toString() }), ReplyEmbedType.Warn);
            await interaction.reply({ embeds: [embed] });
            return;
        }
        const afkChannel = await botKeyvs.getValue(interaction.guildId!, BotKeyvKeys.DestAfkVc) as VoiceChannel | undefined;
        if (!afkChannel) {
            const embed = getReplyEmbed(__t("bot/command/unsetDestAfk"), ReplyEmbedType.Warn);
            await interaction.reply({ embeds: [embed] });
            return;
        }
        const fetchedAfkChannel = await interaction.guild?.channels.fetch(afkChannel.id)
            .catch((reason: DiscordAPIError) => {
                if (reason.code === 10003) {
                    return undefined;
                }
                throw reason;
            });
        if (!fetchedAfkChannel) {
            const embed = getReplyEmbed(__t("bot/command/notFoundDestAfk"), ReplyEmbedType.Warn);
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (fetchedAfkChannel.id === member.voice.channel?.id) {
            const embed = getReplyEmbed(__t("bot/command/afk/alreadyAfk", { user: member.toString(), channel: fetchedAfkChannel.toString() }), ReplyEmbedType.Warn);
            await interaction.reply({ embeds: [embed] });
            return;
        }
        member.voice.setChannel(fetchedAfkChannel.id)
            .then(async () => {
                const embed = getReplyEmbed(__t("bot/command/afk/success", { user: member.toString(), channel: fetchedAfkChannel.toString() }), ReplyEmbedType.Success);
                await interaction.reply({ embeds: [embed] });
            }).catch(async (error) => {
                const embed = getReplyEmbed(__t("bot/command/afk/faild", { user: member.toString(), error: error.toString() }), ReplyEmbedType.Warn);
                await interaction.reply({ embeds: [embed] });
            });
    }
};

export default afkCommand;
