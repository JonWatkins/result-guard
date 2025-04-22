import { Result } from './types';
import { createSuccess, createFailure, handleError } from './error';
import { handlePromise, safeResolve } from './promise';
import { concurrent, withEvents, withIterator, withCallbacks, pipe } from './utils';

export * from './types';
export { concurrent, withEvents, withIterator, withCallbacks, pipe };

/**
 * result-guard: Type-safe error handling with discriminated unions and type guards.
 * Wraps a synchronous or asynchronous operation in a type-safe Result type.
 * The Result type provides a discriminated union with type guards for safe error handling.
 *
 * @template T The type of the successful result data
 * @template E The type of the error (defaults to Error)
 *
 * @param fn A function that returns either T or Promise<T>
 * @returns For sync functions: Result<T, E>
 *          For async functions: Promise<Result<T, E>>
 *
 * @example
 * ```typescript
 * import { tryCatch, isSuccess, isFailure } from 'result-guard';
 *
 * // Synchronous usage with type guard
 * const result = tryCatch(() => "hello");
 * if (isSuccess(result)) {
 *   console.log(result.data); // TypeScript knows data is string
 * }
 *
 * // Asynchronous usage with destructuring
 * const { data, error } = await tryCatch(async () => {
 *   const response = await fetch("https://api.example.com");
 *   return response.json();
 * });
 *
 * // Custom error type
 * class CustomError extends Error {
 *   constructor(public code: number, message: string) {
 *     super(message);
 *   }
 * }
 *
 * const result = tryCatch<string, CustomError>(() => {
 *   throw new CustomError(400, "Bad Request");
 * });
 * if (isFailure(result)) {
 *   console.log(result.error.code); // TypeScript knows error is CustomError
 * }
 *
 * // Concurrent operations with error handling
 * const results = await Promise.all([
 *   tryCatch(async () => "first"),
 *   tryCatch(async () => {
 *     throw new Error("second failed");
 *   }),
 *   tryCatch(async () => "third")
 * ]);
 *
 * // Each operation completes independently
 * const [first, second, third] = results;
 *
 * // Check individual results
 * if (isSuccess(first)) console.log("First succeeded:", first.data);
 * if (isFailure(second)) console.log("Second failed:", second.error);
 * if (isSuccess(third)) console.log("Third succeeded:", third.data);
 *
 * // Check if any operation failed
 * const hasErrors = results.some(result => result.isError);
 * if (hasErrors) {
 *   const errors = results
 *     .filter(isFailure)
 *     .map(result => result.error);
 *   console.log("Failed operations:", errors);
 * }
 * ```
 *
 * Features:
 * - Type-safe error handling with discriminated unions
 * - Handles both synchronous and asynchronous functions
 * - Converts non-Error throws to proper Error objects
 * - Preserves error inheritance chains
 * - Supports custom error types
 * - Handles Promise-like objects and async iterators
 * - Provides type guards for type narrowing
 * - Enables partial success in concurrent operations
 * - Allows granular error handling in Promise.all
 *
 * @throws Never - All errors are caught and returned in the Result type
 */
export function tryCatch<T, E = Error>(fn: () => T): Result<T, E>;
export function tryCatch<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>>;

export function tryCatch<T, E = Error>(
  fn: (() => T) | (() => Promise<T>),
): Promise<Result<T, E>> | Result<T, E> {
  try {
    const result = fn();

    if (result instanceof Promise) {
      return handlePromise<T, E>(safeResolve(result));
    }

    return createSuccess<T>(result);
  } catch (error) {
    return createFailure<E>(handleError(error));
  }
}
