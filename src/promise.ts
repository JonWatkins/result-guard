import { Result } from './types';
import { createSuccess, createFailure, handleError } from './error';

/**
 * Handles a promise-returning function, ensuring all errors are caught
 * and converted to the appropriate Result type.
 *
 * @param promise The promise to handle
 * @returns A promise that resolves to a Result
 */
export async function handlePromise<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return createSuccess(data);
  } catch (error) {
    return createFailure(handleError<E>(error));
  }
}

/**
 * Safely resolves a promise, ensuring it's properly wrapped in Promise.resolve
 * to handle both Promise-like objects and regular values.
 *
 * @param value The value to resolve
 * @returns A proper Promise
 */
export function safeResolve<T>(value: T | PromiseLike<T>): Promise<T> {
  return Promise.resolve(value).catch((error) => {
    throw handleError(error);
  });
}
