import {
  Result,
  TimeoutOptions,
  CleanupFunction,
  EventOptions,
  IteratorOptions,
  ConcurrentOptions,
  CallbackHandlers,
} from './types';
import { tryCatch } from './index';
import { EventEmitter } from 'events';

/**
 * Creates a promise that rejects after a specified timeout.
 * Includes a cancel method to clean up the timeout.
 *
 * @param timeout Timeout duration in milliseconds
 * @param message Error message to use when timeout occurs
 * @returns A promise that rejects after the timeout
 * @internal
 */
function createTimeoutPromise(timeout: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${message} after ${timeout}ms`));
    }, timeout);
    // Ensure timeout is cleared if promise is cancelled
    (Promise.prototype as any).cancel = () => clearTimeout(timeoutId);
  });
}

/**
 * Races a promise against a timeout, ensuring proper cleanup of timeouts.
 *
 * @param promise The promise to race against the timeout
 * @param timeout Timeout duration in milliseconds
 * @param message Optional custom timeout message
 * @returns The promise result if it completes before the timeout
 * @throws Error if the timeout occurs first
 * @internal
 */
function raceWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  message = 'Operation timed out',
): Promise<T> {
  const timeoutPromise = createTimeoutPromise(timeout, message);
  return Promise.race([promise, timeoutPromise]).finally(() => {
    (timeoutPromise as any).cancel?.();
  });
}

/**
 * Wraps an event emitter or stream operation, handling both promise resolution
 * and error events. Automatically cleans up error listeners.
 *
 * @template T The type of the successful result
 * @template E The type of the error (defaults to Error)
 * @param emitter The event emitter or stream to handle
 * @param operation The operation to perform with the emitter
 * @param options Configuration options for event handling
 * @returns A Result containing the operation result
 *
 * @example
 * ```typescript
 * import { createReadStream } from 'fs';
 *
 * const readFile = async (path: string) => {
 *   const stream = createReadStream(path);
 *   const result = await withEvents(
 *     stream,
 *     async () => {
 *       const chunks = [];
 *       for await (const chunk of stream) {
 *         chunks.push(chunk);
 *       }
 *       return Buffer.concat(chunks);
 *     },
 *     {
 *       timeout: 5000,
 *       cleanup: () => stream.destroy()
 *     }
 *   );
 *
 *   if (isSuccess(result)) {
 *     return result.data.toString('utf8');
 *   }
 *   throw result.error;
 * };
 * ```
 */
export function withEvents<T, E = Error>(
  emitter: EventEmitter,
  operation: () => Promise<T>,
  options: EventOptions = {},
) {
  const { errorEvent = 'error', timeout, cleanup } = options;

  return tryCatch<T, E>(async () => {
    let isSettled = false;

    const cleanupFn = async () => {
      if (isSettled) return;
      isSettled = true;
      emitter.removeAllListeners(errorEvent);
      try {
        await cleanup?.();
      } catch {
        // Ignore cleanup errors
      }
    };

    try {
      // Create a promise that rejects on error event
      const errorPromise = new Promise<never>((_, reject) => {
        emitter.once(errorEvent, reject);
      });

      const operationPromise = operation();
      const promises = [operationPromise, errorPromise];

      // Add timeout if specified
      if (timeout) {
        promises.push(createTimeoutPromise(timeout, 'Operation timed out'));
      }

      return await Promise.race(promises);
    } finally {
      await cleanupFn();
    }
  });
}

/**
 * Safely handles an async iterator, ensuring proper cleanup even if the iteration
 * is interrupted. Also handles timeouts and early termination.
 *
 * @template T The type of items yielded by the iterator
 * @template E The type of the error (defaults to Error)
 * @param iterator The async iterator to consume
 * @param options Configuration options for iteration
 * @returns A Result containing the collected values
 *
 * @example
 * ```typescript
 * async function* numberGenerator() {
 *   for (let i = 0; i < 100; i++) {
 *     yield i;
 *     await new Promise(resolve => setTimeout(resolve, 100));
 *   }
 * }
 *
 * const result = await withIterator(numberGenerator(), {
 *   timeout: 5000,
 *   maxItems: 10,
 *   onItem: value => value < 50 // Stop if value >= 50
 * });
 *
 * if (isSuccess(result)) {
 *   console.log('Collected values:', result.data);
 * }
 * ```
 */
export async function withIterator<T, E = Error>(
  iterator: AsyncIterator<T>,
  options: IteratorOptions<T> = {},
) {
  const { timeout, maxItems, onItem } = options;

  return tryCatch<T[], E>(async () => {
    const values: T[] = [];

    const cleanup = async () => {
      try {
        await iterator.return?.();
      } catch {
        // Ignore cleanup errors
      }
    };

    try {
      const iteratePromise = (async () => {
        while (true) {
          let next;
          try {
            next = await iterator.next();
          } catch (error) {
            await cleanup();
            throw error;
          }

          if (next.done) break;

          if (onItem) {
            const shouldContinue = await onItem(next.value);
            if (!shouldContinue) break;
          }

          values.push(next.value);

          if (maxItems && values.length >= maxItems) break;
        }
        return values;
      })();

      return timeout
        ? await raceWithTimeout(iteratePromise, timeout, 'Iterator timed out')
        : await iteratePromise;
    } finally {
      await cleanup();
    }
  });
}

/**
 * Wraps a callback-style operation in a Promise with proper cleanup and timeout handling.
 * Useful for converting callback-based APIs to promise-based ones.
 *
 * @template T The type of the successful result
 * @template E The type of the error (defaults to Error)
 * @param setup Function that sets up callbacks and returns cleanup function
 * @param options Configuration options
 * @returns A Result containing the operation result
 *
 * @example
 * ```typescript
 * const readFileWithCallback = (path: string) => {
 *   return withCallbacks<Buffer>(({ resolve, reject }) => {
 *     const stream = createReadStream(path);
 *     const chunks: Buffer[] = [];
 *
 *     stream.on('data', chunk => chunks.push(chunk));
 *     stream.on('end', () => resolve(Buffer.concat(chunks)));
 *     stream.on('error', reject);
 *
 *     return () => stream.destroy();
 *   }, { timeout: 5000 });
 * };
 * ```
 */
export function withCallbacks<T, E = Error>(
  setup: (handlers: CallbackHandlers<T>) => CleanupFunction | void,
  options: TimeoutOptions = {},
) {
  return tryCatch<T, E>(async () => {
    return new Promise<T>((resolve, reject) => {
      let cleanup = () => {};

      const wrappedResolve = (value: T) => {
        cleanup();
        resolve(value);
      };

      const wrappedReject = (error: Error) => {
        cleanup();
        reject(error);
      };

      cleanup = setup({ resolve: wrappedResolve, reject: wrappedReject }) || (() => {});

      if (options.timeout) {
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Operation timed out after ${options.timeout}ms`));
        }, options.timeout);
        const originalCleanup = cleanup;
        cleanup = () => {
          clearTimeout(timeoutId);
          originalCleanup();
        };
      }
    });
  });
}

/**
 * Safely executes multiple concurrent operations, ensuring all operations are
 * properly wrapped in tryCatch and handling partial failures.
 *
 * @template T The type of the successful result
 * @template E The type of the error (defaults to Error)
 * @param operations Array of operations to execute concurrently
 * @param options Configuration options for concurrency
 * @returns Array of Results, one for each operation
 *
 * @example
 * ```typescript
 * const urls = ['https://api.example.com/1', 'https://api.example.com/2'];
 * const results = await concurrent(
 *   urls.map(url => async () => {
 *     const response = await fetch(url);
 *     return response.json();
 *   }),
 *   {
 *     timeout: 5000,
 *     maxConcurrent: 2,
 *     stopOnError: false
 *   }
 * );
 *
 * // Handle results individually
 * results.forEach((result, index) => {
 *   if (isSuccess(result)) {
 *     console.log(`URL ${index} succeeded:`, result.data);
 *   } else {
 *     console.error(`URL ${index} failed:`, result.error);
 *   }
 * });
 * ```
 */
export async function concurrent<T, E = Error>(
  operations: Array<() => Promise<T>>,
  options: ConcurrentOptions = {},
): Promise<Result<T, E>[]> {
  const { maxConcurrent = Infinity, timeout, stopOnError = false } = options;

  const executeOperation = (op: () => Promise<T>) => {
    return tryCatch<T, E>(async () => {
      const promise = op();
      return timeout ? await raceWithTimeout(promise, timeout, 'Operation timed out') : await promise;
    });
  };

  // If no concurrency limit or single operation, process all at once
  if (maxConcurrent === Infinity || operations.length <= maxConcurrent) {
    const results = await Promise.all(operations.map(executeOperation));

    if (stopOnError && results.some((r) => r.isError)) {
      return [results.find((r) => r.isError)!];
    }

    return results;
  }

  // Process in chunks for limited concurrency
  const results: Result<T, E>[] = [];
  for (let i = 0; i < operations.length; i += maxConcurrent) {
    const chunk = operations.slice(i, i + maxConcurrent);
    const chunkResults = await Promise.all(chunk.map(executeOperation));

    results.push(...chunkResults);

    if (stopOnError && chunkResults.some((result) => result.isError)) {
      return [chunkResults.find((r) => r.isError)!];
    }
  }

  return results;
}
