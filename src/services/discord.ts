import { Collection, ColorResolvable, Colors, EmbedBuilder, FetchMessagesOptions, GuildMessageManager, Message } from "discord.js";
import { __t } from "./locale";

export const GetReplyEmbed = (message: string, type: ReplyEmbedType) => {
    const embedData: { title: string, color: ColorResolvable } = ((type) => {
        switch (type) {
            case ReplyEmbedType.Success:
                return { title: `:white_check_mark:${__t("success")}`, color: Colors.Green };
            case ReplyEmbedType.Info:
                return { title: `:information_source:${__t("info")}`, color: Colors.Blue };
            case ReplyEmbedType.Warn:
                return { title: `:warning:${__t("warn")}`, color: Colors.Yellow };
            case ReplyEmbedType.Error:
                return { title: `:no_entry_sign:${__t("error")}`, color: Colors.Red };
        }
    })(type);
    return new EmbedBuilder()
        .setTitle(embedData.title)
        .setDescription(message)
        .setColor(embedData.color);
}

export enum ReplyEmbedType {
    Success,
    Info,
    Warn,
    Error,
}

GuildMessageManager.prototype.fetchMany = async function (
    options?: FetchMessagesOptions
): Promise<Collection<string, Message<true>>> {
    if ((options?.limit ?? 50) <= 100) {
        return await this.fetch(options);
    }

    const filterOptionCount = (options?.before ? 1 : 0) + (options?.after ? 1 : 0) + (options?.around ? 1 : 0);

    if (filterOptionCount > 1) {
        return new Collection<string, Message<true>>();
    }

    const fetchMessagesBefore = async (limit: number, targetMessageID: string): Promise<Collection<string, Message<true>>> => {
        let messages = new Collection<string, Message<true>>();
        let messageID = targetMessageID || undefined;
        for (let remainingCount = limit; remainingCount > 0 && messageID; remainingCount -= 100) {
            const limit = (remainingCount <= 100) ? remainingCount : 100;
            const msgs = await this.fetch({ limit: limit, before: messageID, cache: options?.cache });
            messages = messages.concat(msgs);
            messageID = msgs.last()?.id;
        }
        return messages;
    };

    const fetchMessagesAfter = async (limit: number, targetMessageID: string): Promise<Collection<string, Message<true>>> => {
        let messages = new Collection<string, Message<true>>();
        let messageID = targetMessageID || undefined;
        for (let remainingCount = limit; remainingCount > 0 && messageID; remainingCount -= 100) {
            const limit = (remainingCount <= 100) ? remainingCount : 100;
            const msgs = (await this.fetch({ limit: limit, after: messageID, cache: options?.cache }));
            messages = messages.concat(msgs.reverse());
            messageID = msgs.last()?.id;
        }
        return messages.reverse();
    };

    // 取得条件がLimitのみの場合
    if (filterOptionCount === 0) {
        return await fetchMessagesBefore(options?.limit!, this.channel.lastMessageId!);
    }

    // 取得条件にBeforeが指定されている場合
    if (options?.before) {
        return await fetchMessagesBefore(options?.limit!, options.before);
    }

    // 取得条件にAfterが指定されている場合
    if (options?.after) {
        return await fetchMessagesAfter(options?.limit!, options.after);
    }

    // 取得条件にAroundが指定されている場合
    if (options?.around) {
        let messages = new Collection<string, Message<true>>();
        const limit = Math.floor(options?.limit! / 2);
        messages = await fetchMessagesAfter(limit, options.around);
        messages = messages.concat(await this.fetch({ limit: 1, around: options.around, cache: options?.cache }));
        messages = messages.concat(await fetchMessagesBefore(limit, options.around));
        return messages;
    }

    return new Collection<string, Message<true>>();
};
