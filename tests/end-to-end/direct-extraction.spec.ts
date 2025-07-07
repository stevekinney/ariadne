import { test, expect } from '@playwright/test';
import type { AriadneMap } from '../../src/types';

// Helper to wait for direct extraction results


test.describe('Ariadne Direct Extraction Tests', () => {
  test.describe('Bypassing Web Worker Issues', () => {
    test('should test core extraction logic without worker', async ({ page }) => {
      // Navigate to a simple test page
      await page.goto('/simple-form.html');
      
      // Test direct extraction using the main thread (bypassing worker issues)
      const result = await page.evaluate(async () => {
        try {
          // Try to import components directly and test without worker
          
          const { HashIdGenerator } = await import('/dist/worker/hash-id-generator.js');
          const { LabelResolver } = await import('/dist/worker/label-resolver.js');
          
          // Test that components can be imported
          const idGen = new HashIdGenerator();
          const labelResolver = new LabelResolver(document);
          
          // Create a simple test
          const testElement = document.querySelector('input[name="username"]');
          if (testElement) {
            const id = idGen.generateId(testElement);
            const label = labelResolver.resolve(testElement);
            
            return {
              success: true,
              testId: id,
              testLabel: label,
              elementFound: true
            };
          }
          
          return {
            success: true,
            elementFound: false
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stack: error.stack
          };
        }
      });
      
      expect(result.success).toBe(true);
      if (result.elementFound) {
        expect(result.testId).toBeDefined();
        expect(result.testLabel).toBeDefined();
      }
    });

    test('should identify the Web Worker DOMParser issue', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      // Test what happens when we try to use DOMParser in a worker context
      const workerTest = await page.evaluate(async () => {
        try {
          // Check if DOMParser is available in main thread
          const mainThreadParser = typeof DOMParser !== 'undefined';
          
          // Try to test worker creation
          const workerCode = `
            self.onmessage = function(e) {
              try {
                const parser = new DOMParser();
                self.postMessage({ success: true, hasParser: true });
              } catch (error) {
                self.postMessage({ success: false, error: error.message });
              }
            };
          `;
          
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          const worker = new Worker(workerUrl);
          
          return new Promise((resolve) => {
            worker.onmessage = (e) => {
              resolve({
                mainThreadParser,
                workerResult: e.data
              });
              worker.terminate();
              URL.revokeObjectURL(workerUrl);
            };
            
            worker.onerror = () => {
              resolve({
                mainThreadParser,
                workerResult: { success: false, error: 'Worker failed to start' }
              });
              worker.terminate();
              URL.revokeObjectURL(workerUrl);
            };
            
            worker.postMessage({});
          });
        } catch (error) {
          return {
            mainThreadParser: typeof DOMParser !== 'undefined',
            workerResult: { success: false, error: error.message }
          };
        }
      });
      
      expect(workerTest.mainThreadParser).toBe(true);
      expect(workerTest.workerResult.success).toBe(false);
      expect(workerTest.workerResult.error).toContain('DOMParser');
    });

    test('should test basic HTML parsing capabilities', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const htmlTest = await page.evaluate(() => {
        // Test basic DOM manipulation that Ariadne would need
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input');
        const buttons = document.querySelectorAll('button');
        
        const formData = Array.from(forms).map(form => ({
          id: form.id,
          tagName: form.tagName,
          action: form.action,
          method: form.method
        }));
        
        const inputData = Array.from(inputs).map(input => ({
          id: input.id,
          name: input.name,
          type: input.type,
          required: input.required
        }));
        
        const buttonData = Array.from(buttons).map(button => ({
          id: button.id,
          type: button.type,
          textContent: button.textContent?.trim()
        }));
        
        return {
          forms: formData,
          inputs: inputData,
          buttons: buttonData,
          documentReady: document.readyState === 'complete'
        };
      });
      
      expect(htmlTest.documentReady).toBe(true);
      expect(htmlTest.forms.length).toBeGreaterThan(0);
      expect(htmlTest.inputs.length).toBeGreaterThan(0);
      expect(htmlTest.buttons.length).toBeGreaterThan(0);
      
      // Check specific form elements
      const testForm = htmlTest.forms.find(f => f.id === 'test-form');
      expect(testForm).toBeDefined();
      expect(testForm?.tagName).toBe('FORM');
    });
  });
  
  test.describe('Alternative Extraction Strategies', () => {
    test('should test extraction using main thread processing', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      // Test a hypothetical main-thread extraction approach
      const mainThreadResult = await page.evaluate(async () => {
        try {
          // Simulate what Ariadne should do in the main thread
          const elements = [];
          
          // Find all interactive elements
          const selectors = [
            'form',
            'input',
            'button', 
            'select',
            'textarea',
            'a[href]',
            'h1, h2, h3, h4, h5, h6'
          ];
          
          for (const selector of selectors) {
            const els = document.querySelectorAll(selector);
            els.forEach((el, index) => {
              const element = {
                tagName: el.tagName.toLowerCase(),
                selector: selector,
                index: index,
                id: el.id || null,
                name: el.getAttribute?.('name') || null,
                type: el.getAttribute?.('type') || null,
                href: el.getAttribute?.('href') || null,
                textContent: el.textContent?.slice(0, 100) || null
              };
              
              elements.push(element);
            });
          }
          
          return {
            success: true,
            elementCount: elements.length,
            elements: elements.slice(0, 10), // First 10 for inspection
            timestamp: Date.now()
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      expect(mainThreadResult.success).toBe(true);
      expect(mainThreadResult.elementCount).toBeGreaterThan(0);
      expect(mainThreadResult.elements).toBeInstanceOf(Array);
      
      // Should find forms
      const forms = mainThreadResult.elements.filter(el => el.tagName === 'form');
      expect(forms.length).toBeGreaterThan(0);
      
      // Should find inputs
      const inputs = mainThreadResult.elements.filter(el => el.tagName === 'input');
      expect(inputs.length).toBeGreaterThan(0);
    });

    test('should document the Web Worker limitation', async ({ page }) => {
      await page.goto('/simple-form.html');
      
      const diagnosis = await page.evaluate(() => {
        const issues = [];
        const recommendations = [];
        
        // Check main thread capabilities
        if (typeof DOMParser === 'undefined') {
          issues.push('DOMParser not available in main thread');
        } else {
          recommendations.push('DOMParser available in main thread');
        }
        
        if (typeof Worker === 'undefined') {
          issues.push('Web Workers not supported');
        } else {
          recommendations.push('Web Workers supported');
        }
        
        // Check document APIs needed for extraction
        const apis = [
          'document.querySelectorAll',
          'document.createTreeWalker', 
          'Element.prototype.getAttribute',
          'Element.prototype.textContent',
          'Element.prototype.cloneNode'
        ];
        
        const availableApis = apis.filter(api => {
          try {
            return eval(`typeof ${api}`) !== 'undefined';
          } catch {
            return false;
          }
        });
        
        if (availableApis.length === apis.length) {
          recommendations.push('All required DOM APIs available in main thread');
        } else {
          issues.push(`Missing DOM APIs: ${apis.filter(api => !availableApis.includes(api))}`);
        }
        
        return {
          issues,
          recommendations,
          conclusion: issues.length === 0 ? 
            'Main thread extraction should work, Web Worker needs DOMParser polyfill' :
            'Multiple issues found'
        };
      });
      
      console.log('Ariadne Web Worker Diagnosis:', diagnosis);
      
      expect(diagnosis.recommendations).toContain('DOMParser available in main thread');
      expect(diagnosis.recommendations).toContain('Web Workers supported');
      expect(diagnosis.recommendations).toContain('All required DOM APIs available in main thread');
      
      // The main issue should be Web Worker DOMParser availability
      expect(diagnosis.conclusion).toContain('Main thread extraction should work');
    });
  });
});

// Extend global window interface for direct extraction tests
declare global {
  interface Window {
    directResult?: AriadneMap;
    directError?: Error;
  }
}