import { describe, it, expect } from 'vitest';
import { toError, createSuccess, createFailure } from './error';

describe('error utilities', () => {
  describe('toError', () => {
    it('should return the same error if given an Error instance', () => {
      const error = new Error('test');
      expect(toError(error)).toBe(error);
    });

    it('should create an Error from a string', () => {
      const result = toError('test message');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('test message');
    });

    it('should handle null values with specific message', () => {
      const result = toError(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Non-error value thrown: null');
      
      // Verify the specific null case is handled
      const otherResult = toError(undefined);
      expect(result.message).not.toBe(otherResult.message);
    });

    it('should handle undefined values with specific message', () => {
      const result = toError(undefined);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Non-error value thrown: undefined');
      
      // Verify the specific undefined case is handled
      const otherResult = toError(null);
      expect(result.message).not.toBe(otherResult.message);
    });

    it('should handle objects that throw during JSON.stringify', () => {
      const circular: { a: number; self?: any } = { a: 1 };
      circular.self = circular;
      const result = toError(circular);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toContain('Non-error value thrown: [object Object]');
    });

    it('should handle different non-error values distinctly', () => {
      const nullError = toError(null);
      const undefinedError = toError(undefined);
      const numberError = toError(42);
      const booleanError = toError(true);

      // Each type should have a distinct error message
      const messages = new Set([
        nullError.message,
        undefinedError.message,
        numberError.message,
        booleanError.message
      ]);
      expect(messages.size).toBe(4);
    });
  });

  describe('createSuccess', () => {
    it('should create a success result with correct type guards', () => {
      const result = createSuccess('test');
      expect(result).toEqual({
        data: 'test',
        error: null,
        isError: false,
      });
      
      // Verify type guard properties
      expect(result.isError).toBe(false);
      expect(result.error).toBeNull();
      expect(result.data).toBe('test');
    });
  });

  describe('createFailure', () => {
    it('should create a failure result with correct type guards', () => {
      const error = new Error('test');
      const result = createFailure(error);
      expect(result).toEqual({
        data: null,
        error,
        isError: true,
      });
      
      // Verify type guard properties
      expect(result.isError).toBe(true);
      expect(result.error).toBe(error);
      expect(result.data).toBeNull();
    });
  });
}); 