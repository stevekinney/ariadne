import { test, expect } from '@playwright/test';

test.describe('Simple Ariadne Test', () => {
  test('should load Ariadne library and create instance', async ({ page }) => {
    // Create a simple HTML page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Test Page</title></head>
      <body>
        <h1>Test Heading</h1>
        <p>Test content</p>
        <button>Test Button</button>
        <a href="/test">Test Link</a>
      </body>
      </html>
    `);

    // Load the Ariadne library
    const ariadneModule = await page.evaluateHandle(() => {
      return import('../../dist/index.js');
    });

    // Test that we can create an instance
    const canCreateInstance = await page.evaluate((moduleHandle) => {
      try {
        const { Ariadne } = moduleHandle;
        const instance = new Ariadne();
        return { success: true, hasExtract: typeof instance.extract === 'function' };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }, ariadneModule);

    expect(canCreateInstance.success).toBe(true);
    expect(canCreateInstance.hasExtract).toBe(true);
  });

  test('should perform basic extraction', async ({ page }) => {
    // Create a simple HTML page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Basic Test</title></head>
      <body>
        <h1>Main Heading</h1>
        <form action="/test" method="POST">
          <input type="text" name="username" required>
          <button type="submit">Submit</button>
        </form>
        <a href="/link">Test Link</a>
      </body>
      </html>
    `);

    // Perform extraction
    const result = await page.evaluate(async () => {
      try {
        const module = await import('../../dist/index.js');
        const { Ariadne } = module;
        const ariadne = new Ariadne({ tokenBudget: 1000 });
        
        const extraction = await ariadne.extract(document);
        
        // Clean up
        ariadne.terminate();
        
        return { 
          success: true, 
          result: extraction,
          hasElements: !!extraction.elements,
          hasMeta: !!extraction.meta
        };
      } catch (error) {
        return { 
          success: false, 
          error: (error as Error).message,
          stack: (error as Error).stack 
        };
      }
    });

    if (!result.success) {
      console.error('Extraction failed:', result.error);
      console.error('Stack:', result.stack);
    }

    expect(result.success).toBe(true);
    expect(result.hasElements).toBe(true);
    expect(result.hasMeta).toBe(true);
    expect(result.result.meta.title).toBe('Basic Test');
  });

  test('should handle different configurations', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Config Test</title></head>
      <body>
        <h1>Heading</h1>
        <button>Button 1</button>
        <button>Button 2</button>
      </body>
      </html>
    `);

    const configTests = await page.evaluate(async () => {
      try {
        const module = await import('../../dist/index.js');
        const { Ariadne } = module;
        
        // Test different configurations
        const configs = [
          { tokenBudget: 500 },
          { tokenBudget: 2000, debug: true },
          { includeChildren: false },
          { compact: true }
        ];
        
        const results = [];
        
        for (const config of configs) {
          const ariadne = new Ariadne(config);
          const extraction = await ariadne.extract(document);
          results.push({
            config,
            hasElements: !!extraction.elements,
            elementCount: extraction.elements?.length || 0
          });
          ariadne.terminate();
        }
        
        return { success: true, results };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(configTests.success).toBe(true);
    expect(configTests.results.length).toBe(4);
    
    // All configurations should work
    configTests.results.forEach((result) => {
      expect(result.hasElements).toBe(true);
      expect(result.elementCount).toBeGreaterThan(0);
    });
  });
});