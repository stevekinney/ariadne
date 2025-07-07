import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Error Handling and Edge Cases', () => {
  test('should handle empty document gracefully', async ({ page }) => {
    await page.setContent('<!DOCTYPE html><html><head><title>Empty</title></head><body></body></html>');
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      return await ariadne.extract(document);
    });
    
    expect(result.title).toBe('Empty');
    expect(result.headings).toEqual([]);
    expect(result.links).toEqual([]);
    expect(result.forms).toEqual([]);
    expect(result.buttons).toEqual([]);
    expect(result.tables).toEqual([]);
    expect(result.lists).toEqual([]);
  });

  test('should handle malformed HTML', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Malformed</title></head>
      <body>
        <div>Unclosed div
        <p>Paragraph inside unclosed div
        <form>
          <input type="text" name="test">
          <!-- Missing closing form tag -->
        <table>
          <tr><td>Cell 1<td>Cell 2
          <!-- Missing closing tags -->
        </table>
      </body>
      </html>
    `);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne();
        return { success: true, result: await ariadne.extract(document) };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.result.title).toBe('Malformed');
    // Should still extract some content despite malformed HTML
    expect(result.result.forms?.length).toBeGreaterThanOrEqual(0);
    expect(result.result.tables?.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle special characters and unicode', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      return await ariadne.extract(document);
    });
    
    // Should handle special characters without breaking
    const specialCharContent = result.headings.find((h: string) => h.includes('&lt;&gt;&amp;'));
    expect(specialCharContent).toBeDefined();
    
    // Should handle unicode characters
    const unicodeContent = result.headings.find((h: string) => h.includes('🚀') || h.includes('中文'));
    expect(unicodeContent).toBeDefined();
    
    // Should handle math symbols
    const mathContent = result.headings.find((h: string) => h.includes('∑') || h.includes('π'));
    expect(mathContent).toBeDefined();
  });

  test('should handle very large documents', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.waitForFunction(() => {
      // Wait for dynamic content generation to complete
      return document.querySelectorAll('.generated-element').length === 1000;
    });
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        tokenBudget: 5000 // Increase budget for large document
      });
      
      const startTime = performance.now();
      const extractionResult = await ariadne.extract(document);
      const endTime = performance.now();
      
      return {
        result: extractionResult,
        processingTime: endTime - startTime,
        generatedElementsCount: document.querySelectorAll('.generated-element').length
      };
    });
    
    expect(result.generatedElementsCount).toBe(1000);
    expect(result.result).toBeDefined();
    expect(result.processingTime).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should handle deeply nested elements', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      return await ariadne.extract(document);
    });
    
    // Should extract content from deeply nested elements
    const deepContent = result.headings.find((h: string) => h.includes('Deeply nested content'));
    expect(deepContent).toBeDefined();
  });

  test('should handle various input types correctly', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms.find((form: any) => form.id === 'edge-case-form')?.inputs || [];
    });
    
    // Should handle input without name
    const noNameInput = formInputs.find((input: any) => input.value === 'no name');
    expect(noNameInput).toBeDefined();
    
    // Should handle multiple inputs with same name
    const sameNameInputs = formInputs.filter((input: any) => input.name === 'same');
    expect(sameNameInputs.length).toBe(3);
    
    // Should handle range input
    const rangeInput = formInputs.find((input: any) => input.type === 'range');
    expect(rangeInput).toBeDefined();
    expect(rangeInput.min).toBe('0');
    expect(rangeInput.max).toBe('100');
    expect(rangeInput.step).toBe('5');
    
    // Should handle color input
    const colorInput = formInputs.find((input: any) => input.type === 'color');
    expect(colorInput).toBeDefined();
    expect(colorInput.value).toBe('#ff0000');
    
    // Should handle date/time inputs
    const dateInput = formInputs.find((input: any) => input.type === 'date');
    expect(dateInput).toBeDefined();
    
    const timeInput = formInputs.find((input: any) => input.type === 'time');
    expect(timeInput).toBeDefined();
    
    const datetimeInput = formInputs.find((input: any) => input.type === 'datetime-local');
    expect(datetimeInput).toBeDefined();
  });

  test('should handle malformed tables', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const tables = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.tables;
    });
    
    // Should handle empty table
    expect(tables).toBeDefined();
    expect(Array.isArray(tables)).toBe(true);
    
    // Should handle table with complex structure (rowspan/colspan)
    const complexTable = tables.find((table: any) => 
      table.headers && table.headers.includes('Rowspan Header')
    );
    expect(complexTable).toBeDefined();
    
    // Should handle malformed table
    const malformedTable = tables.find((table: any) => 
      table.rows && table.rows.some((row: any) => 
        Array.isArray(row) && row.includes('Cell without header')
      )
    );
    expect(malformedTable).toBeDefined();
  });

  test('should handle empty and malformed lists', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const lists = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.lists;
    });
    
    expect(lists).toBeDefined();
    expect(Array.isArray(lists)).toBe(true);
    
    // Should handle nested lists
    const nestedList = lists.find((list: any) => 
      list.items && list.items.some((item: string) => item.includes('Nested lists'))
    );
    expect(nestedList).toBeDefined();
  });

  test('should handle invalid configuration gracefully', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const invalidConfigTests = await page.evaluate(async () => {
      const tests = [];
      
      // Test negative token budget
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne1 = new window.Ariadne({ tokenBudget: -100 });
        const result1 = await ariadne1.extract(document);
        tests.push({ test: 'negative-budget', success: true, hasTitle: !!result1.title });
      } catch (error) {
        tests.push({ test: 'negative-budget', success: false, error: error.message });
      }
      
      // Test zero token budget
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne2 = new window.Ariadne({ tokenBudget: 0 });
        const result2 = await ariadne2.extract(document);
        tests.push({ test: 'zero-budget', success: true, hasTitle: !!result2.title });
      } catch (error) {
        tests.push({ test: 'zero-budget', success: false, error: error.message });
      }
      
      // Test extremely large token budget
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne3 = new window.Ariadne({ tokenBudget: Number.MAX_SAFE_INTEGER });
        const result3 = await ariadne3.extract(document);
        tests.push({ test: 'large-budget', success: true, hasTitle: !!result3.title });
      } catch (error) {
        tests.push({ test: 'large-budget', success: false, error: error.message });
      }
      
      // Test invalid options
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne4 = new window.Ariadne({ invalidOption: true });
        const result4 = await ariadne4.extract(document);
        tests.push({ test: 'invalid-option', success: true, hasTitle: !!result4.title });
      } catch (error) {
        tests.push({ test: 'invalid-option', success: false, error: error.message });
      }
      
      return tests;
    });
    
    // Should handle invalid configurations gracefully
    invalidConfigTests.forEach(test => {
      if (test.success) {
        expect(test.hasTitle).toBe(true);
      } else {
        expect(test.error).toBeDefined();
        expect(typeof test.error).toBe('string');
      }
    });
  });

  test('should handle extraction of null/undefined document', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const nullDocumentTest = await page.evaluate(async () => {
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne();
        const result = await ariadne.extract(null);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message, errorType: error.name };
      }
    });
    
    const undefinedDocumentTest = await page.evaluate(async () => {
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne();
        const result = await ariadne.extract(undefined);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message, errorType: error.name };
      }
    });
    
    // Should handle null/undefined gracefully with meaningful errors
    expect(nullDocumentTest.success).toBe(false);
    expect(nullDocumentTest.error).toBeDefined();
    
    expect(undefinedDocumentTest.success).toBe(false);
    expect(undefinedDocumentTest.error).toBeDefined();
  });

  test('should handle memory pressure gracefully', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    // Create multiple instances and run them concurrently to test memory handling
    const memoryTest = await page.evaluate(async () => {
      const promises = [];
      const instances = [];
      
      // Create multiple instances
      for (let i = 0; i < 10; i++) {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          tokenBudget: 1000,
          useWorker: i % 2 === 0 // Mix worker and non-worker instances
        });
        instances.push(ariadne);
        promises.push(ariadne.extract(document));
      }
      
      try {
        const results = await Promise.all(promises);
        
        // Cleanup all instances
        instances.forEach(instance => {
          if (typeof instance.cleanup === 'function') {
            instance.cleanup();
          }
        });
        
        return {
          success: true,
          resultsCount: results.length,
          allHaveTitles: results.every(r => !!r.title)
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(memoryTest.success).toBe(true);
    expect(memoryTest.resultsCount).toBe(10);
    expect(memoryTest.allHaveTitles).toBe(true);
  });

  test('should handle custom elements and web components', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      return await ariadne.extract(document);
    });
    
    // Should handle custom elements without breaking
    expect(result).toBeDefined();
    expect(result.title).toBe('Edge Cases Test Page');
    
    // The extraction should complete successfully even with custom elements present
    expect(result.headings).toBeDefined();
    expect(result.links).toBeDefined();
    expect(result.forms).toBeDefined();
  });

  test('should handle SVG and MathML content', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      return await ariadne.extract(document);
    });
    
    // Should handle SVG and MathML without breaking
    expect(result).toBeDefined();
    expect(result.title).toBe('Edge Cases Test Page');
    
    // Check that extraction completed successfully
    expect(result.forms).toBeDefined();
    expect(result.forms.length).toBeGreaterThan(0);
  });
});