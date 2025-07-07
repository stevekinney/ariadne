import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Basic DOM Extraction', () => {
  test('should extract basic page elements', async ({ page }) => {
    // Navigate to the test page
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    
    // Wait for the page to load and dynamic content to be added
    await page.waitForSelector('#dynamic-content');
    
    // Add the Ariadne library to the page as ES module
    await page.addScriptTag({ 
      path: path.join(__dirname, '../../dist/index.js'),
      type: 'module'
    });
    
    // Test basic extraction
    const extractionResult = await page.evaluate(async () => {
      // Import the module dynamically
      const { Ariadne } = await import('./../../dist/index.js');
      const ariadne = new Ariadne({
        tokenBudget: 1000,
        includeHidden: false
      });
      
      return await ariadne.extract(document);
    });
    
    // Verify basic structure
    expect(extractionResult).toHaveProperty('title');
    expect(extractionResult.title).toBe('Ariadne DOM Extraction Test Page');
    
    // Verify headings
    expect(extractionResult.headings).toBeDefined();
    expect(extractionResult.headings.length).toBeGreaterThan(0);
    expect(extractionResult.headings[0]).toContain('Ariadne DOM Extraction Test Page');
    
    // Verify links
    expect(extractionResult.links).toBeDefined();
    expect(extractionResult.links.length).toBeGreaterThan(0);
    
    const homeLink = extractionResult.links.find((link: any) => link.text === 'Home');
    expect(homeLink).toBeDefined();
    expect(homeLink.href).toBe('/home');
    
    // Verify forms
    expect(extractionResult.forms).toBeDefined();
    expect(extractionResult.forms.length).toBeGreaterThan(0);
    
    const testForm = extractionResult.forms[0];
    expect(testForm.action).toBe('/submit');
    expect(testForm.method).toBe('POST');
    expect(testForm.inputs).toBeDefined();
    expect(testForm.inputs.length).toBeGreaterThan(0);
    
    // Verify buttons
    expect(extractionResult.buttons).toBeDefined();
    expect(extractionResult.buttons.length).toBeGreaterThan(0);
    
    const submitButton = extractionResult.buttons.find((btn: any) => btn.text === 'Submit Form');
    expect(submitButton).toBeDefined();
    expect(submitButton.type).toBe('submit');
  });

  test('should extract form inputs correctly', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    // Check text input
    const nameInput = formInputs.find((input: any) => input.name === 'name');
    expect(nameInput).toBeDefined();
    expect(nameInput.type).toBe('text');
    expect(nameInput.required).toBe(true);
    expect(nameInput.placeholder).toBe('Enter your name');
    
    // Check email input
    const emailInput = formInputs.find((input: any) => input.name === 'email');
    expect(emailInput).toBeDefined();
    expect(emailInput.type).toBe('email');
    expect(emailInput.required).toBe(true);
    
    // Check number input
    const ageInput = formInputs.find((input: any) => input.name === 'age');
    expect(ageInput).toBeDefined();
    expect(ageInput.type).toBe('number');
    expect(ageInput.min).toBe('0');
    expect(ageInput.max).toBe('120');
    
    // Check select input
    const genderSelect = formInputs.find((input: any) => input.name === 'gender');
    expect(genderSelect).toBeDefined();
    expect(genderSelect.type).toBe('select-one');
    expect(genderSelect.options).toBeDefined();
    expect(genderSelect.options.length).toBeGreaterThan(0);
    
    // Check textarea
    const bioTextarea = formInputs.find((input: any) => input.name === 'bio');
    expect(bioTextarea).toBeDefined();
    expect(bioTextarea.type).toBe('textarea');
    expect(bioTextarea.rows).toBe('4');
    
    // Check checkbox
    const newsletterCheckbox = formInputs.find((input: any) => input.name === 'newsletter');
    expect(newsletterCheckbox).toBeDefined();
    expect(newsletterCheckbox.type).toBe('checkbox');
    expect(newsletterCheckbox.value).toBe('yes');
    
    // Check radio buttons
    const radioInputs = formInputs.filter((input: any) => input.name === 'contact-method');
    expect(radioInputs.length).toBe(2);
    expect(radioInputs[0].type).toBe('radio');
    expect(radioInputs[1].type).toBe('radio');
    
    // Check file input
    const fileInput = formInputs.find((input: any) => input.name === 'avatar');
    expect(fileInput).toBeDefined();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('image/*');
  });

  test('should extract table data correctly', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const tables = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.tables;
    });
    
    expect(tables).toBeDefined();
    expect(tables.length).toBeGreaterThan(0);
    
    const dataTable = tables[0];
    expect(dataTable.headers).toBeDefined();
    expect(dataTable.headers).toEqual(['ID', 'Name', 'Status', 'Actions']);
    
    expect(dataTable.rows).toBeDefined();
    expect(dataTable.rows.length).toBe(3);
    
    // Check first row
    expect(dataTable.rows[0]).toEqual(['1', 'John Doe', 'Active', expect.any(String)]);
    expect(dataTable.rows[1]).toEqual(['2', 'Jane Smith', 'Inactive', expect.any(String)]);
    expect(dataTable.rows[2]).toEqual(['3', 'Bob Johnson', 'Pending', expect.any(String)]);
  });

  test('should extract lists correctly', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const lists = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.lists;
    });
    
    expect(lists).toBeDefined();
    expect(lists.length).toBeGreaterThan(0);
    
    // Find the features list (unordered)
    const featuresList = lists.find((list: any) => list.items.includes('Semantic HTML extraction'));
    expect(featuresList).toBeDefined();
    expect(featuresList.type).toBe('ul');
    expect(featuresList.items).toContain('Web Worker support');
    expect(featuresList.items).toContain('Cross-browser compatibility');
    expect(featuresList.items).toContain('TypeScript support');
    
    // Find the steps list (ordered)
    const stepsList = lists.find((list: any) => list.items.includes('Initialize the library'));
    expect(stepsList).toBeDefined();
    expect(stepsList.type).toBe('ol');
    expect(stepsList.items).toContain('Configure extraction options');
    expect(stepsList.items).toContain('Process the DOM');
    expect(stepsList.items).toContain('Handle the results');
  });

  test('should respect hidden content setting', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    // Test with includeHidden: false (default)
    const resultWithoutHidden = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({ includeHidden: false });
      return await ariadne.extract(document);
    });
    
    // Hidden content should not be included
    const hiddenButton = resultWithoutHidden.buttons.find((btn: any) => btn.text === 'Hidden Button');
    expect(hiddenButton).toBeUndefined();
    
    // Test with includeHidden: true
    const resultWithHidden = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({ includeHidden: true });
      return await ariadne.extract(document);
    });
    
    // Hidden content should be included
    const hiddenButtonIncluded = resultWithHidden.buttons.find((btn: any) => btn.text === 'Hidden Button');
    expect(hiddenButtonIncluded).toBeDefined();
  });

  test('should handle dynamic content', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'test-page.html')}`);
    await page.waitForSelector('#dynamic-content');
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const result = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      return await ariadne.extract(document);
    });
    
    // Check that dynamic content is included
    const dynamicHeading = result.headings.find((heading: string) => heading.includes('Dynamic Content'));
    expect(dynamicHeading).toBeDefined();
  });
});