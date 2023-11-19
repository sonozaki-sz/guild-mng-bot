import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandSubcommandBuilder, TextChannel } from "discord.js";
import "../services/discord";
import { EmbedPage, GetReplyEmbed, ReplyEmbedType } from "../services/discord";
import keyvs, { KeyvKeys } from "../services/keyvs";
import { __t } from "../services/locale";
import { Command } from "../types/discord";

export const userInfocommand: Command = {
    data: new SlashCommandSubcommandBuilder()
        .setName("user-info")
        .setDescription(__t("bot/command/user-info/description"))
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(__t("bot/command/user-info/userOption/description"))
                .setRequired(true)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser("user")!;
        const member = interaction.guild!.members.cache.get(user.id);
        if (!member) {
            const embed = GetReplyEmbed(__t("bot/command/notFoundUser", { user: user.toString() }), ReplyEmbedType.Warn);
            interaction.reply({ embeds: [embed] });
            return;
        }

        await interaction.deferReply();
        const profText = await (async () => {
            const profChannel: TextChannel = await keyvs.getValue(interaction.guildId!, KeyvKeys.ProfChannel);
            if (!profChannel) {
                return __t("bot/command/unsetProfChannel");
            }
            const channel = interaction.guild?.channels.cache.get(profChannel.id);
            if (!channel?.isTextBased()) {
                return __t("bot/command/notFoundProfChannel");
            }
            const prof = await (async () => {
                let messageID = channel.lastMessageId || undefined;
                while (messageID) {
                    const messages = await channel.messages.fetch({ limit: 100, before: messageID });
                    const message = messages.find(message => message.author.id === member.id)?.content;
                    if (message) {
                        return message;
                    }
                    messageID = messages.last()?.id;
                };
            })();

            return prof || __t("blank");
        })();
        const replyEmbed = GetReplyEmbed(__t("bot/command/user-info/success"), ReplyEmbedType.Success);
        const userInfoEmbeds = new Array<EmbedBuilder>();
        userInfoEmbeds.push(
            new EmbedBuilder()
                .setTitle(member.user.tag)
                .setThumbnail(member.displayAvatarURL())
                .setColor(member.user.accentColor || member.displayColor)
                .addFields(
                    { name: __t("userID"), value: member.id, inline: true },
                    { name: __t("displayName"), value: member.user.displayName, inline: true },
                    { name: __t("nickname"), value: member.nickname || __t("unset"), inline: true },
                    { name: __t("accountCreationDate"), value: member.user.createdAt.toString(), inline: true },
                    { name: __t("serverJoinDate"), value: member.joinedAt?.toString()!, inline: true },
                    { name: __t("profile"), value: profText },
                ),
            new EmbedBuilder()
                .setTitle(member.user.tag)
                .setThumbnail(member.displayAvatarURL())
                .setColor(member.user.accentColor || member.displayColor)
                .addFields(
                    { name: __t("userID"), value: member.id, inline: true },
                    { name: __t("displayName"), value: member.user.displayName, inline: true },
                    { name: __t("nickname"), value: member.nickname || __t("unset"), inline: true },
                    { name: __t("role"), value: member.roles.cache.sort((a, b) => b.position - a.position).map(role => role.toString()).join(", ") },
                    { name: __t("authority"), value: member.permissions.toArray().join(", ") },
                )

        );
        interaction.editReply({ embeds: [replyEmbed] });
        const embedPage = new EmbedPage(interaction.channel!, userInfoEmbeds);
        embedPage.send();
    }
};

export default userInfocommand;