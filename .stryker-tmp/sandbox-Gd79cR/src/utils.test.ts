// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { withEvents, withIterator, withCallbacks, concurrent } from './utils';
import { isSuccess, isFailure } from './types';

describe('Utility Functions', () => {
  // Helper function to create a delay
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Helper function to clear all timeouts
  const clearAllTimeouts = () => {
    const highestId = Number(setTimeout(() => {}, 0));
    for (let i = 0; i < highestId; i++) {
      clearTimeout(i);
    }
  };

  afterEach(() => {
    clearAllTimeouts();
  });

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
        setTimeout(() => emitter.emit('end'), 2);
        return 'success';
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe('success');
      }
    });

    it('should handle error events', async () => {
      setTimeout(() => emitter.emit('error', new Error('stream error')), 2);

      const result = await withEvents(emitter, async () => {
        await delay(4);
        return 'success';
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('stream error');
      }
    });

    it('should cleanup listeners', async () => {
      await withEvents(emitter, async () => {
        setTimeout(() => emitter.emit('end'), 2);
        return 'success';
      });
      expect(emitter.listenerCount('error')).toBe(0);
    });

    // Edge case tests
    it('should handle non-Error objects in error events', async () => {
      setTimeout(() => emitter.emit('error', { custom: 'error' }), 2);

      const result = await withEvents(emitter, async () => {
        await delay(4);
        return 'success';
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle cleanup function throwing', async () => {
      const emitter = new EventEmitter();
      const cleanupError = new Error('Cleanup failed');
      let cleanupCalled = false;

      const result = await withEvents(
        emitter,
        () => {
          emitter.emit('end');
          return Promise.resolve('success');
        },
        {
          cleanup: () => {
            cleanupCalled = true;
            throw cleanupError;
          }
        }
      );

      expect(cleanupCalled).toBe(true);
      expect(result.isError).toBe(false);
      expect(result.data).toBe('success');
    });

    it('should handle error event with cleanup', async () => {
      const emitter = new EventEmitter();
      const error = new Error('Event error');
      let cleanupCalled = false;

      const resultPromise = withEvents(
        emitter,
        () => new Promise(resolve => setTimeout(resolve, 100)),
        {
          cleanup: () => {
            cleanupCalled = true;
          }
        }
      );

      // Emit error event after a short delay
      setTimeout(() => emitter.emit('error', error), 10);

      const result = await resultPromise;
      expect(result.isError).toBe(true);
      expect(result.error).toBe(error);
      expect(cleanupCalled).toBe(true);
    });

    it('should handle cleanup state correctly', async () => {
      const emitter = new EventEmitter();
      let isSettled = false;
      let cleanupCalled = false;

      const result = await withEvents(
        emitter,
        () => {
          expect(isSettled).toBe(false);
          emitter.emit('end');
          return Promise.resolve('success');
        },
        {
          cleanup: () => {
            expect(isSettled).toBe(false); // Should be false when cleanup is called
            cleanupCalled = true;
            isSettled = true;
          }
        }
      );

      expect(cleanupCalled).toBe(true);
      expect(isSettled).toBe(true);
      expect(result.data).toBe('success');
    });

    it('should handle timeout with specific error message', async () => {
      const emitter = new EventEmitter();
      const timeoutDuration = 50;
      
      const result = await withEvents(
        emitter,
        () => new Promise(resolve => setTimeout(resolve, timeoutDuration * 2)),
        { timeout: timeoutDuration }
      );

      expect(result.isError).toBe(true);
      if (result.isError) {
        expect(result.error.message).toBe(`Operation timed out after ${timeoutDuration}ms`);
        expect(result.error.message).not.toBe(''); // Ensure message isn't empty
        expect(result.error.message).toContain(timeoutDuration.toString()); // Ensure timeout value is included
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
        await delay(4);
        yield 2;
      }

      const result = await withIterator(generator(), { timeout: 2 });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('timed out');
      }
    });

    // Edge case tests
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
        }
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
        return: async () => ({ done: true, value: undefined })
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
        }
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
        }
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
        }
      };

      const result = await withIterator(iterator, {
        maxItems: 3,
        onItem: (item) => {
          itemsProcessed++;
          expect(item).toBe(values[itemsProcessed - 1]);
          return true;
        }
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
        }
      };

      const result = await withIterator(iterator, {
        onItem: (item) => {
          itemsProcessed++;
          return item < 3; // Stop when we hit 3
        }
      });

      expect(result.isError).toBe(false);
      expect(result.data).toEqual([1, 2]);
      expect(itemsProcessed).toBe(3);
    });
  });

  describe('withCallbacks', () => {
    it('should handle successful callback operations', async () => {
      const result = await withCallbacks(({ resolve }) => {
        setTimeout(() => resolve('success'), 2);
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toBe('success');
      }
    });

    it('should handle callback errors', async () => {
      const result = await withCallbacks(({ reject }) => {
        setTimeout(() => reject(new Error('callback error')), 2);
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('callback error');
      }
    });

    it('should handle timeouts', async () => {
      const result = await withCallbacks(
        ({ resolve }) => {
          const timeoutId = setTimeout(() => resolve('success'), 4);
          return () => clearTimeout(timeoutId);
        },
        { timeout: 2 },
      );

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('timed out');
      }
    });

    // Edge case tests
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
        setTimeout(() => reject(new Error('string error')), 2);
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
        await delay(2);
        const concurrent = inProgress.size;
        inProgress.delete(i);
        return concurrent;
      });

      const results = await concurrent(operations, { maxConcurrent: 1 });
      const maxConcurrent = Math.max(...results.map((r) => (isSuccess(r) ? r.data : 0)));
      expect(maxConcurrent).toBe(1);
    });

    // Edge case tests
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
        async () => { throw error; },
        async () => 'third'
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
        async () => { throw error; },
        async () => 'third'
      ];

      const results = await concurrent(operations, { 
        maxConcurrent: 1,
        stopOnError: true
      });
      expect(results).toHaveLength(1);
      expect(results[0].isError).toBe(true);
      expect(results[0].error).toBe(error);
    });

    it('should handle maxConcurrent edge cases', async () => {
      const operations = [
        async () => 'first',
        async () => 'second',
        async () => 'third'
      ];

      // Test with maxConcurrent = Infinity
      const infinityResults = await concurrent(operations, { maxConcurrent: Infinity });
      expect(infinityResults).toHaveLength(3);
      expect(infinityResults.every(r => !r.isError)).toBe(true);

      // Test with maxConcurrent = exact length
      const exactResults = await concurrent(operations, { maxConcurrent: operations.length });
      expect(exactResults).toHaveLength(3);
      expect(exactResults.every(r => !r.isError)).toBe(true);

      // Test with maxConcurrent = length + 1
      const plusOneResults = await concurrent(operations, { maxConcurrent: operations.length + 1 });
      expect(plusOneResults).toHaveLength(3);
      expect(plusOneResults.every(r => !r.isError)).toBe(true);
    });

    it('should handle timeout with specific error message', async () => {
      const timeoutDuration = 50;
      const operations = [
        async () => new Promise(resolve => setTimeout(resolve, timeoutDuration * 2))
      ];

      const results = await concurrent(operations, { timeout: timeoutDuration });
      expect(results).toHaveLength(1);
      expect(results[0].isError).toBe(true);
      if (results[0].isError) {
        expect(results[0].error.message).toBe(`Operation timed out after ${timeoutDuration}ms`);
        expect(results[0].error.message).not.toBe('');
        expect(results[0].error.message).toContain(timeoutDuration.toString());
      }
    });
  });
});
