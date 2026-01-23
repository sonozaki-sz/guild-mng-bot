import { sleep } from '../utilty';

describe('Utility Functions', () => {
    describe('sleep', () => {
        it('should resolve after specified milliseconds', async () => {
            const startTime = Date.now();
            const delayMs = 100;

            await sleep(delayMs);

            const elapsedTime = Date.now() - startTime;
            // Allow tolerance for execution time (CI environments can be slower)
            expect(elapsedTime).toBeGreaterThanOrEqual(delayMs - 10);
            expect(elapsedTime).toBeLessThan(delayMs + 100);
        });

        it('should work with 0ms delay', async () => {
            const promise = sleep(0);
            await expect(promise).resolves.toBeUndefined();
        });

        it('should handle multiple concurrent sleeps', async () => {
            const startTime = Date.now();

            await Promise.all([
                sleep(50),
                sleep(50),
                sleep(50)
            ]);

            const elapsedTime = Date.now() - startTime;
            // All should complete in parallel, so ~50ms not 150ms
            expect(elapsedTime).toBeLessThan(100);
        });
    });
});
