import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { withEvents, withIterator, withCallbacks, concurrent, pipe } from './utils';
import { isSuccess, isFailure } from './types';
import { tryCatch } from './index';

describe('Utility Functions', () => {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  describe('withEvents', () => {
    let emitter: EventEmitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    afterEach(() => {
      emitter.removeAllListeners();
    });

    it('should handle successful event emitter operations', async () => {
      const result = await withEvents(emitter, async () => {
        setTimeout(() => emitter.emit('end'), 1);
        return 'success';
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe('success');
      }
    });

    it('should handle error events', async () => {
      const promise = withEvents(emitter, async () => {
        await delay(10);
        return 'success';
      });

      setTimeout(() => emitter.emit('error', new Error('stream error')), 1);
      const result = await promise;

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('stream error');
      }
    });

    it('should handle non-Error objects in error events', async () => {
      const promise = withEvents(emitter, async () => {
        await delay(10);
        return 'success';
      });

      setTimeout(() => emitter.emit('error', { custom: 'error' }), 1);
      const result = await promise;

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle error event with cleanup', async () => {
      let cleanupCalled = false;
      const error = new Error('Event error');

      const promise = withEvents(emitter, () => delay(10), {
        cleanup: () => {
          cleanupCalled = true;
        },
      });

      setTimeout(() => emitter.emit('error', error), 1);
      const result = await promise;

      expect(result.isError).toBe(true);
      expect(result.error).toBe(error);
      expect(cleanupCalled).toBe(true);
    });

    it('should handle timeout with specific error message', async () => {
      const timeoutDuration = 10;

      const result = await withEvents(emitter, () => delay(timeoutDuration * 2), {
        timeout: timeoutDuration,
      });

      expect(result.isError).toBe(true);
      if (result.isError) {
        expect(result.error.message).toBe(`Operation timed out after ${timeoutDuration}ms`);
        expect(result.error.message).not.toBe('');
        expect(result.error.message).toContain(timeoutDuration.toString());
      }
    });
  });

  describe('withIterator', () => {
    it('should handle successful iteration', async () => {
      async function* generator() {
        yield 1;
        yield 2;
      }

      const result = await withIterator(generator());
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([1, 2]);
      }
    });

    it('should handle early termination', async () => {
      async function* generator() {
        yield 1;
        yield 2;
      }

      const result = await withIterator(generator(), { maxItems: 1 });
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([1]);
      }
    });

    it('should handle timeouts', async () => {
      async function* generator() {
        yield 1;
        await delay(10);
        yield 2;
      }

      const result = await withIterator(generator(), { timeout: 5 });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('timed out');
      }
    });

    it('should handle empty iterators', async () => {
      async function* generator() {
        if (false) yield 1; // Never yields
      }

      const result = await withIterator(generator());
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual([]);
      }
    });

    it('should handle synchronous iterator errors', async () => {
      async function* generator() {
        throw new Error('sync error');
        yield 1;
      }

      const result = await withIterator(generator());
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('sync error');
      }
    });

    it('should handle iterator.return throwing during cleanup', async () => {
      const iterator: AsyncIterator<number> = {
        next: async () => ({ done: true, value: undefined }),
        return: async () => {
          throw new Error('Failed to close iterator');
          return { done: true, value: undefined };
        },
      };

      const result = await withIterator(iterator);
      expect(result.isError).toBe(false);
      expect(result.data).toEqual([]);
    });

    it('should handle iterator.next throwing', async () => {
      const error = new Error('Iterator failed');
      const iterator: AsyncIterator<number> = {
        next: async () => {
          throw error;
        },
        return: async () => ({ done: true, value: undefined }),
      };

      const result = await withIterator(iterator);
      expect(result.isError).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should handle iterator.next throwing and cleanup failing', async () => {
      const iteratorError = new Error('Iterator failed');
      const cleanupError = new Error('Cleanup failed');
      const iterator: AsyncIterator<number> = {
        next: async () => {
          throw iteratorError;
        },
        return: async () => {
          throw cleanupError;
        },
      };

      const result = await withIterator(iterator);
      expect(result.isError).toBe(true);
      expect(result.error).toBe(iteratorError);
    });

    it('should handle cleanup in all cases', async () => {
      let cleanupCalled = false;
      const iterator: AsyncIterator<number> = {
        next: async () => ({ done: true, value: undefined }),
        return: async () => {
          cleanupCalled = true;
          return { done: true, value: undefined };
        },
      };

      const result = await withIterator(iterator);
      expect(result.isError).toBe(false);
      expect(cleanupCalled).toBe(true);
    });

    it('should handle maxItems with onItem callback', async () => {
      const values = [1, 2, 3, 4, 5];
      let index = 0;
      let itemsProcessed = 0;

      const iterator: AsyncIterator<number> = {
        next: async () => {
          if (index < values.length) {
            return { done: false, value: values[index++] };
          }
          return { done: true, value: undefined };
        },
      };

      const result = await withIterator(iterator, {
        maxItems: 3,
        onItem: (item) => {
          itemsProcessed++;
          expect(item).toBe(values[itemsProcessed - 1]);
          return true;
        },
      });

      expect(result.isError).toBe(false);
      expect(result.data).toEqual([1, 2, 3]);
      expect(itemsProcessed).toBe(3);
    });

    it('should stop when onItem returns false', async () => {
      const values = [1, 2, 3, 4, 5];
      let index = 0;
      let itemsProcessed = 0;

      const iterator: AsyncIterator<number> = {
        next: async () => {
          if (index < values.length) {
            return { done: false, value: values[index++] };
          }
          return { done: true, value: undefined };
        },
      };

      const result = await withIterator(iterator, {
        onItem: (item) => {
          itemsProcessed++;
          return item < 3; // Stop when we hit 3
        },
      });

      expect(result.isError).toBe(false);
      expect(result.data).toEqual([1, 2]);
      expect(itemsProcessed).toBe(3);
    });
  });

  describe('withCallbacks', () => {
    it('should handle successful callback operations', async () => {
      const result = await withCallbacks(({ resolve }) => {
        setTimeout(() => resolve('success'), 1);
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe('success');
      }
    });

    it('should handle callback errors', async () => {
      const result = await withCallbacks(({ reject }) => {
        setTimeout(() => reject(new Error('callback error')), 1);
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('callback error');
      }
    });

    it('should handle timeouts', async () => {
      const result = await withCallbacks(
        ({ resolve }) => {
          const timeoutId = setTimeout(() => resolve('success'), 10);
          return () => clearTimeout(timeoutId);
        },
        { timeout: 5 },
      );

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('timed out');
      }
    });

    it('should handle setup function throwing', async () => {
      const result = await withCallbacks(() => {
        throw new Error('setup error');
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('setup error');
      }
    });

    it('should handle non-Error rejects', async () => {
      const result = await withCallbacks(({ reject }) => {
        setTimeout(() => reject(new Error('string error')), 1);
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('concurrent', () => {
    it('should handle successful concurrent operations', async () => {
      const operations = [async () => 'first', async () => 'second'];

      const results = await concurrent(operations);
      expect(results).toHaveLength(2);
      expect(results.every(isSuccess)).toBe(true);
      expect(results.map((r) => isSuccess(r) && r.data)).toEqual(['first', 'second']);
    });

    it('should handle partial failures', async () => {
      const operations = [
        async () => 'success',
        async () => {
          throw new Error('failed');
        },
      ];

      const results = await concurrent(operations);
      expect(results).toHaveLength(2);
      expect(results[0].isError).toBe(false);
      expect(results[1].isError).toBe(true);
    });

    it('should respect maxConcurrent option', async () => {
      const inProgress = new Set<number>();
      const operations = Array.from({ length: 2 }, (_, i) => async () => {
        inProgress.add(i);
        await delay(5);
        const concurrent = inProgress.size;
        inProgress.delete(i);
        return concurrent;
      });

      const results = await concurrent(operations, { maxConcurrent: 1 });

      const maxConcurrent = Math.max(...results.map((r) => (isSuccess(r) ? r.data : 0)));
      expect(maxConcurrent).toBe(1);
    });

    it('should handle non-function operations', async () => {
      const operations = [async () => 'valid', 'invalid' as any];

      const results = await concurrent(operations);
      expect(results).toHaveLength(2);
      expect(results[0].isError).toBe(false);
      expect(results[1].isError).toBe(true);
      if (isFailure(results[1])) {
        expect(results[1].error.message).toContain('not a function');
      }
    });

    it('should handle operations returning non-promises', async () => {
      const operations = [async () => 'async', () => 'sync' as any];

      const results = await concurrent(operations);
      expect(results).toHaveLength(2);
      expect(results.every(isSuccess)).toBe(true);
    });

    it('should handle stopOnError with infinite maxConcurrent', async () => {
      const error = new Error('Operation failed');
      const operations = [
        async () => 'first',
        async () => {
          throw error;
        },
        async () => 'third',
      ];

      const results = await concurrent(operations, { stopOnError: true });
      expect(results).toHaveLength(1);
      expect(results[0].isError).toBe(true);
      expect(results[0].error).toBe(error);
    });

    it('should handle stopOnError with limited concurrency', async () => {
      const error = new Error('Operation failed');
      const operations = [
        async () => 'first',
        async () => {
          throw error;
        },
        async () => 'third',
      ];

      const results = await concurrent(operations, {
        maxConcurrent: 1,
        stopOnError: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].isError).toBe(true);
      expect(results[0].error).toBe(error);
    });

    it('should handle maxConcurrent edge cases', async () => {
      const operations = [async () => 'first', async () => 'second', async () => 'third'];

      const infinityResults = await concurrent(operations, { maxConcurrent: Infinity });
      expect(infinityResults).toHaveLength(3);
      expect(infinityResults.every((r) => !r.isError)).toBe(true);

      const exactResults = await concurrent(operations, { maxConcurrent: operations.length });
      expect(exactResults).toHaveLength(3);
      expect(exactResults.every((r) => !r.isError)).toBe(true);

      const plusOneResults = await concurrent(operations, { maxConcurrent: operations.length + 1 });
      expect(plusOneResults).toHaveLength(3);
      expect(plusOneResults.every((r) => !r.isError)).toBe(true);
    });

    it('should handle operations with different return types', async () => {
      function expectType<T>(_actual: T) {} // eslint-disable-line @typescript-eslint/no-unused-vars

      const results = await concurrent([
        async () => 42 as const,
        async () => 'hello' as const,
      ] as const);

      const [numResult, strResult] = results;

      expect(numResult.isError).toBe(false);
      if (!numResult.isError) {
        const num = numResult.data;
        expect(num).toBe(42);
        expectType<42>(num);
      }

      expect(strResult.isError).toBe(false);
      if (!strResult.isError) {
        const str = strResult.data;
        expect(str).toBe('hello');
        expectType<'hello'>(str);
      }
    });

    it('should handle timeout with specific error message', async () => {
      const timeoutDuration = 10;
      const operations = [() => delay(timeoutDuration * 10)];

      const results = await concurrent(operations, {
        timeout: timeoutDuration,
      });

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.isError).toBe(true);
      if (result.isError) {
        expect(result.error.message).toBe(`Operation timed out after ${timeoutDuration}ms`);
      }
    });

    it('should handle typed async functions', async () => {
      type User = { name: string };
      type Post = { title: string };

      const getUser = async (): Promise<User> => ({ name: 'bob' });
      const getPost = async (): Promise<Post> => ({ title: 'Hello' });

      const results = await concurrent([getUser, getPost] as const);

      const [userResult, postResult] = results;

      expect(userResult.isError).toBe(false);
      if (!userResult.isError) {
        const user: User = userResult.data;
        expect(user.name).toBe('bob');
      }
            
      expect(postResult.isError).toBe(false);
      if (!postResult.isError) {
        const post: Post = postResult.data;
        expect(post.title).toBe('Hello');
      }
    });

    it('should handle composition with other utilities', async () => {
      const emitter1 = new EventEmitter();
      const emitter2 = new EventEmitter();
      
      async function* numberGenerator() {
        for (let i = 1; i <= 3; i++) {
          yield i;
          await delay(1);
        }
      }

      const results = await concurrent([
        async () => {
          const result = await withEvents(
            emitter1,
            () => new Promise<string>(resolve => {
              emitter1.once('data', resolve);
              setTimeout(() => emitter1.emit('data', 'event1 data'), 1);
            })
          );
          return result.isError ? Promise.reject(result.error) : result.data;
        },

        async () => {
          const result = await withEvents(
            emitter2,
            () => new Promise<string>(resolve => {
              emitter2.once('data', resolve);
              setTimeout(() => emitter2.emit('data', 'event2 data'), 1);
            })
          );
          return result.isError ? Promise.reject(result.error) : result.data;
        },

        async () => {
          const result = await withIterator(numberGenerator());
          return result.isError ? Promise.reject(result.error) : result.data;
        },

        async () => {
          const result = await withCallbacks<string>(({ resolve }) => {
            const timeoutId = setTimeout(() => resolve('callback data'), 1);
            return () => clearTimeout(timeoutId);
          });
          return result.isError ? Promise.reject(result.error) : result.data;
        }
      ] as const);

      const [event1Result, event2Result, iteratorResult, callbackResult] = results;

      expect(event1Result.isError).toBe(false);
      if (!event1Result.isError) {
        expect(event1Result.data).toBe('event1 data');
      }

      expect(event2Result.isError).toBe(false);
      if (!event2Result.isError) {
        expect(event2Result.data).toBe('event2 data');
      }

      expect(iteratorResult.isError).toBe(false);
      if (!iteratorResult.isError) {
        expect(iteratorResult.data).toEqual([1, 2, 3]);
      }

      expect(callbackResult.isError).toBe(false);
      if (!callbackResult.isError) {
        expect(callbackResult.data).toBe('callback data');
      }
    }, 10000);

    it('should handle errors in composed utilities', async () => {
      const emitter = new EventEmitter();
      
      const results = await concurrent([
        async () => {
          const result = await withEvents(
            emitter,
            () => new Promise<string>((_, reject) => {
              emitter.once('error', reject);
              setTimeout(() => emitter.emit('error', new Error('event error')), 1);
            })
          );
          return result.isError ? Promise.reject(result.error) : result.data;
        },

        async () => {
          const result = await withIterator(async function* () {
            yield 1;
            await delay(1);
            throw new Error('iterator error');
          }());
          return result.isError ? Promise.reject(result.error) : result.data;
        },

        async () => {
          const result = await withCallbacks<string>(({ reject }) => {
            const timeoutId = setTimeout(() => reject(new Error('callback error')), 1);
            return () => clearTimeout(timeoutId);
          });
          return result.isError ? Promise.reject(result.error) : result.data;
        }
      ] as const);

      expect(results.every(r => r.isError)).toBe(true);

      const errors = results.map(r => r.isError ? r.error.message : null);
      expect(errors).toContain('event error');
      expect(errors).toContain('iterator error');
      expect(errors).toContain('callback error');
    }, 10000);

    it('should handle cleanup in composed utilities', async () => {
      const cleanupCalls = {
        event: 0,
        iterator: 0,
        callback: 0
      };

      const emitter = new EventEmitter();
      
      await concurrent([
        async () => {
          const result = await withEvents(
            emitter,
            () => Promise.resolve('event data'),
            {
              cleanup: () => {
                cleanupCalls.event++;
              }
            }
          );
          return result.isError ? Promise.reject(result.error) : result.data;
        },

        async () => {
          const result = await withIterator((async function* () {
            try {
              yield 1;
            } finally {
              cleanupCalls.iterator++;
            }
          })());
          return result.isError ? Promise.reject(result.error) : result.data;
        },

        async () => {
          const result = await withCallbacks<string>(({ resolve }) => {
            const timeoutId = setTimeout(() => resolve('callback data'), 1);
            return () => {
              clearTimeout(timeoutId);
              cleanupCalls.callback++;
            };
          });
          return result.isError ? Promise.reject(result.error) : result.data;
        }
      ] as const);

      // Give a small delay for cleanup to complete
      await delay(5);

      expect(cleanupCalls).toEqual({
        event: 1,
        iterator: 1,
        callback: 1
      });
    }, 10000);
  });

  describe('pipe', () => {
    it('should pipe operations successfully', async () => {
      const result = await pipe(5, [
        (num) => tryCatch(() => num * 2),
        (num) => tryCatch(() => num + 10),
        (num) => tryCatch(() => num.toString())
      ]);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe('20');
      }
    });

    it('should short-circuit on errors', async () => {
      const operations = [
        (num: number) => tryCatch(() => num * 2),
        (num: number) => tryCatch(() => { throw new Error('Operation failed'); }),
        (num: number) => tryCatch(() => num.toString())
      ];

      const onSuccessSpy = vi.fn();
      const result = await pipe(5, operations);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Operation failed');
      }
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('should handle composition with other utilities', async () => {
      const emitter = new EventEmitter();
      
      // Setup iterator
      async function* numberGenerator() {
        for (let i = 1; i <= 3; i++) {
          yield i;
          await delay(1);
        }
      }

      const result = await pipe('start', [
        // First operation - simple transformation
        (input: string) => tryCatch(() => `${input} -> Step 1`),
        
        // Second operation - use withEvents
        (input: string) => tryCatch(async () => {
          const eventResult = await withEvents(
            emitter,
            () => new Promise<string>(resolve => {
              emitter.once('data', (data) => resolve(`${input} -> ${data}`));
              setTimeout(() => emitter.emit('data', 'event data'), 1);
            })
          );
          
          return isSuccess(eventResult) ? eventResult.data : Promise.reject(eventResult.error);
        }),
        
        // Third operation - use withIterator
        (input: string) => tryCatch(async () => {
          const iteratorResult = await withIterator(numberGenerator());
          
          return isSuccess(iteratorResult)
            ? `${input} -> [${iteratorResult.data.join(', ')}]`
            : Promise.reject(iteratorResult.error);
        })
      ]);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe('start -> Step 1 -> event data -> [1, 2, 3]');
      }
    });

    it('should handle complex data transformations', async () => {
      interface User {
        id: number;
        name: string;
      }
      
      interface Post {
        id: number;
        title: string;
        userId: number;
      }
      
      // Mock data
      const users: User[] = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      
      const posts: Post[] = [
        { id: 101, title: 'Alice Post 1', userId: 1 },
        { id: 102, title: 'Alice Post 2', userId: 1 },
        { id: 201, title: 'Bob Post 1', userId: 2 }
      ];
      
      const result = await pipe('Alice', [
        // Get user by name
        (name: string) => tryCatch(() => {
          const user = users.find(u => u.name === name);
          if (!user) throw new Error(`User not found: ${name}`);
          return user;
        }),
        
        // Get posts by user ID
        (user: User) => tryCatch(() => {
          const userPosts = posts.filter(p => p.userId === user.id);
          if (userPosts.length === 0) throw new Error(`No posts found for user: ${user.name}`);
          return userPosts;
        }),
        
        // Format post titles
        (userPosts: Post[]) => tryCatch(() => {
          return userPosts.map(post => post.title);
        })
      ]);
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual(['Alice Post 1', 'Alice Post 2']);
      }
    });
  });
});
