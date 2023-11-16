import { AutocompleteInteraction, CacheType, ChatInputCommandInteraction, Collection, ModalSubmitInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";

export interface Command {
    data: SlashCommandBuilder | SlashCommandSubcommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandSubcommandGroupBuilder;
    async execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
    async autocomplete?: (interaction: AutocompleteInteraction) => Promise<any>;
    async modal?: (interaction: ModalSubmitInteraction<CacheType>) => Promise<any>;
    cooldown?: number // in seconds
}

export interface BotEvent {
    name: string;
    once?: boolean | false;
    execute: (...args?) => void;
}

declare module "discord.js" {
    interface Client {
        commands: Collection<string, Command>;
        cooldowns: Collection<string, number>;
    }
    interface GuildMessageManager {
        fetchMany(options?: FetchMessagesOptions | undefined): Promise<Collection<string, Message<true>>>;
        test: string;
    }
}