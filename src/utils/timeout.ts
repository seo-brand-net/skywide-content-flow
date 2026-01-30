/**
 * Utility to wrap any promise with a timeout.
 * If the promise does not resolve within timeoutMs, it rejects.
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 30000,
    errorMsg: string = 'Operation timed out'
): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(errorMsg));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result;
    } finally {
        if (timeoutId!) clearTimeout(timeoutId);
    }
}
