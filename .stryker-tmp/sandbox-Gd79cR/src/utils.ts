// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { Result, TimeoutOptions, CleanupFunction, EventOptions, IteratorOptions, ConcurrentOptions, CallbackHandlers } from './types';
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
  if (stryMutAct_9fa48("37")) {
    {}
  } else {
    stryCov_9fa48("37");
    return new Promise((_, reject) => {
      if (stryMutAct_9fa48("38")) {
        {}
      } else {
        stryCov_9fa48("38");
        const timeoutId = setTimeout(() => {
          if (stryMutAct_9fa48("39")) {
            {}
          } else {
            stryCov_9fa48("39");
            reject(new Error(stryMutAct_9fa48("40") ? `` : (stryCov_9fa48("40"), `${message} after ${timeout}ms`)));
          }
        }, timeout);
        // Ensure timeout is cleared if promise is cancelled
        (Promise.prototype as any).cancel = stryMutAct_9fa48("41") ? () => undefined : (stryCov_9fa48("41"), () => clearTimeout(timeoutId));
      }
    });
  }
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
function raceWithTimeout<T>(promise: Promise<T>, timeout: number, message = stryMutAct_9fa48("42") ? "" : (stryCov_9fa48("42"), 'Operation timed out')): Promise<T> {
  if (stryMutAct_9fa48("43")) {
    {}
  } else {
    stryCov_9fa48("43");
    const timeoutPromise = createTimeoutPromise(timeout, message);
    return Promise.race(stryMutAct_9fa48("44") ? [] : (stryCov_9fa48("44"), [promise, timeoutPromise])).finally(() => {
      if (stryMutAct_9fa48("45")) {
        {}
      } else {
        stryCov_9fa48("45");
        stryMutAct_9fa48("46") ? (timeoutPromise as any).cancel() : (stryCov_9fa48("46"), (timeoutPromise as any).cancel?.());
      }
    });
  }
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
export function withEvents<T, E = Error>(emitter: EventEmitter, operation: () => Promise<T>, options: EventOptions = {}) {
  if (stryMutAct_9fa48("47")) {
    {}
  } else {
    stryCov_9fa48("47");
    const {
      errorEvent = stryMutAct_9fa48("48") ? "" : (stryCov_9fa48("48"), 'error'),
      timeout,
      cleanup
    } = options;
    return tryCatch<T, E>(async () => {
      if (stryMutAct_9fa48("49")) {
        {}
      } else {
        stryCov_9fa48("49");
        let isSettled = stryMutAct_9fa48("50") ? true : (stryCov_9fa48("50"), false);
        const cleanupFn = async () => {
          if (stryMutAct_9fa48("51")) {
            {}
          } else {
            stryCov_9fa48("51");
            if (stryMutAct_9fa48("53") ? false : stryMutAct_9fa48("52") ? true : (stryCov_9fa48("52", "53"), isSettled)) return;
            isSettled = stryMutAct_9fa48("54") ? false : (stryCov_9fa48("54"), true);
            emitter.removeAllListeners(errorEvent);
            try {
              if (stryMutAct_9fa48("55")) {
                {}
              } else {
                stryCov_9fa48("55");
                await (stryMutAct_9fa48("56") ? cleanup() : (stryCov_9fa48("56"), cleanup?.()));
              }
            } catch {
              // Ignore cleanup errors
            }
          }
        };
        try {
          if (stryMutAct_9fa48("57")) {
            {}
          } else {
            stryCov_9fa48("57");
            // Create a promise that rejects on error event
            const errorPromise = new Promise<never>((_, reject) => {
              if (stryMutAct_9fa48("58")) {
                {}
              } else {
                stryCov_9fa48("58");
                emitter.once(errorEvent, reject);
              }
            });
            const operationPromise = operation();
            const promises = stryMutAct_9fa48("59") ? [] : (stryCov_9fa48("59"), [operationPromise, errorPromise]);

            // Add timeout if specified
            if (stryMutAct_9fa48("61") ? false : stryMutAct_9fa48("60") ? true : (stryCov_9fa48("60", "61"), timeout)) {
              if (stryMutAct_9fa48("62")) {
                {}
              } else {
                stryCov_9fa48("62");
                promises.push(createTimeoutPromise(timeout, stryMutAct_9fa48("63") ? "" : (stryCov_9fa48("63"), 'Operation timed out')));
              }
            }
            return await Promise.race(promises);
          }
        } finally {
          if (stryMutAct_9fa48("64")) {
            {}
          } else {
            stryCov_9fa48("64");
            await cleanupFn();
          }
        }
      }
    });
  }
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
export async function withIterator<T, E = Error>(iterator: AsyncIterator<T>, options: IteratorOptions<T> = {}) {
  if (stryMutAct_9fa48("65")) {
    {}
  } else {
    stryCov_9fa48("65");
    const {
      timeout,
      maxItems,
      onItem
    } = options;
    return tryCatch<T[], E>(async () => {
      if (stryMutAct_9fa48("66")) {
        {}
      } else {
        stryCov_9fa48("66");
        const values: T[] = stryMutAct_9fa48("67") ? ["Stryker was here"] : (stryCov_9fa48("67"), []);
        const cleanup = async () => {
          if (stryMutAct_9fa48("68")) {
            {}
          } else {
            stryCov_9fa48("68");
            try {
              if (stryMutAct_9fa48("69")) {
                {}
              } else {
                stryCov_9fa48("69");
                await (stryMutAct_9fa48("70") ? iterator.return() : (stryCov_9fa48("70"), iterator.return?.()));
              }
            } catch {
              // Ignore cleanup errors
            }
          }
        };
        try {
          if (stryMutAct_9fa48("71")) {
            {}
          } else {
            stryCov_9fa48("71");
            const iteratePromise = (async () => {
              if (stryMutAct_9fa48("72")) {
                {}
              } else {
                stryCov_9fa48("72");
                while (stryMutAct_9fa48("74") ? false : stryMutAct_9fa48("73") ? false : (stryCov_9fa48("73", "74"), true)) {
                  if (stryMutAct_9fa48("75")) {
                    {}
                  } else {
                    stryCov_9fa48("75");
                    let next;
                    try {
                      if (stryMutAct_9fa48("76")) {
                        {}
                      } else {
                        stryCov_9fa48("76");
                        next = await iterator.next();
                      }
                    } catch (error) {
                      if (stryMutAct_9fa48("77")) {
                        {}
                      } else {
                        stryCov_9fa48("77");
                        await cleanup();
                        throw error;
                      }
                    }
                    if (stryMutAct_9fa48("79") ? false : stryMutAct_9fa48("78") ? true : (stryCov_9fa48("78", "79"), next.done)) break;
                    if (stryMutAct_9fa48("81") ? false : stryMutAct_9fa48("80") ? true : (stryCov_9fa48("80", "81"), onItem)) {
                      if (stryMutAct_9fa48("82")) {
                        {}
                      } else {
                        stryCov_9fa48("82");
                        const shouldContinue = await onItem(next.value);
                        if (stryMutAct_9fa48("85") ? false : stryMutAct_9fa48("84") ? true : stryMutAct_9fa48("83") ? shouldContinue : (stryCov_9fa48("83", "84", "85"), !shouldContinue)) break;
                      }
                    }
                    values.push(next.value);
                    if (stryMutAct_9fa48("88") ? maxItems || values.length >= maxItems : stryMutAct_9fa48("87") ? false : stryMutAct_9fa48("86") ? true : (stryCov_9fa48("86", "87", "88"), maxItems && (stryMutAct_9fa48("91") ? values.length < maxItems : stryMutAct_9fa48("90") ? values.length > maxItems : stryMutAct_9fa48("89") ? true : (stryCov_9fa48("89", "90", "91"), values.length >= maxItems)))) break;
                  }
                }
                return values;
              }
            })();
            return timeout ? await raceWithTimeout(iteratePromise, timeout, stryMutAct_9fa48("92") ? "" : (stryCov_9fa48("92"), 'Iterator timed out')) : await iteratePromise;
          }
        } finally {
          if (stryMutAct_9fa48("93")) {
            {}
          } else {
            stryCov_9fa48("93");
            await cleanup();
          }
        }
      }
    });
  }
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
export function withCallbacks<T, E = Error>(setup: (handlers: CallbackHandlers<T>) => CleanupFunction | void, options: TimeoutOptions = {}) {
  if (stryMutAct_9fa48("94")) {
    {}
  } else {
    stryCov_9fa48("94");
    return tryCatch<T, E>(async () => {
      if (stryMutAct_9fa48("95")) {
        {}
      } else {
        stryCov_9fa48("95");
        return new Promise<T>((resolve, reject) => {
          if (stryMutAct_9fa48("96")) {
            {}
          } else {
            stryCov_9fa48("96");
            let cleanup = () => {};
            const wrappedResolve = (value: T) => {
              if (stryMutAct_9fa48("97")) {
                {}
              } else {
                stryCov_9fa48("97");
                cleanup();
                resolve(value);
              }
            };
            const wrappedReject = (error: Error) => {
              if (stryMutAct_9fa48("98")) {
                {}
              } else {
                stryCov_9fa48("98");
                cleanup();
                reject(error);
              }
            };
            cleanup = stryMutAct_9fa48("101") ? setup({
              resolve: wrappedResolve,
              reject: wrappedReject
            }) && (() => {}) : stryMutAct_9fa48("100") ? false : stryMutAct_9fa48("99") ? true : (stryCov_9fa48("99", "100", "101"), setup(stryMutAct_9fa48("102") ? {} : (stryCov_9fa48("102"), {
              resolve: wrappedResolve,
              reject: wrappedReject
            })) || (() => {}));
            if (stryMutAct_9fa48("104") ? false : stryMutAct_9fa48("103") ? true : (stryCov_9fa48("103", "104"), options.timeout)) {
              if (stryMutAct_9fa48("105")) {
                {}
              } else {
                stryCov_9fa48("105");
                const timeoutId = setTimeout(() => {
                  if (stryMutAct_9fa48("106")) {
                    {}
                  } else {
                    stryCov_9fa48("106");
                    cleanup();
                    reject(new Error(stryMutAct_9fa48("107") ? `` : (stryCov_9fa48("107"), `Operation timed out after ${options.timeout}ms`)));
                  }
                }, options.timeout);
                const originalCleanup = cleanup;
                cleanup = () => {
                  if (stryMutAct_9fa48("108")) {
                    {}
                  } else {
                    stryCov_9fa48("108");
                    clearTimeout(timeoutId);
                    originalCleanup();
                  }
                };
              }
            }
          }
        });
      }
    });
  }
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
export async function concurrent<T, E = Error>(operations: Array<() => Promise<T>>, options: ConcurrentOptions = {}): Promise<Result<T, E>[]> {
  if (stryMutAct_9fa48("109")) {
    {}
  } else {
    stryCov_9fa48("109");
    const {
      maxConcurrent = Infinity,
      timeout,
      stopOnError = stryMutAct_9fa48("110") ? true : (stryCov_9fa48("110"), false)
    } = options;
    const executeOperation = (op: () => Promise<T>) => {
      if (stryMutAct_9fa48("111")) {
        {}
      } else {
        stryCov_9fa48("111");
        const promise = tryCatch<T, E>(op);
        return timeout ? raceWithTimeout(promise, timeout, stryMutAct_9fa48("112") ? "" : (stryCov_9fa48("112"), 'Operation timed out')) : promise;
      }
    };

    // If no concurrency limit or single operation, process all at once
    if (stryMutAct_9fa48("115") ? maxConcurrent === Infinity && operations.length <= maxConcurrent : stryMutAct_9fa48("114") ? false : stryMutAct_9fa48("113") ? true : (stryCov_9fa48("113", "114", "115"), (stryMutAct_9fa48("117") ? maxConcurrent !== Infinity : stryMutAct_9fa48("116") ? false : (stryCov_9fa48("116", "117"), maxConcurrent === Infinity)) || (stryMutAct_9fa48("120") ? operations.length > maxConcurrent : stryMutAct_9fa48("119") ? operations.length < maxConcurrent : stryMutAct_9fa48("118") ? false : (stryCov_9fa48("118", "119", "120"), operations.length <= maxConcurrent)))) {
      if (stryMutAct_9fa48("121")) {
        {}
      } else {
        stryCov_9fa48("121");
        const results = await Promise.all(operations.map(executeOperation));
        if (stryMutAct_9fa48("124") ? stopOnError || results.some(r => r.isError) : stryMutAct_9fa48("123") ? false : stryMutAct_9fa48("122") ? true : (stryCov_9fa48("122", "123", "124"), stopOnError && (stryMutAct_9fa48("125") ? results.every(r => r.isError) : (stryCov_9fa48("125"), results.some(stryMutAct_9fa48("126") ? () => undefined : (stryCov_9fa48("126"), r => r.isError)))))) {
          if (stryMutAct_9fa48("127")) {
            {}
          } else {
            stryCov_9fa48("127");
            return stryMutAct_9fa48("128") ? [] : (stryCov_9fa48("128"), [results.find(stryMutAct_9fa48("129") ? () => undefined : (stryCov_9fa48("129"), r => r.isError))!]);
          }
        }
        return results;
      }
    }

    // Process in chunks for limited concurrency
    const results: Result<T, E>[] = stryMutAct_9fa48("130") ? ["Stryker was here"] : (stryCov_9fa48("130"), []);
    for (let i = 0; stryMutAct_9fa48("133") ? i >= operations.length : stryMutAct_9fa48("132") ? i <= operations.length : stryMutAct_9fa48("131") ? false : (stryCov_9fa48("131", "132", "133"), i < operations.length); stryMutAct_9fa48("134") ? i -= maxConcurrent : (stryCov_9fa48("134"), i += maxConcurrent)) {
      if (stryMutAct_9fa48("135")) {
        {}
      } else {
        stryCov_9fa48("135");
        const chunk = stryMutAct_9fa48("136") ? operations : (stryCov_9fa48("136"), operations.slice(i, stryMutAct_9fa48("137") ? i - maxConcurrent : (stryCov_9fa48("137"), i + maxConcurrent)));
        const chunkResults = await Promise.all(chunk.map(executeOperation));
        results.push(...chunkResults);
        if (stryMutAct_9fa48("140") ? stopOnError || chunkResults.some(result => result.isError) : stryMutAct_9fa48("139") ? false : stryMutAct_9fa48("138") ? true : (stryCov_9fa48("138", "139", "140"), stopOnError && (stryMutAct_9fa48("141") ? chunkResults.every(result => result.isError) : (stryCov_9fa48("141"), chunkResults.some(stryMutAct_9fa48("142") ? () => undefined : (stryCov_9fa48("142"), result => result.isError)))))) {
          if (stryMutAct_9fa48("143")) {
            {}
          } else {
            stryCov_9fa48("143");
            return stryMutAct_9fa48("144") ? [] : (stryCov_9fa48("144"), [chunkResults.find(stryMutAct_9fa48("145") ? () => undefined : (stryCov_9fa48("145"), r => r.isError))!]);
          }
        }
      }
    }
    return results;
  }
}