import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Complex Form Extraction', () => {
  test('should extract complex multi-section form', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const extractionResult = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        tokenBudget: 2000 // Increase budget for complex form
      });
      return await ariadne.extract(document);
    });
    
    expect(extractionResult.forms).toBeDefined();
    expect(extractionResult.forms.length).toBe(1);
    
    const complexForm = extractionResult.forms[0];
    expect(complexForm.action).toBe('/submit-complex');
    expect(complexForm.method).toBe('POST');
    expect(complexForm.enctype).toBe('multipart/form-data');
    expect(complexForm.inputs).toBeDefined();
    expect(complexForm.inputs.length).toBeGreaterThan(20); // Should have many inputs
  });

  test('should extract text inputs with validation attributes', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    // Test required text inputs
    const firstNameInput = formInputs.find((input: any) => input.name === 'firstName');
    expect(firstNameInput).toBeDefined();
    expect(firstNameInput.type).toBe('text');
    expect(firstNameInput.required).toBe(true);
    expect(firstNameInput.placeholder).toBe('John');
    
    const lastNameInput = formInputs.find((input: any) => input.name === 'lastName');
    expect(lastNameInput).toBeDefined();
    expect(lastNameInput.type).toBe('text');
    expect(lastNameInput.required).toBe(true);
    
    // Test optional text input
    const middleNameInput = formInputs.find((input: any) => input.name === 'middleName');
    expect(middleNameInput).toBeDefined();
    expect(middleNameInput.type).toBe('text');
    expect(middleNameInput.required).toBe(false);
    
    // Test date input
    const dobInput = formInputs.find((input: any) => input.name === 'dateOfBirth');
    expect(dobInput).toBeDefined();
    expect(dobInput.type).toBe('date');
    
    // Test input with pattern validation
    const ssnInput = formInputs.find((input: any) => input.name === 'ssn');
    expect(ssnInput).toBeDefined();
    expect(ssnInput.type).toBe('text');
    expect(ssnInput.pattern).toBe('[0-9]{3}-[0-9]{2}-[0-9]{4}');
  });

  test('should extract email and telephone inputs', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    // Test email inputs
    const primaryEmailInput = formInputs.find((input: any) => input.name === 'emailPrimary');
    expect(primaryEmailInput).toBeDefined();
    expect(primaryEmailInput.type).toBe('email');
    expect(primaryEmailInput.required).toBe(true);
    
    const secondaryEmailInput = formInputs.find((input: any) => input.name === 'emailSecondary');
    expect(secondaryEmailInput).toBeDefined();
    expect(secondaryEmailInput.type).toBe('email');
    expect(secondaryEmailInput.required).toBe(false);
    
    // Test telephone inputs
    const homePhoneInput = formInputs.find((input: any) => input.name === 'phoneHome');
    expect(homePhoneInput).toBeDefined();
    expect(homePhoneInput.type).toBe('tel');
    
    const mobilePhoneInput = formInputs.find((input: any) => input.name === 'phoneMobile');
    expect(mobilePhoneInput).toBeDefined();
    expect(mobilePhoneInput.type).toBe('tel');
    expect(mobilePhoneInput.required).toBe(true);
  });

  test('should extract select inputs with options', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    // Test state select
    const stateSelect = formInputs.find((input: any) => input.name === 'state');
    expect(stateSelect).toBeDefined();
    expect(stateSelect.type).toBe('select-one');
    expect(stateSelect.required).toBe(true);
    expect(stateSelect.options).toBeDefined();
    expect(stateSelect.options.length).toBeGreaterThan(0);
    expect(stateSelect.options).toContain('Alabama');
    expect(stateSelect.options).toContain('California');
    expect(stateSelect.options).toContain('New York');
    
    // Test employment status select
    const employmentStatusSelect = formInputs.find((input: any) => input.name === 'employmentStatus');
    expect(employmentStatusSelect).toBeDefined();
    expect(employmentStatusSelect.type).toBe('select-one');
    expect(employmentStatusSelect.options).toContain('Full-time');
    expect(employmentStatusSelect.options).toContain('Part-time');
    expect(employmentStatusSelect.options).toContain('Contract');
    
    // Test multiple select
    const communicationMethodSelect = formInputs.find((input: any) => input.name === 'communicationMethod');
    expect(communicationMethodSelect).toBeDefined();
    expect(communicationMethodSelect.type).toBe('select-multiple');
    expect(communicationMethodSelect.multiple).toBe(true);
    expect(communicationMethodSelect.size).toBe('4');
  });

  test('should extract radio button groups', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    // Test gender radio buttons
    const genderRadios = formInputs.filter((input: any) => input.name === 'gender');
    expect(genderRadios.length).toBe(4);
    
    const expectedValues = ['male', 'female', 'other', 'prefer-not-to-say'];
    genderRadios.forEach((radio: any) => {
      expect(radio.type).toBe('radio');
      expect(expectedValues).toContain(radio.value);
    });
  });

  test('should extract checkbox groups', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    // Test interests checkboxes
    const interestCheckboxes = formInputs.filter((input: any) => input.name === 'interests');
    expect(interestCheckboxes.length).toBe(6);
    
    const expectedInterests = ['technology', 'sports', 'music', 'travel', 'food', 'books'];
    interestCheckboxes.forEach((checkbox: any) => {
      expect(checkbox.type).toBe('checkbox');
      expect(expectedInterests).toContain(checkbox.value);
    });
    
    // Test terms and conditions checkboxes
    const termsCheckbox = formInputs.find((input: any) => input.name === 'termsAgree');
    expect(termsCheckbox).toBeDefined();
    expect(termsCheckbox.type).toBe('checkbox');
    expect(termsCheckbox.required).toBe(true);
    
    const privacyCheckbox = formInputs.find((input: any) => input.name === 'privacyAgree');
    expect(privacyCheckbox).toBeDefined();
    expect(privacyCheckbox.type).toBe('checkbox');
    expect(privacyCheckbox.required).toBe(true);
    
    const newsletterCheckbox = formInputs.find((input: any) => input.name === 'newsletterSubscribe');
    expect(newsletterCheckbox).toBeDefined();
    expect(newsletterCheckbox.type).toBe('checkbox');
    expect(newsletterCheckbox.required).toBe(false);
  });

  test('should extract file inputs', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    // Test profile photo file input
    const profilePhotoInput = formInputs.find((input: any) => input.name === 'profilePhoto');
    expect(profilePhotoInput).toBeDefined();
    expect(profilePhotoInput.type).toBe('file');
    expect(profilePhotoInput.accept).toBe('image/*');
    
    // Test resume file input
    const resumeInput = formInputs.find((input: any) => input.name === 'resume');
    expect(resumeInput).toBeDefined();
    expect(resumeInput.type).toBe('file');
    expect(resumeInput.accept).toBe('.pdf,.doc,.docx');
    
    // Test multiple file input
    const additionalDocsInput = formInputs.find((input: any) => input.name === 'additionalDocs');
    expect(additionalDocsInput).toBeDefined();
    expect(additionalDocsInput.type).toBe('file');
    expect(additionalDocsInput.multiple).toBe(true);
  });

  test('should extract textarea inputs', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const formInputs = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.forms[0].inputs;
    });
    
    const commentsTextarea = formInputs.find((input: any) => input.name === 'comments');
    expect(commentsTextarea).toBeDefined();
    expect(commentsTextarea.type).toBe('textarea');
    expect(commentsTextarea.rows).toBe('4');
    expect(commentsTextarea.placeholder).toBe('Please share any additional information or comments...');
  });

  test('should extract form buttons', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    const buttons = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne();
      const result = await ariadne.extract(document);
      return result.buttons;
    });
    
    // Test submit button
    const submitButton = buttons.find((btn: any) => btn.text === 'Submit Application');
    expect(submitButton).toBeDefined();
    expect(submitButton.type).toBe('submit');
    
    // Test regular button
    const saveDraftButton = buttons.find((btn: any) => btn.text === 'Save as Draft');
    expect(saveDraftButton).toBeDefined();
    expect(saveDraftButton.type).toBe('button');
    
    // Test reset button
    const resetButton = buttons.find((btn: any) => btn.text === 'Clear Form');
    expect(resetButton).toBeDefined();
    expect(resetButton.type).toBe('reset');
    
    // Test cancel button
    const cancelButton = buttons.find((btn: any) => btn.text === 'Cancel');
    expect(cancelButton).toBeDefined();
    expect(cancelButton.type).toBe('button');
  });

  test('should respect token budget limits', async ({ page }) => {
    await page.goto(`file://${path.join(__dirname, 'fixtures', 'complex-form.html')}`);
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/index.js') });
    
    // Test with very small token budget
    const smallBudgetResult = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        tokenBudget: 100 // Very small budget
      });
      return await ariadne.extract(document);
    });
    
    // Test with larger token budget
    const largeBudgetResult = await page.evaluate(async () => {
      // @ts-expect-error - ariadne is not a global
      const ariadne = new window.Ariadne({
        tokenBudget: 5000 // Large budget
      });
      return await ariadne.extract(document);
    });
    
    // Large budget should extract more content
    expect(largeBudgetResult.forms[0].inputs.length).toBeGreaterThanOrEqual(
      smallBudgetResult.forms[0].inputs.length
    );
  });
});