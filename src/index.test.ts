import { describe, expect, it } from 'bun:test';

import {
  ThreadlineConfigurationSchema,
  ThreadlineError,
  ThreadlineErrorCode,
  isThreadlineError,
} from './index.js';

describe('Threadline Main API', () => {
  describe('Configuration Validation', () => {
    it('should validate configuration with valid data', () => {
      const validConfig = {
        tokenBudget: 5000,
        includeChildren: false,
        debug: true,
      };

      const result = ThreadlineConfigurationSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokenBudget).toBe(5000);
        expect(result.data.includeChildren).toBe(false);
        expect(result.data.debug).toBe(true);
      }
    });

    it('should reject invalid token budget', () => {
      const invalidConfig = { tokenBudget: -1 };
      const result = ThreadlineConfigurationSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const result = ThreadlineConfigurationSchema.parse({});
      expect(result.tokenBudget).toBe(4000);
      expect(result.includeChildren).toBe(true);
      expect(result.debug).toBe(false);
    });

    it('should reject extra properties', () => {
      const configWithExtra = {
        tokenBudget: 5000,
        extraProperty: 'not allowed',
      };
      const result = ThreadlineConfigurationSchema.safeParse(configWithExtra);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should export error types and utilities', () => {
      expect(ThreadlineError).toBeDefined();
      expect(isThreadlineError).toBeDefined();
    });

    it('should create specific error types', () => {
      const error = ThreadlineError.invalidDocument();
      expect(error).toBeInstanceOf(ThreadlineError);
      expect(error.code).toBe(ThreadlineErrorCode.INVALID_DOCUMENT);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create token limit exceeded errors', () => {
      const error = ThreadlineError.tokenLimitExceeded(4000);
      expect(error.code).toBe(ThreadlineErrorCode.TOKEN_LIMIT_EXCEEDED);
      expect(error.details?.['limit']).toBe(4000);
    });

    it('should create worker errors', () => {
      const error = ThreadlineError.workerError('Worker failed to start');
      expect(error.code).toBe(ThreadlineErrorCode.WORKER_ERROR);
      expect(error.message).toContain('Worker failed to start');
    });

    it('should identify ThreadlineError instances', () => {
      const ariadneError = ThreadlineError.invalidDocument();
      const regularError = new Error('Regular error');

      expect(isThreadlineError(ariadneError)).toBe(true);
      expect(isThreadlineError(regularError)).toBe(false);
      expect(isThreadlineError(null)).toBe(false);
      expect(isThreadlineError(undefined)).toBe(false);
    });
  });
});
