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
import { Result } from './types';
import { createSuccess, createFailure, handleError } from './error';
import { handlePromise, safeResolve } from './promise';
export * from './types';

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
export function tryCatch<T, E = Error>(fn: (() => T) | (() => Promise<T>)): Promise<Result<T, E>> | Result<T, E> {
  if (stryMutAct_9fa48("26")) {
    {}
  } else {
    stryCov_9fa48("26");
    try {
      if (stryMutAct_9fa48("27")) {
        {}
      } else {
        stryCov_9fa48("27");
        const result = fn();
        if (stryMutAct_9fa48("29") ? false : stryMutAct_9fa48("28") ? true : (stryCov_9fa48("28", "29"), result instanceof Promise)) {
          if (stryMutAct_9fa48("30")) {
            {}
          } else {
            stryCov_9fa48("30");
            return handlePromise<T, E>(safeResolve(result));
          }
        }
        return createSuccess<T>(result);
      }
    } catch (error) {
      if (stryMutAct_9fa48("31")) {
        {}
      } else {
        stryCov_9fa48("31");
        return createFailure<E>(handleError(error));
      }
    }
  }
}