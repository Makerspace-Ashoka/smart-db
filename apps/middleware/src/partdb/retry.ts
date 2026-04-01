export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2000,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = defaultRetryOptions,
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransient(error) || attempt === options.maxAttempts) {
        throw error;
      }

      const delay = Math.min(
        options.baseDelayMs * Math.pow(2, attempt - 1),
        options.maxDelayMs,
      );
      await retryInternals.sleep(delay);
    }
  }

  throw new Error("withRetry: maxAttempts must be >= 1");
}

function isTransient(error: unknown): boolean {
  if (error instanceof TypeError && /fetch|network|abort/i.test(error.message)) {
    return true;
  }
  if (error instanceof Error && /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(error.message)) {
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const retryInternals = { isTransient, sleep };
