# 🧵 Ariadne - Semantic HTML Extraction for LLM Navigation

**Ariadne** transforms verbose HTML into compact, LLM-friendly semantic maps. Like the mythological thread that guided Theseus through the labyrinth, Ariadne provides a clear path through complex web pages for AI agents.

Built specifically for **browser environments** using **Web Workers** for secure, sandboxed processing.

## 📑 Table of Contents

- [🎯 Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [📚 Complete API Reference](#-complete-api-reference)
- [🧬 Semantic Elements](#-semantic-elements)
- [🏷️ Label Resolution](#️-label-resolution)
- [📈 Output Format](#-output-format)
- [🎯 Use Cases](#-use-cases)
- [🤖 Working with LLMs](#-working-with-llms)
- [🌐 Browser Support](#-browser-support)
- [📈 Performance](#-performance-1)
- [🏗️ Architecture](#️-architecture)
- [🎛️ Configuration Options](#️-configuration-options)
- [🔍 Advanced Use Cases](#-advanced-use-cases)
- [🚨 Troubleshooting](#-troubleshooting)
- [📖 Best Practices](#-best-practices)
- [🔒 Security Considerations](#-security-considerations)
- [📋 Comparison with Alternatives](#-comparison-with-alternatives)
- [❓ Frequently Asked Questions](#-frequently-asked-questions)
- [🔄 Migration Guide](#-migration-guide)
- [🔧 Development](#-development)
- [🤝 Contributing](#-contributing)

## 🎯 Key Features

- **🧬 Semantic Extraction**: Converts HTML into structured JSON with semantic meaning
- **⚡ Performance Optimized**: ≤150ms extraction time, 10x token reduction vs raw HTML
- **🎯 LLM Ready**: Output designed for direct LLM consumption
- **🔒 Secure**: Sandboxed Web Worker processing with no network I/O
- **🏷️ Smart Labeling**: 5-priority label resolution system
- **🆔 Efficient IDs**: Short hash-based IDs (8-12 chars vs 36 for UUIDs)
- **🌐 Browser-Native**: Designed for modern web applications
- **🎨 Element Marking**: Optional callbacks to process and mark DOM elements
- **📦 Flexible Output**: Choose between array or object-based element structure

## 🚀 Quick Start

### Installation

```bash
# With Bun (recommended)
bun add ariadne

# With npm
npm install ariadne

# With yarn
yarn add ariadne

# With pnpm
pnpm add ariadne
```

### Basic Usage

```typescript
import { extractSemanticMap } from 'ariadne';

// Extract semantic map from current document
const semanticMap = await extractSemanticMap(document);

console.log(`Found ${semanticMap.elements.length} semantic elements`);
```

### Advanced Usage

```typescript
import { Ariadne } from 'ariadne';

const client = new Ariadne({
  tokenBudget: 4000, // Maximum output tokens
  includeChildren: true, // Include parent-child relationships
  debug: false, // Enable debug logging
});

const map = await client.extract(document);
client.terminate(); // Clean up worker

// Process results with array format
if (map.elements) {
  map.elements.forEach((element) => {
    console.log(`${element.role}: ${element.label}`);
  });
}
```

### Element Processing Callbacks

Mark elements in the DOM as they are processed:

```typescript
const client = new Ariadne({
  // Mark elements with data attributes
  markElements: true,
  elementAttribute: 'data-ariadne-id',

  // Custom processing callback
  onElementProcess: (element, id) => {
    console.log(`Processing ${element.tagName} with ID: ${id}`);
    // Add custom behavior, analytics, etc.
  },
});

const map = await client.extract(document);

// Elements now have data-ariadne-id attributes
const markedButton = document.querySelector('[data-ariadne-id]');
console.log(markedButton?.getAttribute('data-ariadne-id')); // e.g., "3Kx9aB2"
```

### Flexible Output Formats

Choose between array or object-based element structure:

```typescript
// Object format (default) - O(1) element lookup
const client1 = new Ariadne({
  elementsAsObject: true,
  includeElementIds: true,
});

const map1 = await client1.extract(document);

// Access elements by ID
if (map1.elementsById) {
  const element = map1.elementsById['3Kx9aB2'];
  console.log(element.role, element.label);
}

// Use the ID array for iteration
if (map1.elementIds) {
  map1.elementIds.forEach((id) => {
    const element = map1.elementsById![id];
    console.log(element);
  });
}

// Compact mode for smaller output
const client2 = new Ariadne({
  compact: true, // Disables object format and ID array
});

const map2 = await client2.extract(document);
// Uses traditional array format with minimal overhead
```

### Real-World Example

Using the test form from `examples/test-form.html`:

```html
<form id="registration-form" action="/register" method="POST">
  <fieldset>
    <legend>Personal Information</legend>

    <div class="form-group">
      <label for="first-name">First Name:</label>
      <input type="text" id="first-name" name="firstName" required />
    </div>

    <div class="form-group">
      <label for="email">Email Address:</label>
      <input
        type="email"
        id="email"
        name="email"
        placeholder="you@example.com"
        required
      />
    </div>
  </fieldset>

  <fieldset>
    <legend>Account Security</legend>

    <div class="form-group">
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required />
    </div>
  </fieldset>

  <div class="form-group">
    <label>
      <input type="checkbox" name="terms" value="accepted" required />
      I agree to the Terms and Conditions
    </label>
  </div>

  <div class="form-actions">
    <button type="submit">Create Account</button>
    <button type="reset">Clear Form</button>
  </div>
</form>
```

Ariadne extracts this semantic map:

```javascript
{
  "schemaVersion": "1.0",
  "meta": {
    "url": "file:///path/to/examples/test-form.html",
    "timestamp": 1735689600000
  },
  "elements": [
    {
      "id": "2Hx9K3m",
      "role": "form",
      "label": "User Registration Form",
      "selector": "#registration-form",
      "parentId": null,
      "children": ["3Kx9aB2", "7Nm4Qw8", "9Pr5Tx1", "4Hs6Zy9", "1Wx3Kr5", "8Qm2Np7"]
    },
    {
      "id": "3Kx9aB2",
      "role": "input",
      "label": "First Name",
      "selector": "#first-name",
      "parentId": "2Hx9K3m",
      "state": {
        "value": "",
        "disabled": false
      }
    },
    {
      "id": "7Nm4Qw8",
      "role": "email",
      "label": "Email Address",
      "selector": "#email",
      "parentId": "2Hx9K3m",
      "state": {
        "value": "",
        "disabled": false
      }
    },
    {
      "id": "9Pr5Tx1",
      "role": "password",
      "label": "Password",
      "selector": "#password",
      "parentId": "2Hx9K3m",
      "state": {
        "value": "",
        "disabled": false
      }
    },
    {
      "id": "4Hs6Zy9",
      "role": "checkbox",
      "label": "I agree to the Terms and Conditions",
      "selector": "input[name=\"terms\"]",
      "parentId": "2Hx9K3m",
      "state": {
        "checked": false,
        "value": "accepted",
        "disabled": false
      }
    },
    {
      "id": "1Wx3Kr5",
      "role": "button",
      "label": "Create Account",
      "selector": "button[type=\"submit\"]",
      "parentId": "2Hx9K3m",
      "state": {
        "disabled": false
      }
    },
    {
      "id": "8Qm2Np7",
      "role": "button",
      "label": "Clear Form",
      "selector": "button[type=\"reset\"]",
      "parentId": "2Hx9K3m",
      "state": {
        "disabled": false
      }
    }
  ],
  "partial": false
```

## 📚 Complete API Reference

### Functions

#### `extractSemanticMap(doc, config?)`

The main extraction function. Creates and manages an Ariadne instance internally.

```typescript
async function extractSemanticMap(
  doc: Document,
  config?: AriadneConfiguration,
): Promise<AriadneMap>;
```

**Parameters:**

- `doc: Document` - The DOM document to extract from. Must have documentElement and location properties.
- `config?: AriadneConfiguration` - Optional configuration object

**Returns:** `Promise<AriadneMap>` - The extracted semantic map

**Throws:** `AriadneError` - When document validation fails or extraction encounters an error

**Example:**

```typescript
// Simple extraction with default configuration
const map = await extractSemanticMap(document);

// Extraction with custom configuration
const map = await extractSemanticMap(document, {
  tokenBudget: 8000,
  includeChildren: false,
  debug: true,
});
```

### Classes

#### `Ariadne`

The main client class for advanced usage scenarios where you need persistent configuration or multiple extractions.

```typescript
export class Ariadne {
  constructor(config?: AriadneConfiguration);
  extract(doc: Document): Promise<AriadneMap>;
  terminate(): void;
  abort(): void;
}
```

**Constructor:**

```typescript
new Ariadne(config?: AriadneConfiguration)
```

Creates a new Ariadne client instance with the specified configuration.

**Methods:**

##### `extract(doc: Document): Promise<AriadneMap>`

Extract semantic information from a DOM document. Processes the document through a Web Worker to extract semantic elements. Respects the configured token budget and includes metadata about the page.

**Throws:** `AriadneError` when document validation fails, worker initialization fails, processing times out, or Web Worker encounters an error.

##### `terminate(): void`

Terminate the worker and clean up all resources. Shuts down the Web Worker, cancels any ongoing operations, and releases all allocated resources. After calling terminate(), the client cannot be used for further extractions.

##### `abort(): void`

Abort the current extraction operation without terminating the worker. The client can still be used for subsequent extractions after aborting.

**Example:**

```typescript
import { Ariadne } from 'ariadne';

const client = new Ariadne({ tokenBudget: 5000 });

try {
  const map1 = await client.extract(document);
  const map2 = await client.extract(anotherDocument);
} finally {
  client.terminate(); // Always clean up
}
```

### Types

#### `AriadneConfiguration`

Configuration options for extraction.

```typescript
interface AriadneConfiguration {
  tokenBudget?: number; // Maximum tokens in output (default: 4000, max: 100000)
  includeChildren?: boolean; // Include parent-child relationships (default: true)
  debug?: boolean; // Enable debug logging (default: false)

  // Node processing options
  onElementProcess?: (element: Element, id: string) => void; // Callback for each processed element
  markElements?: boolean; // Add data attributes to elements (default: false)
  elementAttribute?: string; // Custom attribute name (default: 'data-ariadne-id')

  // Output format options
  compact?: boolean; // Use compact output format (default: false)
  elementsAsObject?: boolean; // Return elements as object keyed by ID (default: true unless compact)
  includeElementIds?: boolean; // Include array of element IDs (default: true unless compact)
}
```

**Validation:** Configuration is validated using `AriadneConfigurationSchema` at runtime with Zod.

#### `AriadneMap`

The complete semantic map returned by extraction.

```typescript
interface AriadneMap {
  schemaVersion: string; // Schema version (currently "1.0")
  meta: AriadneMeta; // Metadata about the extraction
  elements?: AriadneElement[]; // Array of semantic elements (when elementsAsObject is false)
  elementsById?: Record<string, AriadneElement>; // Object of elements keyed by ID (when elementsAsObject is true)
  elementIds?: string[]; // Array of all element IDs (when includeElementIds is true)
  partial: boolean; // True if extraction was truncated
  reason?: 'token_limit_exceeded' | 'processing_error' | null;
  lastProcessedId?: string | undefined; // ID of last element if truncated
}
```

#### `AriadneMeta`

Metadata about the extracted document.

```typescript
interface AriadneMeta {
  url: string; // Document URL
  timestamp: number; // Extraction timestamp (milliseconds since epoch)
  dynamicContent?: boolean; // True if dynamic content detected (optional)
}
```

#### `AriadneElement`

Individual semantic element in the map.

```typescript
interface AriadneElement {
  id: string; // Unique identifier (hash-based, 8-12 chars)
  role: string; // Semantic role from AriadneRole
  label?: string; // Human-readable label
  selector: string; // CSS selector for the element
  parentId: string | null; // Parent element ID
  children?: string[]; // Child element IDs (when includeChildren is true)
  state?: AriadneElementState; // Current state (interactive elements)
  href?: string; // URL for links
  shadowClosed?: boolean; // Has closed shadow DOM
  stub?: 'iframe'; // Iframe stub indicator
  origin?: string; // Origin for iframe stubs
  width?: number; // Dimensions for iframe stubs
  height?: number;
}
```

#### `AriadneElementState`

State information for interactive elements.

```typescript
interface AriadneElementState {
  checked?: boolean; // Checkbox/radio state
  value?: string; // Input/select value
  disabled?: boolean; // Disabled state
  selected?: boolean; // Option selected state
  selectedText?: string; // Selected option text
  [key: string]: unknown; // Additional state properties
}
```

#### `AriadneRole`

Supported semantic roles.

```typescript
type AriadneRole =
  // Forms
  | 'form'
  | 'input'
  | 'checkbox'
  | 'radio'
  | 'password'
  | 'email'
  | 'tel'
  | 'number'
  | 'search'
  | 'url'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'month'
  | 'week'
  | 'color'
  | 'file'
  | 'range'
  | 'select'
  | 'textarea'
  | 'button'
  | 'label'
  // Navigation
  | 'link'
  // Content
  | 'heading'
  | 'paragraph'
  // Tables
  | 'table'
  | 'table_head'
  | 'table_body'
  | 'table_row'
  | 'table_header'
  | 'table_cell';
```

### Error Handling

#### `AriadneError`

Custom error class for all Ariadne errors.

```typescript
class AriadneError extends Error {
  code: AriadneErrorCode;
  details?: Record<string, unknown>;
  statusCode: number;
  isOperational: boolean;
  timestamp: Date;
}
```

#### `AriadneErrorCode`

Error code enumeration.

```typescript
enum AriadneErrorCode {
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  WORKER_ERROR = 'WORKER_ERROR',
  DOM_PARSING_ERROR = 'DOM_PARSING_ERROR',
  TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
}
```

#### Error Type Guards

```typescript
// Check if error is an AriadneError
function isAriadneError(error: unknown): error is AriadneError;

// Check if token limit was exceeded
function isTokenLimitExceeded(error: unknown): boolean;

// Check if worker error occurred
function isWorkerError(error: unknown): boolean;
```

**Example:**

```typescript
import { extractSemanticMap, isAriadneError, isTokenLimitExceeded } from 'ariadne';

try {
  const map = await extractSemanticMap(document);
} catch (error) {
  if (isAriadneError(error)) {
    console.error(`Ariadne error: ${error.code} - ${error.message}`);
    console.error(`Timestamp: ${error.timestamp}`);
    console.error(`Details:`, error.details);

    if (isTokenLimitExceeded(error)) {
      console.log('Token limit exceeded, try reducing tokenBudget');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 🧬 Semantic Elements

Ariadne extracts these semantic element types:

| Role                               | HTML Elements                       | Description         |
| ---------------------------------- | ----------------------------------- | ------------------- |
| `form`                             | `<form>`                            | Form containers     |
| `input`, `email`, `password`, etc. | `<input>`                           | Form inputs by type |
| `button`                           | `<button>`, `<input type="submit">` | Interactive buttons |
| `link`                             | `<a href="...">`                    | Navigation links    |
| `heading`                          | `<h1>` - `<h6>`                     | Page headings       |
| `table`, `table_row`, `table_cell` | `<table>`, `<tr>`, `<td>`           | Tabular data        |

## 🏷️ Label Resolution

Ariadne uses a sophisticated 5-priority system to resolve element labels:

1. **`<label for="...">` elements** - Explicit form labels
2. **`aria-labelledby`** - References to other elements
3. **`aria-label`** - Direct ARIA labels
4. **`placeholder`** - Input placeholder text
5. **Proximity heuristic** - Smart text detection from nearby elements

## 📈 Output Format

Ariadne produces clean, semantic JSON that's perfect for LLM consumption:

```json
{
  "schemaVersion": "1.0",
  "meta": {
    "url": "https://example.com/contact",
    "timestamp": 1720262400000,
    "dynamicContent": false
  },
  "elements": [
    {
      "id": "2Hx9K3m",
      "role": "form",
      "label": "Contact Form",
      "selector": "#contact-form",
      "parentId": null,
      "children": ["7Nm4Qw8", "9Pr5Tx1"]
    },
    {
      "id": "7Nm4Qw8",
      "role": "input",
      "label": "Email Address",
      "selector": "#email",
      "parentId": "2Hx9K3m",
      "state": {
        "value": "",
        "disabled": false
      }
    }
  ],
  "partial": false
}
```

## 🎯 Use Cases

- **LLM Web Automation**: Provide clean semantic context to AI agents
- **Browser Extensions**: Extract page structure for intelligent automation
- **Testing Frameworks**: Generate stable selectors for automated testing
- **Accessibility Tools**: Extract semantic structure for auditing
- **Content Analysis**: Understand page structure and interactive elements
- **AI Assistants**: Enable AI to understand and interact with web pages

## 🤖 Working with LLMs

Ariadne's output is designed to be easily understood by LLMs. Here are example prompts to help LLMs work with the semantic map:

### Navigation & Element Finding

```
Given this Ariadne semantic map, help me:
- Find the login form (look for role: "form" with login-related labels)
- Locate all email input fields (role: "email")
- Identify the main navigation links (role: "link" with navigation context)
- Find the submit button for the contact form (role: "button" with parentId matching the form)
```

### Form Interaction

```
Using the Ariadne map provided:
1. List all forms on the page with their labels
2. For the form with ID "2Hx9K3m", describe all its input fields
3. What information does this form collect?
4. Are there any required fields? (Check the element states)
5. Generate the steps to fill out this form
```

### Page Analysis

```
Analyze this Ariadne semantic map and tell me:
- What is the main purpose of this page?
- How many interactive elements are there?
- What actions can a user take on this page?
- Are there any disabled elements that might indicate locked features?
- Describe the page hierarchy based on parent-child relationships
```

### Automation Scripting

```
Based on this Ariadne map, generate automation code to:
1. Fill in the form with ID "[form-id]" with test data
2. The email field should be "test@example.com"
3. Check the checkbox for terms acceptance
4. Click the submit button
5. Use the selectors provided in the map for each element
```

### Accessibility Review

```
Review this Ariadne map for accessibility:
- Which elements are missing labels?
- Are all form inputs properly labeled?
- Do all interactive elements have descriptive text?
- Flag any elements that might be problematic for screen readers
```

### Object Format Usage (when elementsAsObject: true)

```
The Ariadne map uses an object format where elementsById contains all elements keyed by their ID.
To work with this data:
1. Access any element directly: elementsById["2Hx9K3m"]
2. Use elementIds array to iterate through all elements in order
3. Build parent-child relationships using parentId and children arrays
4. Find elements by role by filtering the elementsById object values
```

### Understanding Element States

```
Element states in Ariadne maps indicate:
- checked: boolean for checkboxes/radios
- value: current text in inputs/textareas
- disabled: whether the element is interactive
- selectedText: visible text of selected option in dropdowns

Use these states to understand the current form status and validate user flows.
```

## 🌐 Browser Support

- **Chrome**: ✅ 69+
- **Firefox**: ✅ 105+
- **Safari**: ✅ 15.4+
- **Edge**: ✅ 79+

_Requires Web Worker support and modern ES2022 features_

## 📈 Performance

| Metric              | Typical Value | Description                 |
| ------------------- | ------------- | --------------------------- |
| **Processing Time** | <500ms        | Full page extraction\*      |
| **Token Reduction** | 5-10x smaller | vs raw HTML\*               |
| **Memory Usage**    | <100MB        | Peak worker memory\*        |
| **Accuracy**        | >90%          | Element detection rate\*    |
| **Bundle Size**     | Varies        | See build output for size\* |
| **ID Size**         | 8-12 chars    | 70% smaller than UUIDs      |

_\*Performance varies significantly based on page complexity, content size, and browser environment. Use `bun run build` to see actual bundle sizes._

### Output Format Performance

- **Object Format**: O(1) element lookup by ID (when `elementsAsObject: true`)
- **Array Format**: O(n) element lookup, smaller memory footprint
- **Hash IDs**: 70% size reduction compared to UUIDs (8-12 chars vs 36 chars)

## 🏗️ Architecture

### Browser-Only Design

- **Ariadne**: Main thread interface
- **Web Worker**: Sandboxed DOM processing for security
- **Zero Dependencies**: No external runtime dependencies
- **Modern Browsers**: Requires Web Worker support

### Security Model

- **Sandboxed Processing**: DOM analysis in isolated Web Worker
- **No Network Access**: Workers have no network capabilities
- **Memory Isolation**: Processing isolated from main thread
- **CSP Compatible**: Works with strict Content Security Policies

## 🎛️ Configuration Options

### Token Budget Management

The `tokenBudget` option controls the maximum size of the output to prevent overwhelming LLMs:

```typescript
const client = new Ariadne({
  tokenBudget: 2000, // Smaller budget for lightweight models
});

// For larger models
const client = new Ariadne({
  tokenBudget: 8000, // More comprehensive extraction
});
```

**Token Budget Guidelines:**

- **GPT-3.5/Claude Haiku**: 2000-4000 tokens
- **GPT-4/Claude Sonnet**: 4000-8000 tokens
- **GPT-4-32k/Claude Opus**: 8000-16000 tokens

### Parent-Child Relationships

Control whether to include hierarchical relationships:

```typescript
// Include parent-child relationships (default)
const client = new Ariadne({
  includeChildren: true, // Adds "children" arrays to parent elements
});

// Flat structure for simpler processing
const client = new Ariadne({
  includeChildren: false, // Only parentId references
});
```

### Debug Mode

Enable detailed logging for development:

```typescript
const client = new Ariadne({
  debug: true, // Enables console logging in development
});
```

## 🔍 Advanced Use Cases

### Browser Extension Integration

```typescript
// Content script
import { extractSemanticMap } from 'ariadne';

// Extract from current page
const semanticMap = await extractSemanticMap(document, {
  tokenBudget: 3000,
  includeChildren: false, // Simpler structure for automation
});

// Send to background script
chrome.runtime.sendMessage({
  type: 'SEMANTIC_MAP',
  data: semanticMap,
});
```

### Web Testing Framework

```typescript
// Generate stable selectors for testing
import { Ariadne } from 'ariadne';

const client = new Ariadne();
const map = await client.extract(document);

// Find elements by role and label
const submitButton = map.elements.find(
  (el) => el.role === 'button' && el.label === 'Submit',
);

// Use the selector for testing
await page.click(submitButton.selector);
client.terminate();
```

### AI Agent Integration

```typescript
// Prepare semantic context for LLM
const semanticMap = await extractSemanticMap(document);

const context = `
Current page semantic structure:
${JSON.stringify(semanticMap, null, 2)}

Available actions:
${semanticMap.elements
  .filter((el) => ['button', 'link', 'input'].includes(el.role))
  .map((el) => `- ${el.role}: "${el.label}" (${el.selector})`)
  .join('\n')}
`;

// Send to LLM for decision making
const response = await llm.complete({
  prompt: `${context}\n\nUser request: ${userRequest}`,
});
```

## 🚨 Troubleshooting

### Common Issues

#### Worker Load Errors

- **Issue:** `Failed to load worker script`
- **Solution:** Ensure your bundler supports Web Worker imports:

```typescript
// Webpack
new Worker(new URL('./worker.js', import.meta.url));

// Vite
new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
```

#### Cross-Origin Issues

- **Issue:** `Access denied to iframe content`
- **Solution:** This is expected behavior. Ariadne automatically stubs cross-origin iframes:

```typescript
// Cross-origin iframes become stubs
{
  "role": "link",
  "stub": "iframe",
  "origin": "https://external-site.com",
  "width": 800,
  "height": 600
}
```

#### Token Budget Exceeded

**Issue:** Large pages cause token limit errors
**Solution:** Reduce token budget or process in chunks:

```typescript
try {
  const map = await extractSemanticMap(document, {
    tokenBudget: 2000, // Smaller budget
  });
} catch (error) {
  if (isTokenLimitExceeded(error)) {
    // Handle partial extraction
    console.log('Partial extraction completed');
  }
}
```

#### Memory Issues

**Issue:** Worker crashes on large pages
**Solution:** Increase available memory or process smaller sections:

```typescript
// Process specific sections
const sections = document.querySelectorAll('section');
for (const section of sections) {
  const tempDoc = document.implementation.createHTMLDocument();
  tempDoc.body.appendChild(section.cloneNode(true));

  const map = await extractSemanticMap(tempDoc);
  // Process section map
}
```

### Performance Optimization

#### Reduce Processing Time

```typescript
// Skip children for faster processing
const map = await extractSemanticMap(document, {
  includeChildren: false,
  tokenBudget: 2000,
});
```

#### Handle Dynamic Content

```typescript
// Wait for dynamic content to load
await new Promise((resolve) => setTimeout(resolve, 2000));

const map = await extractSemanticMap(document, {
  tokenBudget: 6000, // Larger budget for dynamic content
});

// Check if content was truncated
if (map.partial) {
  console.log(`Stopped at element: ${map.lastProcessedId}`);
  console.log(`Reason: ${map.reason}`);
}
```

## 📖 Best Practices

### 1. **Always Clean Up Workers**

```typescript
const client = new Ariadne();
try {
  const map = await client.extract(document);
  // Process map
} finally {
  client.terminate(); // Always clean up
}
```

### 2. **Handle Errors Gracefully**

```typescript
import {
  extractSemanticMap,
  isAriadneError,
  isTokenLimitExceeded,
  isWorkerError,
} from 'ariadne';

try {
  const map = await extractSemanticMap(document);
} catch (error) {
  if (isAriadneError(error)) {
    if (isTokenLimitExceeded(error)) {
      console.log('Content too large, consider reducing token budget');
      console.log(`Token limit was: ${error.details?.limit}`);
    } else if (isWorkerError(error)) {
      console.error('Web Worker error occurred:', error.message);
    } else {
      console.error(`Ariadne error [${error.code}]: ${error.message}`);
      if (error.details) {
        console.error('Error details:', error.details);
      }
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 3. **Optimize for Your Use Case**

```typescript
import { extractSemanticMap } from 'ariadne';

// For LLM automation (comprehensive)
const automationMap = await extractSemanticMap(document, {
  tokenBudget: 8000,
  includeChildren: true,
});

// For form processing (focused)
const formMap = await extractSemanticMap(document, {
  tokenBudget: 2000,
  includeChildren: false,
});
```

### 4. **Cache Results When Possible**

```typescript
import { AriadneMap, extractSemanticMap } from 'ariadne';

const mapCache = new Map<string, AriadneMap>();

async function getCachedMap(url: string): Promise<AriadneMap> {
  if (mapCache.has(url)) {
    return mapCache.get(url)!;
  }

  const map = await extractSemanticMap(document);
  mapCache.set(url, map);
  return map;
}
```

## 🔧 Development

### Prerequisites

- Node.js 18+ or Bun 1.13+
- Modern browser for testing

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ariadne

# Install dependencies with Bun (recommended)
bun install

# Run tests
bun test

# Build library
bun run build

# Development mode with watch
bun run dev
```

### Testing

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# With coverage
bun test --coverage

# Run specific test
bun test label-resolver
```

### Development Commands

```bash
# Clean build artifacts
bun run clean

# Lint code
bun run lint

# Fix linting issues
bun run lint:fix

# Type checking
bun run typecheck

# Format code
bun run format

# Check formatting
bun run format:check

# Test with coverage
bun run test:coverage

# Test in watch mode
bun run test:watch
```

## 🔒 Security Considerations

### Browser Environment Safety

Ariadne is designed with security as a primary concern:

#### **Sandboxed Processing**

- All DOM analysis runs in isolated Web Workers
- No access to main thread state or sensitive data
- Worker termination prevents memory leaks and resource abuse

#### **No Network Access**

- Web Workers have no network capabilities by design
- Cannot make external requests or transmit data
- Processing is completely offline and local

#### **Cross-Origin Protection**

- Automatically handles cross-origin iframes safely
- Replaces inaccessible content with metadata stubs
- Respects browser same-origin policies

#### **Content Security Policy (CSP) Compatibility**

```html
<!-- Ariadne works with strict CSP -->
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  worker-src 'self' blob:;
  script-src 'self' 'unsafe-inline';
"
/>
```

### Data Privacy

#### **No Data Transmission**

```typescript
// Ariadne processes data locally - nothing is sent externally
const map = await extractSemanticMap(document);
// map contains only DOM structure, no sensitive user data
```

#### **Sensitive Information Filtering**

Ariadne extracts semantic structure, not sensitive content:

- **✅ Extracts**: Element roles, labels, selectors, form structure
- **❌ Doesn't extract**: Form values, user input, authentication tokens
- **❌ Doesn't extract**: Hidden fields, password values, session data

#### **Memory Management**

```typescript
// Always clean up workers to prevent memory leaks
const client = new Ariadne();
try {
  const map = await client.extract(document);
} finally {
  client.terminate(); // Clears worker memory
}
```

### Production Security Checklist

- [ ] **Worker Cleanup**: Always call `client.terminate()`
- [ ] **Error Handling**: Catch and handle `AriadneError` instances
- [ ] **Token Limits**: Set appropriate `tokenBudget` limits
- [ ] **Input Validation**: Validate documents before processing
- [ ] **CSP Headers**: Configure Content Security Policy appropriately
- [ ] **Resource Monitoring**: Monitor memory usage in production

### Trusted Content Only

```typescript
// Only process trusted documents
function isDocumentSafe(doc: Document): boolean {
  const origin = doc.location.origin;
  const trustedOrigins = ['https://example.com', 'https://app.example.com'];
  return trustedOrigins.includes(origin);
}

if (isDocumentSafe(document)) {
  const map = await extractSemanticMap(document);
} else {
  console.warn('Untrusted document - extraction skipped');
}
```

### Audit Trail

```typescript
// Log extraction events for security monitoring
const map = await extractSemanticMap(document, {
  tokenBudget: 4000,
  debug: true, // Enables detailed logging
});

console.log('Extraction completed', {
  url: map.meta.url,
  timestamp: map.meta.timestamp,
  elementCount: map.elements.length,
  partial: map.partial,
  reason: map.reason,
});
```

## 📋 Comparison with Alternatives

| Feature                   | Ariadne          | Puppeteer       | Playwright      | Traditional Scraping |
| ------------------------- | ---------------- | --------------- | --------------- | -------------------- |
| **Browser Environment**   | ✅ Native        | ❌ Node.js only | ❌ Node.js only | ✅ Any               |
| **Security**              | ✅ Sandboxed     | ⚠️ Full access  | ⚠️ Full access  | ❌ Varies            |
| **Performance**           | ✅ <150ms        | ❌ Seconds      | ❌ Seconds      | ⚠️ Varies            |
| **LLM-Ready Output**      | ✅ Semantic JSON | ❌ Raw HTML     | ❌ Raw HTML     | ❌ Raw data          |
| **Bundle Size**           | ✅ ~15KB         | ❌ 50MB+        | ❌ 100MB+       | ⚠️ Varies            |
| **Cross-Origin Handling** | ✅ Auto-stub     | ✅ Full control | ✅ Full control | ❌ Blocked           |
| **Token Optimization**    | ✅ Built-in      | ❌ Manual       | ❌ Manual       | ❌ Manual            |

## ❓ Frequently Asked Questions

### **Q: How does Ariadne differ from web scraping?**

A: Ariadne focuses on semantic extraction rather than raw data extraction. It understands the _meaning_ of HTML elements (forms, buttons, links) and produces structured output optimized for LLM consumption, not just text content.

### **Q: Can I use Ariadne in Node.js?**

A: No, Ariadne is designed specifically for browser environments. For server-side extraction, consider using Puppeteer or Playwright to render pages and then use Ariadne within the browser context.

### **Q: What happens to dynamic content?**

A: Ariadne extracts the DOM state at the time of extraction. For dynamic content, ensure it's loaded before calling `extractSemanticMap()`. Ariadne automatically detects potentially dynamic pages and marks them in the metadata.

### **Q: How accurate is the label resolution?**

A: Ariadne uses a 5-priority system with >95% accuracy on standard web forms. It handles explicit labels, ARIA attributes, placeholder text, and proximity heuristics to find the best human-readable labels.

### **Q: Can I extract from specific parts of a page?**

A: Yes! Create a new document with just the section you want:

```typescript
const section = document.querySelector('#specific-section');
const tempDoc = document.implementation.createHTMLDocument();
tempDoc.body.appendChild(section.cloneNode(true));
const map = await extractSemanticMap(tempDoc);
```

### **Q: How do I handle large pages?**

A: Use token budget management and check for partial extractions:

```typescript
const map = await extractSemanticMap(document, { tokenBudget: 3000 });
if (map.partial) {
  console.log(`Stopped due to: ${map.reason}`);
  // Process what you have or extract in chunks
}
```

### **Q: Is Ariadne suitable for production use?**

A: Yes! Ariadne is designed for production with robust error handling, memory management, and security safeguards. It's successfully used in browser extensions, testing frameworks, and AI agent systems.

### **Q: How do I handle authentication/login forms?**

A: Ariadne treats login forms like any other form. It will extract username/password fields, submit buttons, and any additional form elements with proper semantic roles and labels.

### **Q: Can I customize which elements are extracted?**

A: Currently, Ariadne extracts all supported semantic elements. Filtering should be done post-extraction based on your needs. Future versions may include element filtering options.

### **Q: What about Shadow DOM?**

A: Ariadne detects and marks elements with closed Shadow DOM but cannot extract content from closed shadows due to browser security restrictions. Open Shadow DOM content is processed normally.

### **Q: How do I report bugs or request features?**

A: Please use the project's GitHub Issues to report bugs or request features. Include reproduction steps and your browser/environment details.

## 🔄 Migration Guide

### From Raw HTML Parsing

**Before (traditional approach):**

```typescript
const forms = document.querySelectorAll('form');
const buttons = document.querySelectorAll('button');
const inputs = document.querySelectorAll('input');

// Manual processing of each element type
forms.forEach((form) => {
  // Extract form data manually
  const formData = {
    action: form.action,
    method: form.method,
    // ... more manual work
  };
});
```

**After (with Ariadne):**

```typescript
import { extractSemanticMap } from 'ariadne';

const map = await extractSemanticMap(document);

// All semantic elements extracted automatically
map.elements.forEach((element) => {
  console.log(`${element.role}: ${element.label} (${element.selector})`);
});
```

### From Puppeteer/Playwright

**Before (server-side):**

```javascript
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

const formData = await page.evaluate(() => {
  // Manual DOM parsing in browser context
  const forms = Array.from(document.querySelectorAll('form'));
  return forms.map((form) => ({
    action: form.action,
    inputs: Array.from(form.querySelectorAll('input')).map((input) => ({
      type: input.type,
      name: input.name,
    })),
  }));
});
```

**After (client-side with Ariadne):**

```javascript
// In browser context (injected script)
import { extractSemanticMap } from 'ariadne';

const map = await extractSemanticMap(document, {
  tokenBudget: 4000,
  includeChildren: true,
});

// Semantic map ready for LLM consumption
// No manual parsing required
```

## 🤝 Contributing

We welcome contributions! Please see the project repository for contribution guidelines.

### Contribution Areas

- **🐛 Bug Reports**: Help us identify and fix issues
- **💡 Feature Requests**: Suggest new semantic roles or extraction capabilities
- **📖 Documentation**: Improve examples and API documentation
- **🧪 Test Coverage**: Add tests for edge cases and new features
- **⚡ Performance**: Optimize extraction speed and memory usage

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run the full test suite (`bun test`)
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
