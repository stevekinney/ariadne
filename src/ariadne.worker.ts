/**
 * AriadneWorker - Web Worker Entry Point
 * Sandboxed environment for safe DOM processing with improved memory management
 */

import type {
  AriadneConfiguration,
  AriadneMap,
  AriadneWorkerRequest,
  AriadneWorkerResponse,
} from './types/ariadne.js';
import { DomProcessor } from './worker/dom-processor.js';

// Track active processors for cleanup
let activeProcessors: DomProcessor[] = [];

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent) => {
  const messageData = event.data;

  // Handle cleanup messages
  if (messageData?.type === 'cleanup') {
    performCleanup();
    return;
  }

  const { html, metadata, config } = messageData as AriadneWorkerRequest & {
    config: AriadneConfiguration;
  };

  let processor: DomProcessor | null = null;

  try {
    // Validate input data
    if (!html || typeof html !== 'string') {
      throw new Error('Invalid HTML data provided');
    }

    if (!metadata || !metadata.url || !metadata.timestamp) {
      throw new Error('Invalid metadata provided');
    }

    // Parse HTML safely in the worker context with error handling
    let doc: Document;
    try {
      if (typeof DOMParser === 'undefined') {
        throw new Error('DOMParser not available in Web Worker');
      }
      const parser = new DOMParser();
      doc = parser.parseFromString(html, 'text/html');

      // Check for parser errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Failed to parse HTML: ' + parserError.textContent);
      }
    } catch {
      // DOMParser not available in this Web Worker environment
      // Signal to main thread that fallback is needed
      const response: AriadneWorkerResponse = {
        type: 'error',
        error: 'DOMPARSER_UNAVAILABLE',
        code: 'DOMPARSER_UNAVAILABLE',
      };
      self.postMessage(response);
      return;
    }

    // Create processor and track it for cleanup
    processor = new DomProcessor(doc, metadata, config);
    activeProcessors.push(processor);

    const ariadneMap: AriadneMap = processor.generateMap();

    // Remove from active processors on completion
    const index = activeProcessors.indexOf(processor);
    if (index > -1) {
      activeProcessors.splice(index, 1);
    }

    // Send success response
    const response: AriadneWorkerResponse = {
      type: 'success',
      data: ariadneMap,
    };

    self.postMessage(response);
  } catch (error) {
    // Clean up processor on error
    if (processor) {
      const index = activeProcessors.indexOf(processor);
      if (index > -1) {
        activeProcessors.splice(index, 1);
      }
    }

    // Send error response with more context
    const response: AriadneWorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown processing error',
    };

    self.postMessage(response);
  }
};

/**
 * Perform thorough cleanup of worker resources
 */
function performCleanup(): void {
  try {
    // Clean up all active processors
    activeProcessors.forEach((processor) => {
      try {
        if (typeof processor.cleanup === 'function') {
          processor.cleanup();
        }
      } catch {
        // Ignore individual cleanup errors
      }
    });
    activeProcessors = [];

    // Force garbage collection hint
    if (typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Handle any uncaught errors in the worker
self.onerror = (error) => {
  const response: AriadneWorkerResponse = {
    type: 'error',
    error: 'Worker crashed: ' + error.toString(),
  };

  self.postMessage(response);
};
