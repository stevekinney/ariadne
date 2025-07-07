import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Performance and Memory Tests', () => {
  test('should complete extraction within reasonable time limits', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const performanceTest = await page.evaluate(async () => {
      const measurements = [];
      
      // Test multiple extractions to get average performance
      for (let i = 0; i < 5; i++) {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          tokenBudget: 1000
        });
        
        const startTime = performance.now();
        const result = await ariadne.extract(document);
        const endTime = performance.now();
        
        measurements.push({
          duration: endTime - startTime,
          hasResult: !!result.title,
          elementsCount: (result.headings?.length || 0) + 
                        (result.links?.length || 0) + 
                        (result.buttons?.length || 0) + 
                        (result.forms?.length || 0)
        });
        
        // Cleanup
        if (typeof ariadne.cleanup === 'function') {
          ariadne.cleanup();
        }
      }
      
      const averageDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
      const maxDuration = Math.max(...measurements.map(m => m.duration));
      const minDuration = Math.min(...measurements.map(m => m.duration));
      
      return {
        averageDuration,
        maxDuration,
        minDuration,
        allSuccessful: measurements.every(m => m.hasResult),
        consistentResults: measurements.every(m => m.elementsCount > 0)
      };
    });
    
    expect(performanceTest.allSuccessful).toBe(true);
    expect(performanceTest.consistentResults).toBe(true);
    expect(performanceTest.averageDuration).toBeLessThan(1000); // Should average under 1 second
    expect(performanceTest.maxDuration).toBeLessThan(2000); // Should never exceed 2 seconds
  });

  test('should handle large documents efficiently', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'edge-cases.html')}`);
    
    // Wait for dynamic content generation
    await page.waitForFunction(() => {
      return document.querySelectorAll('.generated-element').length === 1000;
    });
    
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const largeDocumentTest = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        tokenBudget: 5000
      });
      
      const startTime = performance.now();
      const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      const result = await ariadne.extract(document);
      
      const endTime = performance.now();
      const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      return {
        duration: endTime - startTime,
        memoryIncrease: endMemory - startMemory,
        hasResult: !!result.title,
        totalElements: Object.keys(result).reduce((count, key) => {
          const value = result[key];
          if (Array.isArray(value)) {
            return count + value.length;
          }
          return count;
        }, 0),
        generatedElementsDetected: document.querySelectorAll('.generated-element').length
      };
    });
    
    expect(largeDocumentTest.hasResult).toBe(true);
    expect(largeDocumentTest.generatedElementsDetected).toBe(1000);
    expect(largeDocumentTest.duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(largeDocumentTest.totalElements).toBeGreaterThan(0);
    
    // Memory increase should be reasonable (less than 50MB)
    if (largeDocumentTest.memoryIncrease > 0) {
      expect(largeDocumentTest.memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should scale performance with token budget', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const scalingTest = await page.evaluate(async () => {
      const budgets = [100, 500, 1000, 2000, 5000];
      const results = [];
      
      for (const budget of budgets) {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          tokenBudget: budget
        });
        
        const startTime = performance.now();
        const result = await ariadne.extract(document);
        const endTime = performance.now();
        
        results.push({
          budget,
          duration: endTime - startTime,
          elementsExtracted: (result.forms?.[0]?.inputs?.length || 0) + 
                            (result.buttons?.length || 0) + 
                            (result.headings?.length || 0)
        });
        
        // Cleanup
        if (typeof ariadne.cleanup === 'function') {
          ariadne.cleanup();
        }
      }
      
      return results;
    });
    
    // Should extract more elements with higher budgets
    const elementsExtracted = scalingTest.map(r => r.elementsExtracted);
    for (let i = 1; i < elementsExtracted.length; i++) {
      expect(elementsExtracted[i]).toBeGreaterThanOrEqual(elementsExtracted[i - 1]);
    }
    
    // All extractions should complete in reasonable time
    scalingTest.forEach(result => {
      expect(result.duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  test('should handle concurrent extractions efficiently', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const concurrencyTest = await page.evaluate(async () => {
      const concurrencyLevels = [1, 3, 5, 10];
      const results = [];
      
      for (const concurrency of concurrencyLevels) {
        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        // Create multiple instances
        const promises = [];
        const instances = [];
        
        for (let i = 0; i < concurrency; i++) {
          // @ts-expect-error - ariadne is not a global
          const ariadne = new window.Ariadne({
            tokenBudget: 500,
            useWorker: i % 2 === 0 // Mix worker and non-worker
          });
          instances.push(ariadne);
          promises.push(ariadne.extract(document));
        }
        
        const extractionResults = await Promise.all(promises);
        
        const endTime = performance.now();
        const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        // Cleanup all instances
        instances.forEach(instance => {
          if (typeof instance.cleanup === 'function') {
            instance.cleanup();
          }
        });
        
        results.push({
          concurrency,
          totalDuration: endTime - startTime,
          averageDuration: (endTime - startTime) / concurrency,
          memoryIncrease: endMemory - startMemory,
          allSuccessful: extractionResults.every(r => !!r.title),
          resultsConsistent: extractionResults.every(r => r.title === extractionResults[0].title)
        });
      }
      
      return results;
    });
    
    concurrencyTest.forEach(result => {
      expect(result.allSuccessful).toBe(true);
      expect(result.resultsConsistent).toBe(true);
      expect(result.totalDuration).toBeLessThan(10000); // Should complete within 10 seconds
    });
    
    // Higher concurrency should not dramatically increase average duration
    const avgDurations = concurrencyTest.map(r => r.averageDuration);
    const maxAvgDuration = Math.max(...avgDurations);
    const minAvgDuration = Math.min(...avgDurations);
    expect(maxAvgDuration / minAvgDuration).toBeLessThan(5); // Shouldn't be more than 5x slower
  });

  test('should manage memory usage effectively', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const memoryTest = await page.evaluate(async () => {
      if (!performance.memory) {
        return { skipped: true, reason: 'Performance memory API not available' };
      }
      
      const initialMemory = performance.memory.usedJSHeapSize;
      const instances = [];
      const memorySnapshots = [initialMemory];
      
      // Create and use multiple instances
      for (let i = 0; i < 20; i++) {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          tokenBudget: 500
        });
        instances.push(ariadne);
        
        await ariadne.extract(document);
        memorySnapshots.push(performance.memory.usedJSHeapSize);
      }
      
      const peakMemory = Math.max(...memorySnapshots);
      
      // Cleanup all instances
      instances.forEach(instance => {
        if (typeof instance.cleanup === 'function') {
          instance.cleanup();
        }
      });
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = performance.memory.usedJSHeapSize;
      
      return {
        initialMemory,
        peakMemory,
        finalMemory,
        memoryIncrease: peakMemory - initialMemory,
        memoryRecovered: peakMemory - finalMemory,
        memoryGrowthRate: (peakMemory - initialMemory) / 20 // per instance
      };
    });
    
    if (memoryTest.skipped) {
      console.log('Memory test skipped:', memoryTest.reason);
      return;
    }
    
    // Memory increase should be reasonable
    expect(memoryTest.memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
    expect(memoryTest.memoryGrowthRate).toBeLessThan(5 * 1024 * 1024); // Less than 5MB per instance
    
    // Should recover most memory after cleanup
    const recoveryRate = memoryTest.memoryRecovered / memoryTest.memoryIncrease;
    expect(recoveryRate).toBeGreaterThan(0.5); // Should recover at least 50% of memory
  });

  test('should maintain performance across different browsers', async ({ page, browserName }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const browserPerformanceTest = await page.evaluate(async () => {
      const iterations = 3;
      const measurements = [];
      
      for (let i = 0; i < iterations; i++) {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          tokenBudget: 1000,
          useWorker: true
        });
        
        const startTime = performance.now();
        const result = await ariadne.extract(document);
        const endTime = performance.now();
        
        measurements.push({
          duration: endTime - startTime,
          elementsCount: (result.headings?.length || 0) + 
                        (result.links?.length || 0) + 
                        (result.buttons?.length || 0)
        });
        
        // Cleanup
        if (typeof ariadne.cleanup === 'function') {
          ariadne.cleanup();
        }
      }
      
      const averageDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
      const consistentResults = measurements.every(m => 
        Math.abs(m.elementsCount - measurements[0].elementsCount) <= 1
      );
      
      return {
        browser: navigator.userAgent,
        averageDuration,
        consistentResults,
        measurements
      };
    });
    
    expect(browserPerformanceTest.consistentResults).toBe(true);
    expect(browserPerformanceTest.averageDuration).toBeLessThan(2000); // Should be under 2 seconds
    
    // Browser-specific performance expectations
    switch (browserName) {
    case 'chromium': {
      expect(browserPerformanceTest.averageDuration).toBeLessThan(1500);
    
    break;
    }
    case 'firefox': {
      expect(browserPerformanceTest.averageDuration).toBeLessThan(2000);
    
    break;
    }
    case 'webkit': {
      expect(browserPerformanceTest.averageDuration).toBeLessThan(2000);
    
    break;
    }
    // No default
    }
  });

  test('should handle worker vs non-worker performance comparison', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const workerComparisonTest = await page.evaluate(async () => {
      const iterations = 5;
      const workerResults = [];
      const nonWorkerResults = [];
      
      // Test with worker
      for (let i = 0; i < iterations; i++) {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          tokenBudget: 2000,
          useWorker: true
        });
        
        const startTime = performance.now();
        const result = await ariadne.extract(document);
        const endTime = performance.now();
        
        workerResults.push({
          duration: endTime - startTime,
          elementsCount: result.forms?.[0]?.inputs?.length || 0
        });
        
        ariadne.cleanup();
      }
      
      // Test without worker
      for (let i = 0; i < iterations; i++) {
        // @ts-expect-error - ariadne is not a global
        const ariadne = new window.Ariadne({
          tokenBudget: 2000,
          useWorker: false
        });
        
        const startTime = performance.now();
        const result = await ariadne.extract(document);
        const endTime = performance.now();
        
        nonWorkerResults.push({
          duration: endTime - startTime,
          elementsCount: result.forms?.[0]?.inputs?.length || 0
        });
      }
      
      const workerAvg = workerResults.reduce((sum, r) => sum + r.duration, 0) / iterations;
      const nonWorkerAvg = nonWorkerResults.reduce((sum, r) => sum + r.duration, 0) / iterations;
      
      return {
        workerAverage: workerAvg,
        nonWorkerAverage: nonWorkerAvg,
        workerElementsCount: workerResults[0].elementsCount,
        nonWorkerElementsCount: nonWorkerResults[0].elementsCount,
        performanceRatio: workerAvg / nonWorkerAvg
      };
    });
    
    // Both should extract similar number of elements
    expect(Math.abs(
      workerComparisonTest.workerElementsCount - workerComparisonTest.nonWorkerElementsCount
    )).toBeLessThanOrEqual(2);
    
    // Both should complete in reasonable time
    expect(workerComparisonTest.workerAverage).toBeLessThan(3000);
    expect(workerComparisonTest.nonWorkerAverage).toBeLessThan(3000);
    
    // Performance difference shouldn't be extreme (within 5x)
    expect(workerComparisonTest.performanceRatio).toBeLessThan(5);
    expect(workerComparisonTest.performanceRatio).toBeGreaterThan(0.2);
  });
});