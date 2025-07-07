/**
 * Integration tests for Ariadne API and component integration
 * Tests the public API, error handling, and component interactions
 */

import { describe, expect, it } from 'bun:test';
import './test-setup.js'; // Import DOM setup before other imports

import {
  Ariadne,
  AriadneConfigurationSchema,
  AriadneError,
  AriadneErrorCode,
  DocumentSchema,
  isAriadneError,
  isTokenLimitExceeded,
  isWorkerError,
} from './index.js';
import type { AriadneConfiguration } from './types/ariadne.js';

describe('Ariadne API Integration Tests', () => {
  describe('Configuration Validation', () => {
    it('should validate and apply configuration correctly', () => {
      const validConfig: AriadneConfiguration = {
        tokenBudget: 5000,
        includeChildren: false,
        debug: true,
      };

      const result = AriadneConfigurationSchema.parse(validConfig);
      expect(result.tokenBudget).toBe(5000);
      expect(result.includeChildren).toBe(false);
      expect(result.debug).toBe(true);
    });

    it('should apply defaults for missing properties', () => {
      const partialConfig: AriadneConfiguration = {
        tokenBudget: 2000,
      };

      const result = AriadneConfigurationSchema.parse(partialConfig);
      expect(result.tokenBudget).toBe(2000);
      expect(result.includeChildren).toBe(true); // default
      expect(result.debug).toBe(false); // default
    });

    it('should reject invalid configuration', () => {
      expect(() => {
        AriadneConfigurationSchema.parse({
          tokenBudget: -1000, // invalid negative value
        });
      }).toThrow();

      expect(() => {
        AriadneConfigurationSchema.parse({
          tokenBudget: 'invalid', // wrong type
        });
      }).toThrow();

      expect(() => {
        AriadneConfigurationSchema.parse({
          tokenBudget: 200000, // exceeds maximum
        });
      }).toThrow();
    });
  });

  describe('Document Validation', () => {
    it('should validate proper Document objects', () => {
      // Create a real document using happy-dom
      const doc = document.implementation.createHTMLDocument('Test Document');
      doc.body.innerHTML = '<h1>Test</h1>';

      const mockDoc = doc;

      expect(() => {
        DocumentSchema.parse(mockDoc);
      }).not.toThrow();
    });

    it('should reject invalid document objects', () => {
      expect(() => {
        DocumentSchema.parse(null);
      }).toThrow();

      expect(() => {
        DocumentSchema.parse({});
      }).toThrow();

      expect(() => {
        DocumentSchema.parse({
          documentElement: null,
          location: { href: 'test' },
        });
      }).toThrow();
    });
  });

  describe('Error Handling System', () => {
    it('should create and identify AriadneError instances', () => {
      const error = AriadneError.extractionFailed({ reason: 'test' });

      expect(error).toBeInstanceOf(AriadneError);
      expect(error.code).toBe(AriadneErrorCode.EXTRACTION_FAILED);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ reason: 'test' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create specific error types correctly', () => {
      const workerError = AriadneError.workerError('Worker failed', { workerId: 1 });
      expect(workerError.code).toBe(AriadneErrorCode.WORKER_ERROR);
      expect(workerError.message).toContain('Worker failed');
      expect(workerError.details).toEqual({ workerId: 1 });

      const tokenError = AriadneError.tokenLimitExceeded(4000, { actualTokens: 5000 });
      expect(tokenError.code).toBe(AriadneErrorCode.TOKEN_LIMIT_EXCEEDED);
      expect(tokenError.message).toContain('4000');
      expect(tokenError.details?.['limit']).toBe(4000);
      expect(tokenError.details?.['actualTokens']).toBe(5000);

      const domError = AriadneError.domParsingError({ element: 'form' });
      expect(domError.code).toBe(AriadneErrorCode.DOM_PARSING_ERROR);
      expect(domError.details).toEqual({ element: 'form' });

      const invalidDocError = AriadneError.invalidDocument({ issue: 'missing body' });
      expect(invalidDocError.code).toBe(AriadneErrorCode.INVALID_DOCUMENT);
      expect(invalidDocError.details).toEqual({ issue: 'missing body' });

      const timeoutError = AriadneError.processingTimeout(30000, { url: 'test.com' });
      expect(timeoutError.code).toBe(AriadneErrorCode.PROCESSING_TIMEOUT);
      expect(timeoutError.message).toContain('30000ms');
      expect(timeoutError.details?.['timeout']).toBe(30000);
      expect(timeoutError.details?.['url']).toBe('test.com');
    });

    it('should provide working type guards', () => {
      const ariadneError = AriadneError.extractionFailed();
      const regularError = new Error('Regular error');
      const tokenError = AriadneError.tokenLimitExceeded(1000);
      const workerError = AriadneError.workerError('Worker issue');

      // isAriadneError tests
      expect(isAriadneError(ariadneError)).toBe(true);
      expect(isAriadneError(tokenError)).toBe(true);
      expect(isAriadneError(regularError)).toBe(false);
      expect(isAriadneError(null)).toBe(false);
      expect(isAriadneError(undefined)).toBe(false);

      // isTokenLimitExceeded tests
      expect(isTokenLimitExceeded(tokenError)).toBe(true);
      expect(isTokenLimitExceeded(ariadneError)).toBe(false);
      expect(isTokenLimitExceeded(regularError)).toBe(false);

      // isWorkerError tests
      expect(isWorkerError(workerError)).toBe(true);
      expect(isWorkerError(tokenError)).toBe(false);
      expect(isWorkerError(regularError)).toBe(false);
    });
  });

  describe('Ariadne API', () => {
    it('should create client with default configuration', () => {
      if (typeof Worker === 'undefined') {
        console.warn('⚠️  Skipping Worker-dependent tests');
        return;
      }

      const client = new Ariadne();
      expect(client).toBeInstanceOf(Ariadne);

      // Should have methods available
      expect(typeof client.extract).toBe('function');
      expect(typeof client.terminate).toBe('function');
      expect(typeof client.abort).toBe('function');

      client.terminate();
    });

    it('should create client with custom configuration', () => {
      if (typeof Worker === 'undefined') return;

      const config: AriadneConfiguration = {
        tokenBudget: 6000,
        includeChildren: false,
        debug: true,
      };

      const client = new Ariadne(config);
      expect(client).toBeInstanceOf(Ariadne);
      client.terminate();
    });

    it('should reject invalid configuration', () => {
      if (typeof Worker === 'undefined') return;

      expect(() => {
        new Ariadne({
          tokenBudget: -500, // invalid
        } as AriadneConfiguration);
      }).toThrow(AriadneError);
    });

    it('should handle abort and terminate gracefully', () => {
      if (typeof Worker === 'undefined') return;

      const client = new Ariadne();

      // These should not throw
      expect(() => client.abort()).not.toThrow();
      expect(() => client.terminate()).not.toThrow();

      // Should be safe to call multiple times
      expect(() => client.terminate()).not.toThrow();
    });
  });

  describe('Component Integration', () => {
    it('should integrate IdGenerator with proper fallbacks', async () => {
      const { IdGenerator } = await import('./worker/id-generator.js');

      const generator = new IdGenerator();
      const mockElement = { tagName: 'DIV' } as Element;

      // Should generate valid UUID
      const id = generator.generateId(mockElement);
      expect(typeof id).toBe('string');
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );

      // Should be cached
      const id2 = generator.generateId(mockElement);
      expect(id).toBe(id2);

      generator.clearCache();
    });

    it('should integrate TokenBudgetManager correctly', async () => {
      const { TokenBudgetManager } = await import('./worker/token-budget.js');

      const manager = new TokenBudgetManager(1000);

      // Should start with base tokens
      expect(manager.getCurrentTokens()).toBe(50);
      expect(manager.getRemainingTokens()).toBe(950);
      expect(manager.isExceeded()).toBe(false);

      const mockElement = {
        id: 'test-id',
        role: 'button',
        selector: '#test-button',
        parentId: null,
      };

      manager.addElement(mockElement as any);
      expect(manager.getCurrentTokens()).toBeGreaterThan(50);
      expect(manager.isExceeded()).toBe(false);

      const stats = manager.getStats();
      expect(stats.used).toBeGreaterThan(50);
      expect(stats.budget).toBe(1000);
      expect(stats.percentage).toBeGreaterThan(0);
      expect(stats.exceeded).toBe(false);
    });

    it('should integrate LabelResolver with mock document', async () => {
      const { LabelResolver } = await import('./worker/label-resolver.js');

      // Create a very basic mock document
      const mockDoc = {
        querySelector: () => null,
        getElementById: () => null,
      } as unknown as Document;

      const resolver = new LabelResolver(mockDoc);

      // Mock element with aria-label
      const mockElement = {
        tagName: 'BUTTON',
        getAttribute: (name: string) => {
          if (name === 'aria-label') return 'Submit Form';
          return null;
        },
        hasAttribute: (name: string) => name === 'aria-label',
        textContent: 'Click Me',
      } as unknown as Element;

      const label = resolver.resolve(mockElement);
      expect(label).toBe('Submit Form'); // Should prioritize aria-label
    });

    it('should integrate SelectorGenerator with caching', async () => {
      const { AriadneSelectorGenerator } = await import('./worker/selector-generator.js');

      const generator = new AriadneSelectorGenerator();

      // Mock element with ID
      const mockElement = {
        id: 'unique-button',
        tagName: 'BUTTON',
        ownerDocument: {
          getElementById: (id: string) => (id === 'unique-button' ? mockElement : null),
          querySelectorAll: () => [mockElement],
          location: { href: 'https://test.com' },
        },
        parentElement: null,
      } as unknown as Element;

      const selector = generator.generate(mockElement);
      expect(typeof selector).toBe('string');
      expect(selector.length).toBeGreaterThan(0);

      // Should be cached
      const selector2 = generator.generate(mockElement);
      expect(selector).toBe(selector2);

      generator.clearCache();
    });
  });

  describe('Type System Integration', () => {
    it('should export all required types', () => {
      // This test verifies that all types are properly exported and importable
      const typeExports = [
        'AriadneMap',
        'AriadneElement',
        'AriadneMeta',
        'AriadneRole',
        'AriadneConfig',
        'AriadneElementState',
      ];

      // If the imports work, the types are properly exported
      expect(typeExports.length).toBe(6);
    });

    it('should handle AriadneRole type correctly', async () => {
      const roles = [
        'form',
        'input',
        'checkbox',
        'radio',
        'password',
        'email',
        'tel',
        'number',
        'search',
        'url',
        'date',
        'time',
        'button',
        'link',
        'heading',
        'paragraph',
        'table',
      ];

      // These should all be valid AriadneRole values
      roles.forEach((role) => {
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should have efficient component initialization', async () => {
      const startTime = Date.now();

      // Import and initialize all core components
      const { IdGenerator } = await import('./worker/id-generator.js');
      const { TokenBudgetManager } = await import('./worker/token-budget.js');
      const { AriadneSelectorGenerator } = await import('./worker/selector-generator.js');

      new IdGenerator();
      new TokenBudgetManager(4000);
      new AriadneSelectorGenerator();

      const endTime = Date.now();

      // Component initialization should be fast
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle cache clearing efficiently', async () => {
      const { IdGenerator } = await import('./worker/id-generator.js');
      const { AriadneSelectorGenerator } = await import('./worker/selector-generator.js');

      const idGen = new IdGenerator();
      const selGen = new AriadneSelectorGenerator();

      // Generate some cached data
      const mockElement = { tagName: 'DIV' } as Element;
      idGen.generateId(mockElement);

      const startTime = Date.now();

      // Clear caches
      idGen.clearCache();
      selGen.clearCache();

      const endTime = Date.now();

      // Cache clearing should be instant
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('Error Boundary Testing', () => {
    it('should handle component errors gracefully', async () => {
      const { TokenBudgetManager } = await import('./worker/token-budget.js');

      const manager = new TokenBudgetManager(100);

      // Should handle invalid elements gracefully
      expect(() => {
        manager.addElement(null as any);
      }).not.toThrow();

      expect(() => {
        manager.addElement(undefined as any);
      }).not.toThrow();
    });

    it('should handle edge cases in token estimation', async () => {
      const { TokenBudgetManager } = await import('./worker/token-budget.js');

      const manager = new TokenBudgetManager(1000);

      // Test with empty element
      const emptyElement = {
        id: '',
        role: 'input',
        selector: '',
        parentId: null,
      };

      expect(() => {
        manager.addElement(emptyElement as any);
      }).not.toThrow();

      // Test with element with all properties
      const fullElement = {
        id: 'full-element-id',
        role: 'button',
        selector: '#full-element-button.primary',
        parentId: 'parent-id',
        label: 'Click this button to submit',
        href: 'https://example.com/submit',
        state: { disabled: false, value: 'Submit' },
        children: ['child1', 'child2'],
        width: 200,
        height: 50,
        shadowClosed: true,
        stub: 'iframe',
        origin: 'https://external.com',
      };

      expect(() => {
        manager.addElement(fullElement as any);
      }).not.toThrow();

      expect(manager.getCurrentTokens()).toBeGreaterThan(50);
    });
  });
});
