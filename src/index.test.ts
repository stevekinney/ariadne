import { describe, expect, it } from 'bun:test';

import {
  AriadneConfigurationSchema,
  AriadneError,
  AriadneErrorCode,
  isAriadneError,
} from './index.js';

describe('Ariadne Main API', () => {
  describe('Configuration Validation', () => {
    it('should validate configuration with valid data', () => {
      const validConfig = {
        tokenBudget: 5000,
        includeChildren: false,
        debug: true,
      };

      const result = AriadneConfigurationSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokenBudget).toBe(5000);
        expect(result.data.includeChildren).toBe(false);
        expect(result.data.debug).toBe(true);
      }
    });

    it('should reject invalid token budget', () => {
      const invalidConfig = { tokenBudget: -1 };
      const result = AriadneConfigurationSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should apply default values', () => {
      const result = AriadneConfigurationSchema.parse({});
      expect(result.tokenBudget).toBe(4000);
      expect(result.includeChildren).toBe(true);
      expect(result.debug).toBe(false);
    });

    it('should reject extra properties', () => {
      const configWithExtra = {
        tokenBudget: 5000,
        extraProperty: 'not allowed',
      };
      const result = AriadneConfigurationSchema.safeParse(configWithExtra);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should export error types and utilities', () => {
      expect(AriadneError).toBeDefined();
      expect(isAriadneError).toBeDefined();
    });

    it('should create specific error types', () => {
      const error = AriadneError.invalidDocument();
      expect(error).toBeInstanceOf(AriadneError);
      expect(error.code).toBe(AriadneErrorCode.INVALID_DOCUMENT);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create token limit exceeded errors', () => {
      const error = AriadneError.tokenLimitExceeded(4000);
      expect(error.code).toBe(AriadneErrorCode.TOKEN_LIMIT_EXCEEDED);
      expect(error.details?.['limit']).toBe(4000);
    });

    it('should create worker errors', () => {
      const error = AriadneError.workerError('Worker failed to start');
      expect(error.code).toBe(AriadneErrorCode.WORKER_ERROR);
      expect(error.message).toContain('Worker failed to start');
    });

    it('should identify AriadneError instances', () => {
      const ariadneError = AriadneError.invalidDocument();
      const regularError = new Error('Regular error');

      expect(isAriadneError(ariadneError)).toBe(true);
      expect(isAriadneError(regularError)).toBe(false);
      expect(isAriadneError(null)).toBe(false);
      expect(isAriadneError(undefined)).toBe(false);
    });
  });
});
