/**
 * Safely converts any thrown value into an error object.
 * This ensures consistent error typing even when non-Error values are thrown.
 *
 * @param error The value that was thrown
 * @returns A proper Error object
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error(`Non-error value thrown: ${formatErrorValue(error)}`);
}

/**
 * Formats an unknown error value into a readable string
 *
 * @param error The value to format
 * @returns A string representation of the error
 */
function formatErrorValue(error: unknown): string {
  if (error === null) return 'null';
  if (error === undefined) return 'undefined';

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Creates a success result
 */
export function createSuccess<T>(data: T) {
  return { data, error: null, isError: false as const };
}

/**
 * Creates a failure result
 */
export function createFailure<E>(error: E) {
  return { data: null, error, isError: true as const };
}

/**
 * Handles an error value, converting it to the appropriate type
 */
export function handleError<E = Error>(error: unknown): E {
  return (error instanceof Error ? error : toError(error)) as E;
}
