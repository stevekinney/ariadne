import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Browser API Compatibility Tests', () => {
  test('should verify browser environment supports required APIs', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>API Test</title></head>
      <body>
        <h1>API Test Page</h1>
        <form>
          <input type="text" name="test">
          <button type="submit">Submit</button>
        </form>
      </body>
      </html>
    `);

    const apiSupport = await page.evaluate(() => {
      return {
        hasWorker: typeof Worker !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasQuerySelector: typeof document.querySelector === 'function',
        hasFormData: typeof FormData !== 'undefined',
        hasPromise: typeof Promise !== 'undefined',
        hasPerformance: typeof performance !== 'undefined',
        hasFetch: typeof fetch !== 'undefined',
        documentTitle: document.title,
        formCount: document.querySelectorAll('form').length,
        inputCount: document.querySelectorAll('input').length
      };
    });

    expect(apiSupport.hasWorker).toBe(true);
    expect(apiSupport.hasDocument).toBe(true);
    expect(apiSupport.hasQuerySelector).toBe(true);
    expect(apiSupport.hasFormData).toBe(true);
    expect(apiSupport.hasPromise).toBe(true);
    expect(apiSupport.documentTitle).toBe('API Test');
    expect(apiSupport.formCount).toBe(1);
    expect(apiSupport.inputCount).toBe(1);
  });

  test('should verify DOM manipulation works correctly', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>DOM Test</title></head>
      <body>
        <div id="container">
          <h1>Original Heading</h1>
          <p>Original paragraph</p>
        </div>
      </body>
      </html>
    `);

    const domTest = await page.evaluate(() => {
      // Test basic DOM operations that Ariadne would use
      const container = document.getElementById('container');
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const paragraphs = document.querySelectorAll('p');
      
      // Add dynamic content
      const newDiv = document.createElement('div');
      newDiv.innerHTML = '<h2>Dynamic Heading</h2><p>Dynamic content</p>';
      container.appendChild(newDiv);
      
      // Re-query after modification
      const newHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      return {
        originalHeadingCount: headings.length,
        originalParagraphCount: paragraphs.length,
        newHeadingCount: newHeadings.length,
        documentTitle: document.title,
        containerExists: !!container,
        canCreateElements: !!newDiv,
        canModifyDOM: newHeadings.length > headings.length
      };
    });

    expect(domTest.originalHeadingCount).toBe(1);
    expect(domTest.originalParagraphCount).toBe(1);
    expect(domTest.newHeadingCount).toBe(2);
    expect(domTest.containerExists).toBe(true);
    expect(domTest.canCreateElements).toBe(true);
    expect(domTest.canModifyDOM).toBe(true);
  });

  test('should verify form element extraction capabilities', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    
    const formAnalysis = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input, select, textarea');
      const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
      const links = document.querySelectorAll('a[href]');
      const tables = document.querySelectorAll('table');
      const lists = document.querySelectorAll('ul, ol');
      
      // Extract form details
      const formData = Array.from(forms).map(form => ({
        action: form.getAttribute('action'),
        method: form.getAttribute('method'),
        inputCount: form.querySelectorAll('input, select, textarea').length
      }));
      
      // Extract input details
      const inputData = Array.from(inputs).map(input => ({
        name: input.getAttribute('name'),
        type: input.type || input.tagName.toLowerCase(),
        required: input.hasAttribute('required'),
        placeholder: input.getAttribute('placeholder')
      }));
      
      return {
        formCount: forms.length,
        inputCount: inputs.length,
        buttonCount: buttons.length,
        linkCount: links.length,
        tableCount: tables.length,
        listCount: lists.length,
        formData,
        inputData,
        documentTitle: document.title
      };
    });

    expect(formAnalysis.formCount).toBeGreaterThan(0);
    expect(formAnalysis.inputCount).toBeGreaterThan(0);
    expect(formAnalysis.buttonCount).toBeGreaterThan(0);
    expect(formAnalysis.linkCount).toBeGreaterThan(0);
    expect(formAnalysis.documentTitle).toBe('Ariadne Test Page');
    
    // Verify form structure
    expect(formAnalysis.formData[0].action).toBe('/submit');
    expect(formAnalysis.formData[0].method).toBe('POST');
    expect(formAnalysis.formData[0].inputCount).toBeGreaterThan(5);
    
    // Verify input variety
    const inputTypes = formAnalysis.inputData.map(input => input.type);
    expect(inputTypes).toContain('text');
    expect(inputTypes).toContain('email');
    expect(inputTypes).toContain('select-one');
    expect(inputTypes).toContain('textarea');
  });

  test('should verify table extraction capabilities', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    
    const tableAnalysis = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      
      return Array.from(tables).map(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => 
          Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim())
        );
        
        return {
          headerCount: headers.length,
          rowCount: rows.length,
          headers,
          firstRow: rows[0] || []
        };
      });
    });

    expect(tableAnalysis.length).toBeGreaterThan(0);
    expect(tableAnalysis[0].headerCount).toBeGreaterThan(0);
    expect(tableAnalysis[0].rowCount).toBeGreaterThan(0);
    expect(tableAnalysis[0].headers).toContain('ID');
    expect(tableAnalysis[0].headers).toContain('Name');
    expect(tableAnalysis[0].firstRow).toContain('John Doe');
  });

  test('should verify list extraction capabilities', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    
    const listAnalysis = await page.evaluate(() => {
      const lists = document.querySelectorAll('ul, ol');
      
      return Array.from(lists).map(list => ({
        type: list.tagName.toLowerCase(),
        itemCount: list.querySelectorAll('li').length,
        items: Array.from(list.querySelectorAll('li')).map(li => li.textContent?.trim()),
        hasNestedLists: list.querySelectorAll('ul, ol').length > 0
      }));
    });

    expect(listAnalysis.length).toBeGreaterThan(0);
    
    // Check for features list
    const featuresList = listAnalysis.find(list => 
      list.items.some(item => item?.includes('Semantic HTML extraction'))
    );
    expect(featuresList).toBeDefined();
    expect(featuresList?.type).toBe('ul');
    expect(featuresList?.itemCount).toBe(4);
    
    // Check for steps list
    const stepsList = listAnalysis.find(list => 
      list.items.some(item => item?.includes('Initialize the library'))
    );
    expect(stepsList).toBeDefined();
    expect(stepsList?.type).toBe('ol');
    expect(stepsList?.itemCount).toBe(4);
  });
});