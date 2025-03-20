/**
 * Represents a successful result containing data and no error.
 * @template T The type of the successful result data
 */
export type Success<T> = {
  data: T;
  error: null;
  isError: false;
};

/**
 * Represents a failure result containing an error and no data.
 * @template E The type of the error
 */
export type Failure<E> = {
  data: null;
  error: E;
  isError: true;
};

/**
 * A discriminated union type representing either a successful result with data
 * or a failure result with an error.
 *
 * @template T The type of the successful result data
 * @template E The type of the error
 *
 * @example
 * ```typescript
 * // Success case
 * const success: Result<string, Error> = { data: "hello", error: null, isError: false };
 *
 * // Error case
 * const failure: Result<string, Error> = { data: null, error: new Error(), isError: true };
 * ```
 */
export type Result<T, E> = Success<T> | Failure<E>;

/**
 * Common options for operations that support timeouts.
 *
 * @property timeout Optional timeout in milliseconds after which the operation will be cancelled
 *
 * @example
 * ```typescript
 * const options: TimeoutOptions = { timeout: 5000 }; // 5 second timeout
 * ```
 */
export type TimeoutOptions = {
  timeout?: number;
};

/**
 * Function type for cleanup operations that can be synchronous or asynchronous.
 * Used to properly release resources or perform cleanup tasks after an operation.
 *
 * @example
 * ```typescript
 * const cleanup: CleanupFunction = async () => {
 *   await connection.close();
 *   clearTimeout(timeoutId);
 * };
 * ```
 */
export type CleanupFunction = () => void | Promise<void>;

/**
 * Options for event handling operations.
 * Extends TimeoutOptions to include event-specific configuration.
 *
 * @property errorEvent The name of the event that indicates an error (default: 'error')
 * @property cleanup Optional function to clean up resources
 *
 * @example
 * ```typescript
 * const options: EventOptions = {
 *   timeout: 5000,
 *   errorEvent: 'error',
 *   cleanup: () => stream.destroy()
 * };
 * ```
 */
export type EventOptions = TimeoutOptions & {
  errorEvent?: string;
  cleanup?: CleanupFunction;
};

/**
 * Options for iterator handling operations.
 * Extends TimeoutOptions to include iterator-specific configuration.
 *
 * @template T The type of items yielded by the iterator
 * @property maxItems Maximum number of items to collect before stopping
 * @property onItem Optional callback for each item, return false to stop iteration
 *
 * @example
 * ```typescript
 * const options: IteratorOptions<number> = {
 *   timeout: 5000,
 *   maxItems: 10,
 *   onItem: (value) => value < 100 // Stop if value >= 100
 * };
 * ```
 */
export type IteratorOptions<T> = TimeoutOptions & {
  maxItems?: number;
  onItem?: (item: T) => boolean | Promise<boolean>;
};

/**
 * Options for concurrent operations.
 * Extends TimeoutOptions to include concurrency control configuration.
 *
 * @property maxConcurrent Maximum number of operations to run simultaneously
 * @property stopOnError Whether to stop processing on first error
 *
 * @example
 * ```typescript
 * const options: ConcurrentOptions = {
 *   timeout: 5000,
 *   maxConcurrent: 3,
 *   stopOnError: true
 * };
 * ```
 */
export type ConcurrentOptions = TimeoutOptions & {
  maxConcurrent?: number;
  stopOnError?: boolean;
};

/**
 * Handlers for callback-style operations.
 * Provides typed resolve and reject functions for Promise-like behavior.
 *
 * @template T The type of the successful value
 * @property resolve Function to call with the successful result
 * @property reject Function to call with an error
 *
 * @example
 * ```typescript
 * const handlers: CallbackHandlers<string> = {
 *   resolve: (value) => console.log('Success:', value),
 *   reject: (error) => console.error('Error:', error)
 * };
 * ```
 */
export type CallbackHandlers<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

/**
 * Type guard to check if a Result is a Success.
 * Narrows the type to include the data property.
 *
 * @template T The type of the successful result data
 * @template E The type of the error
 * @returns True if the result is a Success, with type narrowing
 *
 * @example
 * ```typescript
 * const result = await tryCatch(async () => "hello");
 * if (isSuccess(result)) {
 *   console.log(result.data.toUpperCase()); // TypeScript knows data is string
 * }
 * ```
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return !result.isError;
}

/**
 * Type guard to check if a Result is a Failure.
 * Narrows the type to include the error property.
 *
 * @template T The type of the successful result data
 * @template E The type of the error
 * @returns True if the result is a Failure, with type narrowing
 *
 * @example
 * ```typescript
 * const result = await tryCatch(async () => "hello");
 * if (isFailure(result)) {
 *   console.error(result.error.message); // TypeScript knows error is Error
 * }
 * ```
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.isError;
}
