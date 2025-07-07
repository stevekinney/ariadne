import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Web Worker Functionality', () => {
  test('should initialize and communicate with Web Worker', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const workerTest = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        useWorker: true
      });
      
      // Test that the worker is initialized
      const result = await ariadne.extract(document);
      
      return {
        hasResult: !!result,
        hasTitle: !!result.title,
        hasHeadings: !!result.headings,
        hasLinks: !!result.links,
        hasForms: !!result.forms,
        hasButtons: !!result.buttons
      };
    });
    
    expect(workerTest.hasResult).toBe(true);
    expect(workerTest.hasTitle).toBe(true);
    expect(workerTest.hasHeadings).toBe(true);
    expect(workerTest.hasLinks).toBe(true);
    expect(workerTest.hasForms).toBe(true);
    expect(workerTest.hasButtons).toBe(true);
  });

  test('should handle worker extraction vs direct extraction', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const comparisonTest = await page.evaluate(async () => {
      // Extract using worker
      // @ts-expect-error - ariadne is not a global
      const ariadneWorker = new window.Ariadne({
        useWorker: true,
        tokenBudget: 1000
      });
      const workerResult = await ariadneWorker.extract(document);
      
      // Extract directly (fallback mode)
      // @ts-expect-error - ariadne is not a global
      const ariadneDirect = new window.Ariadne({
        useWorker: false,
        tokenBudget: 1000
      });
      const directResult = await ariadneDirect.extract(document);
      
      return {
        workerTitle: workerResult.title,
        directTitle: directResult.title,
        workerHeadingsCount: workerResult.headings?.length || 0,
        directHeadingsCount: directResult.headings?.length || 0,
        workerLinksCount: workerResult.links?.length || 0,
        directLinksCount: directResult.links?.length || 0,
        workerButtonsCount: workerResult.buttons?.length || 0,
        directButtonsCount: directResult.buttons?.length || 0
      };
    });
    
    // Results should be similar between worker and direct extraction
    expect(comparisonTest.workerTitle).toBe(comparisonTest.directTitle);
    expect(Math.abs(comparisonTest.workerHeadingsCount - comparisonTest.directHeadingsCount)).toBeLessThanOrEqual(1);
    expect(Math.abs(comparisonTest.workerLinksCount - comparisonTest.directLinksCount)).toBeLessThanOrEqual(1);
    expect(Math.abs(comparisonTest.workerButtonsCount - comparisonTest.directButtonsCount)).toBeLessThanOrEqual(1);
  });

  test('should handle worker termination and cleanup', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const cleanupTest = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        useWorker: true
      });
      
      // Perform extraction
      const result = await ariadne.extract(document);
      
      // Test cleanup
      const cleanupResult = ariadne.cleanup();
      
      return {
        extractionSuccessful: !!result.title,
        cleanupSuccessful: cleanupResult
      };
    });
    
    expect(cleanupTest.extractionSuccessful).toBe(true);
    expect(cleanupTest.cleanupSuccessful).toBe(true);
  });

  test('should handle worker abortion', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const abortTest = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        useWorker: true
      });
      
      // Start extraction
      const extractionPromise = ariadne.extract(document);
      
      // Abort quickly
      setTimeout(() => {
        ariadne.abort();
      }, 10);
      
      try {
        await extractionPromise;
        return { aborted: false, error: null };
      } catch (error) {
        return { 
          aborted: true, 
          error: error.message || 'Unknown error',
          isAbortError: error.name === 'AbortError' || error.message.includes('abort')
        };
      }
    });
    
    // Should either complete normally or abort cleanly
    expect(abortTest.aborted ? abortTest.isAbortError : true).toBe(true);
  });

  test('should handle large document processing in worker', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const largeDocTest = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        useWorker: true,
        tokenBudget: 3000
      });
      
      const startTime = performance.now();
      const result = await ariadne.extract(document);
      const endTime = performance.now();
      
      return {
        processingTime: endTime - startTime,
        hasComplexForm: !!result.forms?.length,
        formInputCount: result.forms?.[0]?.inputs?.length || 0,
        totalElements: (result.headings?.length || 0) + 
                      (result.links?.length || 0) + 
                      (result.buttons?.length || 0) + 
                      (result.forms?.length || 0)
      };
    });
    
    expect(largeDocTest.hasComplexForm).toBe(true);
    expect(largeDocTest.formInputCount).toBeGreaterThan(20);
    expect(largeDocTest.totalElements).toBeGreaterThan(5);
    expect(largeDocTest.processingTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should handle worker errors gracefully', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const errorHandlingTest = await page.evaluate(async () => {
      try {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          useWorker: true,
          tokenBudget: -1 // Invalid configuration that might cause errors
        });
        
        const result = await ariadne.extract(document);
        
        return {
          success: true,
          hasResult: !!result,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          hasResult: false,
          error: error.message || 'Unknown error',
          errorType: error.name || 'UnknownError'
        };
      }
    });
    
    // Should either succeed or fail gracefully with meaningful error
    if (!errorHandlingTest.success) {
      expect(errorHandlingTest.error).toBeDefined();
      expect(typeof errorHandlingTest.error).toBe('string');
    } else {
      expect(errorHandlingTest.hasResult).toBe(true);
    }
  });

  test('should handle concurrent worker operations', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const concurrentTest = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne1 = new window.Ariadne({ useWorker: true, tokenBudget: 500 });
      // @ts-expect-error - ariadne is not a global
      const ariadne2 = new window.Ariadne({ useWorker: true, tokenBudget: 500 });
      
      // Start concurrent extractions
      const promise1 = ariadne1.extract(document);
      const promise2 = ariadne2.extract(document);
      
      try {
        const [result1, result2] = await Promise.all([promise1, promise2]);
        
        return {
          success: true,
          bothHaveResults: !!result1.title && !!result2.title,
          titlesMatch: result1.title === result2.title,
          result1HeadingsCount: result1.headings?.length || 0,
          result2HeadingsCount: result2.headings?.length || 0
        };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Unknown error'
        };
      }
    });
    
    expect(concurrentTest.success).toBe(true);
    expect(concurrentTest.bothHaveResults).toBe(true);
    expect(concurrentTest.titlesMatch).toBe(true);
    expect(concurrentTest.result1HeadingsCount).toBeGreaterThan(0);
    expect(concurrentTest.result2HeadingsCount).toBeGreaterThan(0);
  });

  test('should handle worker with different configurations', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const configTest = await page.evaluate(async () => {
      // Test with minimal config
      // @ts-expect-error - ariadne is not a global
      const minimalAriadne = new window.Ariadne({
        useWorker: true,
        tokenBudget: 200,
        includeHidden: false
      });
      
      // Test with comprehensive config
      // @ts-expect-error - ariadne is not a global
      const comprehensiveAriadne = new window.Ariadne({
        useWorker: true,
        tokenBudget: 2000,
        includeHidden: true
      });
      
      const minimalResult = await minimalAriadne.extract(document);
      const comprehensiveResult = await comprehensiveAriadne.extract(document);
      
      return {
        minimalElements: (minimalResult.headings?.length || 0) + 
                        (minimalResult.links?.length || 0) + 
                        (minimalResult.buttons?.length || 0),
        comprehensiveElements: (comprehensiveResult.headings?.length || 0) + 
                              (comprehensiveResult.links?.length || 0) + 
                              (comprehensiveResult.buttons?.length || 0),
        bothHaveTitles: !!minimalResult.title && !!comprehensiveResult.title
      };
    });
    
    expect(configTest.bothHaveTitles).toBe(true);
    expect(configTest.comprehensiveElements).toBeGreaterThanOrEqual(configTest.minimalElements);
  });
});