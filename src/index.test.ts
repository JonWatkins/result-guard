import { describe, it, expect } from 'vitest';
import { tryCatch } from './index';

describe('tryCatch', () => {
  describe('synchronous functions', () => {
    it('should handle successful synchronous operations', () => {
      const { data, error } = tryCatch(() => 'success');
      expect(data).toBe('success');
      expect(error).toBeNull();
    });

    it('should handle thrown errors in synchronous operations', () => {
      const error = new Error('sync error');
      const { data, error: caught } = tryCatch(() => {
        throw error;
      });
      expect(data).toBeNull();
      expect(caught).toBe(error);
    });
  });

  describe('asynchronous functions', () => {
    it('should handle successful async operations', async () => {
      const { data, error } = await tryCatch(async () => 'async success');
      expect(data).toBe('async success');
      expect(error).toBeNull();
    });

    it('should handle thrown errors in async operations', async () => {
      const error = new Error('async error');
      const { data, error: caught } = await tryCatch(async () => {
        throw error;
      });
      expect(data).toBeNull();
      expect(caught).toBe(error);
    });

    it('should handle rejected promises', async () => {
      const error = new Error('rejected promise');
      const { data, error: caught } = await tryCatch(async () => Promise.reject(error));
      expect(data).toBeNull();
      expect(caught).toBe(error);
    });

    it('should handle errors thrown after await', async () => {
      const error = new Error('error after await');
      const { data, error: caught } = await tryCatch(async () => {
        await Promise.resolve();
        throw error;
      });
      expect(data).toBeNull();
      expect(caught).toBe(error);
    });
  });

  describe('type handling', () => {
    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(
          public code: number,
          message: string,
        ) {
          super(message);
        }
      }

      const error = new CustomError(400, 'bad request');
      const result = tryCatch<string, CustomError>(() => {
        throw error;
      });

      expect(result).toEqual({ data: null, error, isError: true });
      if (result.error) {
        expect(result.error.code).toBe(400);
      }
    });

    it('should handle different return types', async () => {
      interface User {
        id: number;
        name: string;
      }

      const user: User = { id: 1, name: 'John' };
      const result = await tryCatch<User>(async () => user);

      expect(result).toEqual({ data: user, error: null, isError: false });
      if (result.data) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe('John');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle nested promises', async () => {
      const { data, error } = await tryCatch(async () => {
        const inner = await Promise.resolve('inner');
        return Promise.resolve(inner + '_outer');
      });
      expect(data).toBe('inner_outer');
      expect(error).toBeNull();
    });

    it('should handle null and undefined', async () => {
      const { data: nullData, error: nullError } = await tryCatch(async () => null);
      expect(nullData).toBeNull();
      expect(nullError).toBeNull();

      const { data: undefinedData, error: undefinedError } = await tryCatch(async () => undefined);
      expect(undefinedData).toBeUndefined();
      expect(undefinedError).toBeNull();
    });

    it('should handle non-Error objects thrown', () => {
      const { data: stringData, error: stringError } = tryCatch(() => {
        throw 'string error';
      });
      expect(stringData).toBeNull();
      expect(stringError).toBeInstanceOf(Error);
      expect(stringError?.message).toBe('string error');

      const { data: objectData, error: objectError } = tryCatch(() => {
        throw { code: 400 };
      });
      expect(objectData).toBeNull();
      expect(objectError).toBeInstanceOf(Error);
      expect(objectError?.message).toContain('400');
    });

    it('should handle promise timeouts', async () => {
      const { data, error } = await tryCatch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'timeout done';
      });
      expect(data).toBe('timeout done');
      expect(error).toBeNull();
    });

    it('should handle async generators', async () => {
      async function* generator() {
        yield 1;
        yield 2;
        return 3;
      }

      const { data, error } = await tryCatch(async () => {
        const gen = generator();
        const values = [];
        for await (const value of gen) {
          values.push(value);
        }
        return values;
      });

      expect(data).toEqual([1, 2]);
      expect(error).toBeNull();
    });

    it('should preserve error inheritance chain', () => {
      class BaseError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'BaseError';
        }
      }

      class ChildError extends BaseError {
        constructor(message: string) {
          super(message);
          this.name = 'ChildError';
        }
      }

      const error = new ChildError('inheritance test');
      const { data, error: caught } = tryCatch(() => {
        throw error;
      });

      expect(caught).toBe(error);
      expect(caught instanceof ChildError).toBe(true);
      expect(caught instanceof BaseError).toBe(true);
      expect(caught instanceof Error).toBe(true);
      expect(data).toBeNull();
    });

    it('should handle concurrent promises', async () => {
      const results = await Promise.all([
        tryCatch(async () => 'first'),
        tryCatch(async () => {
          throw new Error('second failed');
        }),
        tryCatch(async () => 'third'),
      ]);

      const [
        { data: firstData, error: firstError },
        { data: secondData, error: secondError },
        { data: thirdData, error: thirdError },
      ] = results;

      expect(firstData).toBe('first');
      expect(firstError).toBeNull();
      expect(secondData).toBeNull();
      expect(secondError).toEqual(new Error('second failed'));
      expect(thirdData).toBe('third');
      expect(thirdError).toBeNull();
    });

    it('should handle deeply nested async operations', async () => {
      const { data, error } = await tryCatch(async () => {
        const level1 = await Promise.resolve('1');
        const level2 = await new Promise<string>((resolve) =>
          setTimeout(() => resolve(level1 + '2'), 10),
        );
        const level3 = await Promise.resolve(level2 + '3');
        return level3;
      });

      expect(data).toBe('123');
      expect(error).toBeNull();
    });

    it('should handle throwing inside promise chains', async () => {
      const { data, error } = await tryCatch(async () => {
        return Promise.resolve('start')
          .then(() => 'middle')
          .then(() => {
            throw new Error('chain error');
          });
      });

      expect(data).toBeNull();
      expect(error).toEqual(new Error('chain error'));
    });
  });

  describe('error handling edge cases', () => {
    it('should handle errors in Promise.then callbacks', async () => {
      const { data, error } = await tryCatch(async () => {
        return Promise.resolve('data').then(() => {
          throw new Error('then error');
        });
      });

      expect(data).toBeNull();
      expect(error).toEqual(new Error('then error'));
    });

    it('should handle pre-rejected promises', async () => {
      const { data, error } = await tryCatch(() => Promise.reject(new Error('pre-rejected')));

      expect(data).toBeNull();
      expect(error).toEqual(new Error('pre-rejected'));
    });

    it('should handle non-Error throws', async () => {
      const stringError = await tryCatch(async () => {
        throw 'string error';
      });
      expect(stringError.error).toBeInstanceOf(Error);
      expect(stringError.error?.message).toBe('string error');

      const numberError = await tryCatch(async () => {
        throw 404;
      });
      expect(numberError.error).toBeInstanceOf(Error);
      expect(numberError.error?.message).toContain('404');

      const objectError = await tryCatch(async () => {
        throw { code: 'CUSTOM_ERROR' };
      });
      expect(objectError.error).toBeInstanceOf(Error);
      expect(objectError.error?.message).toContain('CUSTOM_ERROR');
    });

    it('should handle null/undefined throws', async () => {
      const nullError = await tryCatch(async () => {
        throw null;
      });
      expect(nullError.error).toBeInstanceOf(Error);
      expect(nullError.error?.message).toContain('null');

      const undefinedError = await tryCatch(async () => {
        throw undefined;
      });
      expect(undefinedError.error).toBeInstanceOf(Error);
      expect(undefinedError.error?.message).toContain('undefined');
    });

    it('should handle errors in nested promise chains', async () => {
      const { data, error } = await tryCatch(async () => {
        return Promise.resolve()
          .then(() => Promise.resolve())
          .then(() => {
            throw new Error('nested error');
          })
          .then(() => 'unreachable');
      });

      expect(data).toBeNull();
      expect(error).toEqual(new Error('nested error'));
    });

    it('should preserve error stack traces', async () => {
      const { error } = await tryCatch(async () => {
        throw new Error('error with stack');
      });

      expect(error?.stack).toBeDefined();
      expect(error?.stack).toContain('error with stack');
    });

    it('should handle async errors after microtasks', async () => {
      const { data, error } = await tryCatch(async () => {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
        throw new Error('delayed error');
      });

      expect(data).toBeNull();
      expect(error).toEqual(new Error('delayed error'));
    });
  });
});
