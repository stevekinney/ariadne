/**
 * Test setup for unit tests that need DOM APIs
 * This file configures happy-dom to provide browser APIs in Node.js environment
 */

import { Window } from 'happy-dom';

// Create a happy-dom window instance
const window = new Window({
  url: 'http://localhost',
  width: 1024,
  height: 768,
});

// Make DOM APIs available globally
global.window = window as any;
global.document = window.document as unknown as Document;

// Ensure document has proper location
if (!window.document.location) {
  Object.defineProperty(window.document, 'location', {
    value: window.location,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
global.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;
global.Element = window.Element as unknown as typeof Element;
global.Document = window.Document as unknown as typeof Document;
global.Node = window.Node as unknown as typeof Node;
global.navigator = window.navigator as unknown as Navigator;
global.location = window.location as unknown as Location;

// Mock Worker for tests (since happy-dom doesn't include Worker)
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;
  private listeners = new Map<string, ((event: Event) => void)[]>();

  constructor(public url: string) {}

  addEventListener(type: string, listener: (event: Event) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event) {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }

    // Also trigger onmessage if it's a message event
    if (event.type === 'message' && this.onmessage) {
      this.onmessage(event as MessageEvent);
    }

    return true;
  }

  postMessage(data: Record<string, unknown>) {
    // Simulate worker response
    setTimeout(() => {
      // Extract configuration from the request data if available
      const config = (data['config'] || {}) as Record<string, unknown>;

      // Create mock elements for testing
      const mockElements = [
        {
          id: 'test1',
          role: 'input',
          selector: 'input[name="username"]',
          parentId: 'form1',
          label: 'Username',
        },
        {
          id: 'test2',
          role: 'button',
          selector: 'button[type="submit"]',
          parentId: 'form1',
          label: 'Submit',
        },
      ];

      // Build response based on configuration
      const responseData: Record<string, unknown> = {
        schemaVersion: '1.0.0',
        meta: {
          url: 'http://localhost',
          timestamp: Date.now(),
          dynamicContent: false,
        },
        partial: false,
      };

      // Handle output format options
      if (
        config['elementsAsObject'] === true ||
        (config['elementsAsObject'] !== false && !config['compact'])
      ) {
        // Use object format
        responseData['elementsById'] = {};
        mockElements.forEach((element) => {
          (responseData['elementsById'] as Record<string, unknown>)[element.id] =
            element;
        });
      } else {
        // Use array format
        responseData['elements'] = mockElements;
      }

      // Add element IDs array if requested
      if (
        config['includeElementIds'] === true ||
        (config['includeElementIds'] !== false && !config['compact'])
      ) {
        responseData['elementIds'] = mockElements.map((e) => e.id);
      }

      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'success',
          data: responseData,
        },
      });

      this.dispatchEvent(messageEvent);
    }, 0);
  }

  terminate() {
    // Mock cleanup
  }
}

global.Worker = MockWorker as unknown as typeof Worker;

// Mock URL for worker creation
global.URL = class MockURL {
  constructor(
    public url: string,
    public base?: string,
  ) {
    this.href = this.url;
  }

  href: string;
  protocol = 'file:';
  host = '';
  hostname = '';
  port = '';
  pathname = '';
  search = '';
  hash = '';

  toString() {
    return this.href;
  }

  static createObjectURL(_blob: Blob) {
    return 'blob:mock-url';
  }

  static revokeObjectURL(_url: string) {}
} as unknown as typeof URL;

// Mock Blob for worker script creation
global.Blob = window.Blob as unknown as typeof Blob;

// Mock performance API
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByName: () => [],
  getEntriesByType: () => [],
  clearMarks: () => {},
  clearMeasures: () => {},
} as unknown as Performance;

// Mock AbortController
class MockAbortSignal {
  aborted = false;
  reason?: unknown;
  private listeners = new Map<string, ((event: Event) => void)[]>();

  addEventListener(type: string, listener: (event: Event) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event) {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  }
}

class MockAbortController {
  signal = new MockAbortSignal();

  abort(reason?: unknown) {
    this.signal.aborted = true;
    this.signal.reason = reason;
    this.signal.dispatchEvent(new Event('abort'));
  }
}

global.AbortController =
  MockAbortController as unknown as typeof AbortController;

export { window };
