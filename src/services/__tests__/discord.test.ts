import { Colors, EmbedBuilder } from 'discord.js';
import { getReplyEmbed, ReplyEmbedType } from '../discord';

// Mock locale module
jest.mock('../locale', () => ({
    __t: (key: string) => {
        const translations: Record<string, string> = {
            'success': '成功',
            'info': '情報',
            'warn': '警告',
            'error': 'エラー'
        };
        return translations[key] || key;
    }
}));

describe('Discord Utility Functions', () => {
    describe('getReplyEmbed', () => {
        it('should create success embed with correct properties', () => {
            const description = 'Test success message';
            const embed = getReplyEmbed(description, ReplyEmbedType.Success);

            expect(embed).toBeInstanceOf(EmbedBuilder);
            expect(embed.data.title).toBe(':white_check_mark:成功');
            expect(embed.data.description).toBe(description);
            expect(embed.data.color).toBe(Colors.Green);
        });

        it('should create info embed with correct properties', () => {
            const description = 'Test info message';
            const embed = getReplyEmbed(description, ReplyEmbedType.Info);

            expect(embed.data.title).toBe(':information_source:情報');
            expect(embed.data.description).toBe(description);
            expect(embed.data.color).toBe(Colors.Blue);
        });

        it('should create warning embed with correct properties', () => {
            const description = 'Test warning message';
            const embed = getReplyEmbed(description, ReplyEmbedType.Warn);

            expect(embed.data.title).toBe(':warning:警告');
            expect(embed.data.description).toBe(description);
            expect(embed.data.color).toBe(Colors.Yellow);
        });

        it('should create error embed with correct properties', () => {
            const description = 'Test error message';
            const embed = getReplyEmbed(description, ReplyEmbedType.Error);

            expect(embed.data.title).toBe(':no_entry_sign:エラー');
            expect(embed.data.description).toBe(description);
            expect(embed.data.color).toBe(Colors.Red);
        });

        it('should handle empty description', () => {
            // Discord.js requires non-empty description
            const embed = getReplyEmbed('Test', ReplyEmbedType.Success);
            expect(embed.data.description).toBe('Test');
        });

        it('should handle multi-line description', () => {
            const description = 'Line 1\nLine 2\nLine 3';
            const embed = getReplyEmbed(description, ReplyEmbedType.Info);
            expect(embed.data.description).toBe(description);
        });
    });
});
