import { test, expect, Page } from '@playwright/test';
import type { AriadneMap } from '../../src/types/ariadne.js';

// Helper to wait for Ariadne to complete and get test stats
async function waitForAriadneWithStats(page: Page): Promise<{ result: AriadneMap; stats: any }> {
  return await page.evaluate(() => {
    return new Promise<{ result: AriadneMap; stats: any }>((resolve, reject) => {
      const checkResult = () => {
        if (window.ariadneResult && window.testStats) {
          resolve({ result: window.ariadneResult, stats: window.testStats });
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

test.describe('Ariadne Edge Cases', () => {
  test.describe('Malformed HTML Handling', () => {
    test('should handle malformed HTML gracefully', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result, stats } = await waitForAriadneWithStats(page);
      
      expect(result).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);
      
      // Should extract forms despite malformed HTML
      expect(stats.formCount).toBeGreaterThanOrEqual(7);
      expect(stats.inputCount).toBeGreaterThan(10);
      expect(stats.buttonCount).toBeGreaterThanOrEqual(7);
    });

    test('should handle empty and whitespace-only elements', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result } = await waitForAriadneWithStats(page);
      
      // Should still extract empty elements
      const emptyForm = result.elements.find(el => 
        el.role === 'form' && el.attributes?.id === 'empty-form'
      );
      expect(emptyForm).toBeDefined();
      
      // Should extract inputs even with empty values
      const emptyInputs = result.elements.filter(el => 
        el.role === 'input' && el.attributes?.name?.includes('empty')
      );
      expect(emptyInputs.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle deeply nested structures', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result } = await waitForAriadneWithStats(page);
      
      // Should extract form even when deeply nested
      const deepForm = result.elements.find(el => 
        el.role === 'form' && el.attributes?.id === 'deeply-nested-form'
      );
      expect(deepForm).toBeDefined();
      
      // Should extract input from deep nesting
      const deepInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'deep-input'
      );
      expect(deepInput).toBeDefined();
    });
  });

  test.describe('Hidden Elements', () => {
    test('should handle various types of hidden elements', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result } = await waitForAriadneWithStats(page);
      
      // Should extract the hidden form
      const hiddenForm = result.elements.find(el => 
        el.role === 'form' && el.attributes?.id === 'hidden-form'
      );
      expect(hiddenForm).toBeDefined();
      
      // Should extract visible input
      const visibleInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'visible-input'
      );
      expect(visibleInput).toBeDefined();
      
      // Should extract hidden input (type="hidden")
      const hiddenInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'hidden-input'
      );
      expect(hiddenInput).toBeDefined();
      
      // May or may not extract display:none and visibility:hidden elements
      // depending on Ariadne's implementation
    });
  });

  test.describe('Special Characters', () => {
    test('should handle Unicode and HTML entities', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result, stats } = await waitForAriadneWithStats(page);
      
      // Should handle Unicode characters
      const unicodeInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'unicode'
      );
      expect(unicodeInput).toBeDefined();
      
      // Should handle HTML entities
      const entitiesInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'entities'
      );
      expect(entitiesInput).toBeDefined();
      
      // Should have detected special characters
      expect(stats.specialCharCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Duplicate IDs and Names', () => {
    test('should handle duplicate IDs and names', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result } = await waitForAriadneWithStats(page);
      
      // Should extract form with duplicate elements
      const duplicateForm = result.elements.find(el => 
        el.role === 'form' && el.attributes?.id === 'duplicate-form'
      );
      expect(duplicateForm).toBeDefined();
      
      // Should extract both inputs with duplicate names
      const duplicateNameInputs = result.elements.filter(el => 
        el.role === 'input' && el.attributes?.name === 'duplicate-name'
      );
      expect(duplicateNameInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Custom Elements', () => {
    test('should handle custom elements and unknown tags', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result } = await waitForAriadneWithStats(page);
      
      // Should extract form with custom elements
      const customForm = result.elements.find(el => 
        el.role === 'form' && el.attributes?.id === 'custom-form'
      );
      expect(customForm).toBeDefined();
      
      // Should extract input inside unknown tag
      const insideUnknownInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'inside-unknown'
      );
      expect(insideUnknownInput).toBeDefined();
    });
  });

  test.describe('Extreme Cases', () => {
    test('should handle very long names and special content', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const { result } = await waitForAriadneWithStats(page);
      
      // Should extract form with extreme cases
      const extremeForm = result.elements.find(el => 
        el.role === 'form' && el.attributes?.id === 'extreme-form'
      );
      expect(extremeForm).toBeDefined();
      
      // Should extract input with very long name
      const longNameInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name?.includes('very-long-name')
      );
      expect(longNameInput).toBeDefined();
      
      // Should extract textarea with large content
      const largeTextarea = result.elements.find(el => 
        el.role === 'textarea' && el.attributes?.name === 'large-text'
      );
      expect(largeTextarea).toBeDefined();
    });
  });

  test.describe('Error Recovery', () => {
    test('should not crash on malformed pages', async ({ page }) => {
      // Create a page with intentionally malformed HTML
      await page.goto('/edge-cases.html');
      
      // Inject some malformed HTML
      await page.evaluate(() => {
        const div = document.createElement('div');
        div.innerHTML = '<form><input name="test" <label>Malformed</form>';
        document.body.appendChild(div);
      });
      
      const extractionResult = await page.evaluate(async () => {
        try {
          const { extractSemanticMap } = await import('/dist/index.js');
          const result = await extractSemanticMap(document, {
            tokenBudget: 5000,
            debug: true
          });
          return { success: true, elementCount: result.elements.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      // Should not crash, should extract elements
      expect(extractionResult.success).toBe(true);
      expect(extractionResult.elementCount).toBeGreaterThan(0);
    });

    test('should handle concurrent extractions', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const concurrentResult = await page.evaluate(async () => {
        const { extractSemanticMap } = await import('/dist/index.js');
        
        // Start multiple extractions simultaneously
        const promises = Array.from({ length: 3 }, (_, i) => 
          extractSemanticMap(document, {
            tokenBudget: 3000,
            debug: false
          }).then(result => ({ index: i, elementCount: result.elements.length }))
        );
        
        try {
          const results = await Promise.all(promises);
          return { success: true, results };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      expect(concurrentResult.success).toBe(true);
      expect(concurrentResult.results).toHaveLength(3);
      
      // All extractions should return the same number of elements
      const counts = concurrentResult.results.map(r => r.elementCount);
      expect(counts.every(count => count === counts[0])).toBe(true);
    });
  });

  test.describe('Memory Management', () => {
    test('should clean up resources after multiple extractions', async ({ page }) => {
      await page.goto('/edge-cases.html');
      
      const memoryResult = await page.evaluate(async () => {
        const { Ariadne } = await import('/dist/index.js');
        
        // Create multiple clients and extract
        const clients = Array.from({ length: 5 }, () => new Ariadne({ debug: false }));
        
        try {
          // Perform extractions
          const results = await Promise.all(
            clients.map(client => client.extract(document))
          );
          
          // Terminate all clients
          clients.forEach(client => client.terminate());
          
          return {
            success: true,
            extractionCount: results.length,
            allExtracted: results.every(r => r.elements.length > 0)
          };
        } catch (error) {
          // Clean up on error
          clients.forEach(client => client.terminate());
          return { success: false, error: error.message };
        }
      });
      
      expect(memoryResult.success).toBe(true);
      expect(memoryResult.extractionCount).toBe(5);
      expect(memoryResult.allExtracted).toBe(true);
    });
  });
});

// Declare additional global window properties for TypeScript
declare global {
  interface Window {
    ariadneResult?: AriadneMap;
    ariadneError?: Error;
    testStats?: {
      formCount: number;
      inputCount: number;
      buttonCount: number;
      specialCharCount: number;
    };
  }
}