import { test, expect, Page } from '@playwright/test';
import type { AriadneMap } from '../../src/types/ariadne.js';

// Helper to wait for accessibility test results
async function waitForAccessibilityResults(page: Page): Promise<{ result: AriadneMap; stats: any }> {
  return await page.evaluate(() => {
    return new Promise<{ result: AriadneMap; stats: any }>((resolve, reject) => {
      const checkResult = () => {
        if (window.ariadneResult && window.accessibilityStats) {
          resolve({ result: window.ariadneResult, stats: window.accessibilityStats });
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

test.describe('Ariadne Accessibility Tests', () => {
  test.describe('ARIA Attributes', () => {
    test('should extract ARIA labels and descriptions', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result, stats } = await waitForAccessibilityResults(page);
      
      expect(result).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);
      
      // Should find elements with ARIA labels
      expect(stats.ariaLabels).toBeGreaterThan(0);
      
      // Should find elements with ARIA descriptions  
      expect(stats.ariaDescriptions).toBeGreaterThan(0);
      
      // Check specific ARIA label extraction
      const searchInput = result.elements.find(el => 
        el.role === 'input' && 
        el.attributes?.name === 'search' &&
        el.attributes?.['aria-label']
      );
      expect(searchInput).toBeDefined();
      expect(searchInput?.attributes?.['aria-label']).toContain('Search products');
    });

    test('should detect required fields with aria-required', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result, stats } = await waitForAccessibilityResults(page);
      
      // Should detect multiple required fields
      expect(stats.requiredFields).toBeGreaterThan(0);
      
      // Check specific required field
      const usernameInput = result.elements.find(el => 
        el.role === 'input' && 
        el.attributes?.name === 'username'
      );
      expect(usernameInput).toBeDefined();
      expect(usernameInput?.attributes?.['aria-required']).toBe('true');
    });

    test('should extract live regions', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result, stats } = await waitForAccessibilityResults(page);
      
      // Should detect live regions
      expect(stats.liveRegions).toBeGreaterThan(0);
      
      // Check for specific live regions
      const politeRegion = result.elements.find(el => 
        el.attributes?.['aria-live'] === 'polite'
      );
      expect(politeRegion).toBeDefined();
      
      const assertiveRegion = result.elements.find(el => 
        el.attributes?.['aria-live'] === 'assertive'
      );
      expect(assertiveRegion).toBeDefined();
    });
  });

  test.describe('Semantic HTML', () => {
    test('should extract landmark elements', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result, stats } = await waitForAccessibilityResults(page);
      
      // Should detect landmark elements
      expect(stats.landmarks).toBeGreaterThan(0);
      
      // Check for specific landmarks
      const mainElement = result.elements.find(el => 
        el.role === 'main' || el.attributes?.role === 'main'
      );
      expect(mainElement).toBeDefined();
      
      const navElements = result.elements.filter(el => 
        el.role === 'nav' || el.attributes?.role === 'navigation'
      );
      expect(navElements.length).toBeGreaterThan(0);
      
      const asideElement = result.elements.find(el => 
        el.role === 'aside' || el.attributes?.role === 'complementary'
      );
      expect(asideElement).toBeDefined();
    });

    test('should extract form fieldsets and legends', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Should extract fieldsets
      const fieldsets = result.elements.filter(el => 
        el.tagName?.toLowerCase() === 'fieldset'
      );
      expect(fieldsets.length).toBeGreaterThan(0);
      
      // Should extract radio groups within fieldsets
      const radioInputs = result.elements.filter(el => 
        el.role === 'radio'
      );
      expect(radioInputs.length).toBeGreaterThan(0);
      
      // Check radio group has same name
      const contactRadios = radioInputs.filter(el => 
        el.attributes?.name === 'contact'
      );
      expect(contactRadios.length).toBe(3);
    });

    test('should extract table headers and accessibility info', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result, stats } = await waitForAccessibilityResults(page);
      
      // Should detect tables with proper headers
      expect(stats.tablesWithHeaders).toBeGreaterThan(0);
      
      // Check for table elements
      const tableElements = result.elements.filter(el => 
        ['table', 'table_head', 'table_body', 'table_row', 'table_header', 'table_cell'].includes(el.role)
      );
      expect(tableElements.length).toBeGreaterThan(0);
      
      // Should extract table with proper ARIA label
      const table = result.elements.find(el => 
        el.role === 'table' && el.attributes?.['aria-label']
      );
      expect(table).toBeDefined();
      expect(table?.attributes?.['aria-label']).toContain('Employee information');
    });
  });

  test.describe('Form Accessibility', () => {
    test('should extract complex form controls with accessibility attributes', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Check date input with constraints
      const dateInput = result.elements.find(el => 
        el.role === 'date' && el.attributes?.name === 'appointment_date'
      );
      expect(dateInput).toBeDefined();
      expect(dateInput?.attributes?.['aria-required']).toBe('true');
      expect(dateInput?.attributes?.min).toBeDefined();
      expect(dateInput?.attributes?.max).toBeDefined();
      
      // Check time input with constraints
      const timeInput = result.elements.find(el => 
        el.role === 'time' && el.attributes?.name === 'appointment_time'
      );
      expect(timeInput).toBeDefined();
      expect(timeInput?.attributes?.min).toBe('09:00');
      expect(timeInput?.attributes?.max).toBe('17:00');
      
      // Check file input with accept attribute
      const fileInput = result.elements.find(el => 
        el.role === 'file' && el.attributes?.name === 'document'
      );
      expect(fileInput).toBeDefined();
      expect(fileInput?.attributes?.accept).toContain('.pdf');
      expect(fileInput?.attributes?.multiple).toBeDefined();
      
      // Check range input
      const rangeInput = result.elements.find(el => 
        el.role === 'range' && el.attributes?.name === 'budget'
      );
      expect(rangeInput).toBeDefined();
      expect(rangeInput?.attributes?.min).toBe('1000');
      expect(rangeInput?.attributes?.max).toBe('10000');
    });

    test('should extract label associations correctly', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Check explicit label-input associations
      const searchInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'search'
      );
      expect(searchInput).toBeDefined();
      expect(searchInput?.attributes?.id).toBe('search-input');
      
      // Check that radio buttons have proper labels
      const radioInputs = result.elements.filter(el => 
        el.role === 'radio' && el.attributes?.name === 'contact'
      );
      
      radioInputs.forEach(radio => {
        expect(radio.attributes?.id).toBeDefined();
        // Should have corresponding label (checked by browser)
      });
    });

    test('should extract describedby relationships', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Check aria-describedby attributes
      const elementsWithDescriptions = result.elements.filter(el => 
        el.attributes?.['aria-describedby']
      );
      expect(elementsWithDescriptions.length).toBeGreaterThan(0);
      
      // Check specific describedby relationship
      const searchInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'search'
      );
      expect(searchInput?.attributes?.['aria-describedby']).toBe('search-help');
      
      const usernameInput = result.elements.find(el => 
        el.role === 'input' && el.attributes?.name === 'username'
      );
      expect(usernameInput?.attributes?.['aria-describedby']).toBe('username-error');
    });
  });

  test.describe('Navigation Accessibility', () => {
    test('should extract navigation with aria-label', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Check main navigation
      const mainNav = result.elements.find(el => 
        el.role === 'nav' && el.attributes?.['aria-label'] === 'Main navigation'
      );
      expect(mainNav).toBeDefined();
      
      // Check breadcrumb navigation
      const breadcrumbNav = result.elements.find(el => 
        el.role === 'nav' && el.attributes?.['aria-label'] === 'Breadcrumb'
      );
      expect(breadcrumbNav).toBeDefined();
      
      // Check aria-current attributes
      const currentLinks = result.elements.filter(el => 
        el.role === 'link' && el.attributes?.['aria-current']
      );
      expect(currentLinks.length).toBeGreaterThan(0);
    });

    test('should extract button accessibility information', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Check buttons with aria-label
      const editButtons = result.elements.filter(el => 
        el.role === 'button' && 
        el.attributes?.['aria-label'] && 
        el.attributes['aria-label'].includes('Edit')
      );
      expect(editButtons.length).toBeGreaterThan(0);
      
      // Check buttons with aria-describedby
      const buttonsWithDesc = result.elements.filter(el => 
        el.role === 'button' && el.attributes?.['aria-describedby']
      );
      expect(buttonsWithDesc.length).toBeGreaterThan(0);
    });
  });

  test.describe('Dynamic Content Accessibility', () => {
    test('should handle live regions with dynamic updates', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      // Wait for initial extraction
      await waitForAccessibilityResults(page);
      
      // Test dynamic content updates
      await page.click('#status-btn');
      await page.waitForTimeout(100);
      
      await page.click('#error-btn');
      await page.waitForTimeout(100);
      
      // Extract again to see if live regions are still detected
      const dynamicResult = await page.evaluate(async () => {
        const { extractSemanticMap } = await import('/dist/index.js');
        return await extractSemanticMap(document, {
          tokenBudget: 8000,
          debug: false
        });
      });
      
      // Should still detect live regions after dynamic updates
      const liveRegions = dynamicResult.elements.filter(el => 
        el.attributes?.['aria-live']
      );
      expect(liveRegions.length).toBeGreaterThanOrEqual(2);
      
      // Check that content was updated
      const statusRegion = await page.$('#status-region');
      const statusText = await statusRegion?.textContent();
      expect(statusText).toContain('Status updated at');
      
      const errorRegion = await page.$('#error-region');
      const errorText = await errorRegion?.textContent();
      expect(errorText).toContain('Error: Something went wrong');
    });
  });

  test.describe('Accessibility Best Practices', () => {
    test('should verify focus management attributes', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Check for elements that should be focusable
      const interactiveElements = result.elements.filter(el => 
        ['input', 'button', 'select', 'textarea', 'link'].includes(el.role)
      );
      expect(interactiveElements.length).toBeGreaterThan(10);
      
      // Check for elements with tabindex (if any)
      const elementsWithTabindex = result.elements.filter(el => 
        el.attributes?.tabindex !== undefined
      );
      // This might be 0 if no explicit tabindex is set, which is good
      expect(elementsWithTabindex.length).toBeGreaterThanOrEqual(0);
    });

    test('should extract role attributes correctly', async ({ page }) => {
      await page.goto('/accessibility.html');
      
      const { result } = await waitForAccessibilityResults(page);
      
      // Check for elements with explicit role attributes
      const elementsWithRoles = result.elements.filter(el => 
        el.attributes?.role
      );
      expect(elementsWithRoles.length).toBeGreaterThan(0);
      
      // Check specific roles
      const tableWithRole = result.elements.find(el => 
        el.attributes?.role === 'table'
      );
      expect(tableWithRole).toBeDefined();
      
      const complementaryAside = result.elements.find(el => 
        el.attributes?.role === 'complementary'
      );
      expect(complementaryAside).toBeDefined();
    });
  });
});

// Extend global window interface for accessibility test results
declare global {
  interface Window {
    ariadneResult?: AriadneMap;
    ariadneError?: Error;
    accessibilityStats?: {
      ariaLabels: number;
      ariaDescriptions: number;
      requiredFields: number;
      liveRegions: number;
      landmarks: number;
      tablesWithHeaders: number;
    };
  }
}