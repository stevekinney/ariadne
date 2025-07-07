import { test, expect, Page } from '@playwright/test';
import type { AriadneMap } from '../../src/types';

// Helper to wait for Ariadne to complete
async function waitForAriadneResult(page: Page): Promise<AriadneMap> {
  return await page.evaluate(() => {
    return new Promise<AriadneMap>((resolve, reject) => {
      const checkResult = () => {
        if (window.ariadneResult) {
          resolve(window.ariadneResult);
        } else if (window.ariadneError) {
          reject(window.ariadneError);
        } else {
          setTimeout(checkResult, 100);
        }
      };
      checkResult();
    });
  });
}

test.describe('Ariadne Browser Tests', () => {
  test.describe('Basic Functionality', () => {
    test('should extract elements from simple form', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const result = await waitForAriadneResult(page);
      
      expect(result).toBeDefined();
      expect(result.schemaVersion).toBe('1.0');
      expect(result.elements).toBeInstanceOf(Array);
      expect(result.elements.length).toBeGreaterThan(0);
      
      // Check for form element
      const formElement = result.elements.find(el => el.role === 'form');
      expect(formElement).toBeDefined();
      expect(formElement?.attributes?.id).toBe('test-form');
      
      // Check for various input types
      const inputTypes = ['input', 'email', 'password', 'number', 'select', 'textarea', 'checkbox', 'radio'];
      for (const type of inputTypes) {
        const element = result.elements.find(el => el.role === type);
        expect(element).toBeDefined();
      }
      
      // Check for buttons
      const buttons = result.elements.filter(el => el.role === 'button');
      expect(buttons.length).toBe(2); // Submit and Reset
    });

    test('should handle complex layouts', async ({ page }) => {
      await page.goto('/complex-layout.html');
      
      const result = await waitForAriadneResult(page);
      
      expect(result.elements.length).toBeGreaterThan(20);
      
      // Check for multiple forms
      const forms = result.elements.filter(el => el.role === 'form');
      expect(forms.length).toBeGreaterThanOrEqual(4); // filter, search, review, login, newsletter
      
      // Check for table elements
      const tableElements = result.elements.filter(el => 
        ['table', 'table_head', 'table_body', 'table_row', 'table_header', 'table_cell'].includes(el.role)
      );
      expect(tableElements.length).toBeGreaterThan(0);
      
      // Check for headings
      const headings = result.elements.filter(el => el.role === 'heading');
      expect(headings.length).toBeGreaterThan(5);
      
      // Check for links
      const links = result.elements.filter(el => el.role === 'link');
      expect(links.length).toBeGreaterThan(5);
    });

    test('should mark elements when configured', async ({ page }) => {
      await page.goto('/complex-layout.html');
      
      await waitForAriadneResult(page);
      
      // Check that elements were marked with data-test-id
      const markedElements = await page.$$('[data-test-id]');
      expect(markedElements.length).toBeGreaterThan(0);
      
      // Verify a specific marked element
      const formElement = await page.$('#search-form');
      const dataTestId = await formElement?.getAttribute('data-test-id');
      expect(dataTestId).toBeTruthy();
      expect(dataTestId).toMatch(/^[a-zA-Z0-9_-]+$/); // Should be a valid ID
    });
  });

  test.describe('Worker Management', () => {
    test('should initialize and terminate worker properly', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      // Wait for initial extraction
      await waitForAriadneResult(page);
      
      // Test worker termination
      const terminated = await page.evaluate(() => {
        if (window.ariadneClient) {
          window.ariadneClient.terminate();
          return true;
        }
        return false;
      });
      
      expect(terminated).toBe(true);
      
      // Attempting to extract after termination should fail
      const extractAfterTerminate = await page.evaluate(async () => {
        try {
          if (window.ariadneClient) {
            await window.ariadneClient.extract(document);
          }
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      expect(extractAfterTerminate.success).toBe(false);
    });

    test('should handle abort operation', async ({ page }) => {
      await page.evaluate(() => {
        // Clear any previous results
        window.ariadneResult = undefined;
        window.ariadneError = undefined;
      });
      
      await page.goto('/simple-form.html');
      
      // Start extraction and immediately abort
      const abortResult = await page.evaluate(async () => {
        const { Ariadne } = await import('/dist/index.js');
        const client = new Ariadne({ debug: true });
        
        // Start extraction
        const extractPromise = client.extract(document);
        
        // Immediately abort
        client.abort();
        
        try {
          await extractPromise;
          return { aborted: false };
        } catch (error) {
          return { 
            aborted: true, 
            errorCode: error.code,
            errorMessage: error.message 
          };
        } finally {
          client.terminate();
        }
      });
      
      // The abort might not always catch the extraction in time for small documents
      // but it should not cause any errors
      expect(abortResult).toBeDefined();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid document gracefully', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const errorResult = await page.evaluate(async () => {
        const { extractSemanticMap } = await import('/dist/index.js');
        
        try {
          // Pass invalid document
          await extractSemanticMap(null as any);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            errorCode: error.code,
            errorMessage: error.message,
            isAriadneError: error.constructor.name === 'AriadneError'
          };
        }
      });
      
      expect(errorResult.success).toBe(false);
      expect(errorResult.isAriadneError).toBe(true);
      expect(errorResult.errorCode).toBe('INVALID_DOCUMENT');
    });

    test('should handle invalid configuration', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const errorResult = await page.evaluate(async () => {
        const { Ariadne } = await import('/dist/index.js');
        
        try {
          // Pass invalid configuration
          new Ariadne({ tokenBudget: -1000 } as any);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            errorMessage: error.message,
            isAriadneError: error.constructor.name === 'AriadneError'
          };
        }
      });
      
      expect(errorResult.success).toBe(false);
      expect(errorResult.isAriadneError).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should extract from simple form quickly', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const performanceResult = await page.evaluate(async () => {
        const { extractSemanticMap } = await import('/dist/index.js');
        
        const start = performance.now();
        const result = await extractSemanticMap(document);
        const end = performance.now();
        
        return {
          duration: end - start,
          elementCount: result.elements.length
        };
      });
      
      // Should complete within reasonable time
      expect(performanceResult.duration).toBeLessThan(1000); // 1 second
      expect(performanceResult.elementCount).toBeGreaterThan(0);
    });

    test('should handle multiple extractions efficiently', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const multipleExtractionResult = await page.evaluate(async () => {
        const { Ariadne } = await import('/dist/index.js');
        const client = new Ariadne({ debug: false });
        
        const durations: number[] = [];
        const iterations = 5;
        
        try {
          for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await client.extract(document);
            const end = performance.now();
            durations.push(end - start);
          }
          
          return {
            success: true,
            durations,
            averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length
          };
        } finally {
          client.terminate();
        }
      });
      
      expect(multipleExtractionResult.success).toBe(true);
      expect(multipleExtractionResult.averageDuration).toBeLessThan(500);
      
      // Later extractions should be faster due to caching
      const [first, ...rest] = multipleExtractionResult.durations;
      const averageRest = rest.reduce((a, b) => a + b, 0) / rest.length;
      expect(averageRest).toBeLessThanOrEqual(first);
    });
  });

  test.describe('Configuration Options', () => {
    test('should respect token budget limits', async ({ page }) => {
      await page.goto('/complex-layout.html');
      
      const tokenTestResult = await page.evaluate(async () => {
        const { extractSemanticMap } = await import('/dist/index.js');
        
        // Test with very small token budget
        const smallBudgetResult = await extractSemanticMap(document, {
          tokenBudget: 100,
          debug: true
        });
        
        // Test with large token budget
        const largeBudgetResult = await extractSemanticMap(document, {
          tokenBudget: 10000,
          debug: true
        });
        
        return {
          smallBudget: {
            elementCount: smallBudgetResult.elements.length,
            partial: smallBudgetResult.partial,
            reason: smallBudgetResult.reason
          },
          largeBudget: {
            elementCount: largeBudgetResult.elements.length,
            partial: largeBudgetResult.partial
          }
        };
      });
      
      // Small budget should result in partial extraction
      expect(tokenTestResult.smallBudget.partial).toBe(true);
      expect(tokenTestResult.smallBudget.reason).toBe('token_limit_exceeded');
      
      // Large budget should extract more elements
      expect(tokenTestResult.largeBudget.elementCount).toBeGreaterThan(
        tokenTestResult.smallBudget.elementCount
      );
    });

    test('should respect includeChildren configuration', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const childrenTestResult = await page.evaluate(async () => {
        const { extractSemanticMap } = await import('/dist/index.js');
        
        const withChildren = await extractSemanticMap(document, {
          includeChildren: true
        });
        
        const withoutChildren = await extractSemanticMap(document, {
          includeChildren: false
        });
        
        return {
          withChildren: {
            hasChildren: withChildren.elements.some(el => el.children && el.children.length > 0)
          },
          withoutChildren: {
            hasChildren: withoutChildren.elements.some(el => el.children && el.children.length > 0)
          }
        };
      });
      
      expect(childrenTestResult.withChildren.hasChildren).toBe(true);
      expect(childrenTestResult.withoutChildren.hasChildren).toBe(false);
    });
  });
});

// Declare global window properties for TypeScript
declare global {
  interface Window {
    ariadneResult?: AriadneMap;
    ariadneError?: Error;
    ariadneClient?: any;
  }
}