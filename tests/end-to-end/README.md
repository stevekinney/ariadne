# Ariadne Browser Tests

This directory contains comprehensive browser tests for the Ariadne semantic HTML extraction library using Playwright.

## Overview

The browser tests validate that Ariadne works correctly in real browser environments with:

- Web Workers for secure processing
- DOM manipulation and extraction
- Memory management and resource cleanup
- Performance under various conditions
- Error handling and edge cases

## Test Structure

### Test Files

- **`ariadne.spec.ts`** - Core functionality tests

  - Basic element extraction
  - Worker management (initialization, termination, abort)
  - Error handling
  - Configuration options
  - Performance benchmarks

- **`edge-cases.spec.ts`** - Edge case and error handling tests

  - Malformed HTML handling
  - Hidden elements
  - Special characters and Unicode
  - Duplicate IDs and names
  - Custom elements
  - Memory management
  - Concurrent extractions

- **`performance.spec.ts`** - Performance and scalability tests
  - Large document handling
  - Token budget constraints
  - Memory leak detection
  - Concurrent extraction efficiency

### Test Fixtures

Located in `tests/browser/fixtures/`:

- **`index.html`** - Test suite homepage
- **`simple-form.html`** - Basic form with various input types
- **`complex-layout.html`** - Complex page with nested structures, tables, multiple forms
- **`large-document.html`** - Large document with hundreds of elements for performance testing
- **`edge-cases.html`** - Various edge cases and malformed HTML

## Running Tests

### Prerequisites

1. Build the project:

   ```bash
   bun run build
   ```

2. Install Playwright browsers (done automatically):
   ```bash
   bunx playwright install
   ```

### Running Tests

```bash
# Run all browser tests
bun run test:browser

# Run with browser UI visible
bun run test:browser:headed

# Run in debug mode (step through tests)
bun run test:browser:debug

# Run with Playwright UI
bun run test:browser:ui

# Run specific test file
bun run test:browser ariadne.spec.ts

# Run specific test
bun run test:browser -g "should extract elements from simple form"
```

### Using the Test Runner

```bash
# Run the comprehensive test runner
bun run tests/browser/run-tests.ts

# Pass arguments to Playwright
bun run tests/browser/run-tests.ts --headed
bun run tests/browser/run-tests.ts --debug
```

## Test Architecture

### Test Server

The tests use a custom Bun-based server (`tests/browser/server.ts`) that:

- Serves static test fixtures
- Provides the built Ariadne library
- Handles CORS for testing
- Maps fixture URLs for easy access

### Test Patterns

#### Waiting for Ariadne Results

Tests use a common pattern to wait for Ariadne extraction results:

```typescript
async function waitForAriadneResult(page: Page): Promise<AriadneMap> {
  return await page.evaluate(() => {
    return new Promise<AriadneMap>((resolve, reject) => {
      const checkResult = () => {
        if (window.ariadneResult) {
          resolve(window.ariadneResult);
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
```

#### Testing Extraction Results

```typescript
test('should extract form elements', async ({ page }) => {
  await page.goto('/simple-form.html');

  const result = await waitForAriadneResult(page);

  expect(result.elements.length).toBeGreaterThan(0);

  const formElement = result.elements.find((el) => el.role === 'form');
  expect(formElement).toBeDefined();
});
```

## Configuration

### Playwright Config

The `playwright.config.ts` file configures:

- Multiple browser engines (Chromium, Firefox, WebKit)
- Mobile device testing
- Test timeouts and retries
- Reporting options
- Test server setup

### Browser Support

Tests run against:

- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)

## What Gets Tested

### Core Functionality

- ✅ Element extraction from various HTML structures
- ✅ Web Worker initialization and communication
- ✅ Configuration option handling
- ✅ Error handling and validation
- ✅ Resource cleanup and memory management

### Advanced Features

- ✅ Token budget enforcement
- ✅ Element marking and callbacks
- ✅ Cross-origin iframe handling
- ✅ Dynamic content detection
- ✅ Concurrent extraction handling

### Performance

- ✅ Large document processing
- ✅ Multiple extraction efficiency
- ✅ Memory leak prevention
- ✅ Scalability under load

### Edge Cases

- ✅ Malformed HTML handling
- ✅ Special characters and Unicode
- ✅ Hidden and invisible elements
- ✅ Duplicate IDs and names
- ✅ Custom elements and unknown tags
- ✅ Empty and whitespace-only content

## Debugging Tests

### Visual Debugging

```bash
# Run with browser visible
bun run test:browser:headed

# Step through tests
bun run test:browser:debug
```

### Manual Testing

1. Start the test server:

   ```bash
   bun run tests/browser/server.ts
   ```

2. Open http://localhost:3000 in your browser

3. Navigate to test fixtures and observe Ariadne behavior

### Test Output

Tests generate:

- HTML reports in `playwright-report/`
- Screenshots on failure
- Video recordings on failure
- Trace files for debugging

## Continuous Integration

The tests are designed to run in CI environments:

- Automatic browser installation
- Headless mode by default
- Proper timeout and retry configuration
- Comprehensive reporting

Add to your CI pipeline:

```yaml
- name: Run browser tests
  run: |
    bun run build
    bun run test:browser
```

## Contributing

When adding new tests:

1. **Add test fixtures** in `tests/browser/fixtures/` if needed
2. **Follow existing patterns** for waiting on Ariadne results
3. **Test multiple browsers** where relevant
4. **Include performance considerations** for large tests
5. **Document edge cases** being tested
6. **Clean up resources** (call `client.terminate()` when needed)

### Performance Test Guidelines

- Use `test.setTimeout(60000)` for long-running tests
- Test with various token budgets
- Verify memory cleanup
- Check for performance regressions
- Test concurrent usage patterns
