/**
 * Ariadne - Main Thread Interface
 * Manages the extraction process and communication with the Web Worker
 */

import { AriadneError } from './errors/ariadne-errors.js';
import {
  AriadneConfigurationSchema,
  DocumentSchema,
  type AriadneConfiguration,
  type AriadneMap,
  type AriadneWorkerRequest,
  type AriadneWorkerResponse,
} from './types/ariadne.js';
import { generateSimpleSelector } from './utilities/selector-utils.js';
import { HashIdGenerator } from './worker/hash-id-generator.js';

/**
 * Main Ariadne client for semantic HTML extraction.
 *
 * The Ariadne class provides a robust interface for extracting semantic information
 * from DOM documents using Web Workers. It manages the worker lifecycle, handles
 * configuration validation, implements memory management, and provides error handling.
 *
 * @example
 * ```javascript
 * // Create client with default configuration
 * const ariadne = new Ariadne();
 *
 * // Create client with custom configuration
 * const ariadne = new Ariadne({
 *   tokenBudget: 8000,
 *   includeChildren: false,
 *   debug: true
 * });
 *
 * // Extract semantic information
 * const map = await ariadne.extract(document);
 *
 * // Clean up when done
 * ariadne.terminate();
 * ```
 */
export class Ariadne {
  private worker: Worker | null = null;
  private config: AriadneConfiguration;
  private abortController: AbortController | null = null;
  private cleanupTasks: (() => void)[] = [];
  private idGenerator: HashIdGenerator | null = null;

  /**
   * Create a new Ariadne client instance.
   *
   * @param config - Configuration object for extraction parameters.
   *   - tokenBudget: Maximum number of tokens to use (default: 4000)
   *   - includeChildren: Whether to include children arrays in elements (default: true)
   *   - debug: Enable debug mode for additional logging (default: false)
   *
   * @throws {AriadneError} When configuration validation fails
   *
   * @example
   * ```javascript
   * // Default configuration
   * const client = new Ariadne();
   *
   * // Custom configuration
   * const client = new Ariadne({
   *   tokenBudget: 10000,
   *   includeChildren: false
   * });
   * ```
   */
  constructor(config: AriadneConfiguration = {}) {
    try {
      this.config = AriadneConfigurationSchema.parse(config) as Required<
        Pick<AriadneConfiguration, 'tokenBudget' | 'includeChildren' | 'debug' | 'markElements' | 'elementAttribute' | 'compact' | 'elementsAsObject' | 'includeElementIds'>
      > & Pick<AriadneConfiguration, 'onElementProcess'>;
    } catch (error) {
      throw AriadneError.invalidDocument({
        message: 'Invalid configuration provided',
        validationError:
          error instanceof Error ? error.message : 'Unknown validation error',
      });
    }
  }

  /**
   * Extract semantic information from a DOM document.
   *
   * Processes the provided document through a Web Worker to extract semantic
   * elements like forms, inputs, buttons, links, and headings. The extraction
   * respects the configured token budget and includes metadata about the page.
   *
   * @param doc - The DOM document to process. Must be a valid Document object
   *   with documentElement, location, and body properties.
   *
   * @returns Promise that resolves to an AriadneMap containing:
   *   - schemaVersion: The version of the extraction schema used
   *   - meta: Metadata about the document (URL, timestamp, dynamic content detection)
   *   - elements: Array of extracted semantic elements
   *   - partial: Boolean indicating if extraction was truncated due to token limits
   *   - reason: Optional reason for truncation (e.g., 'token_limit_exceeded')
   *   - lastProcessedId: ID of the last element processed before truncation
   *
   * @throws {AriadneError} When:
   *   - Document validation fails (invalid or missing required properties)
   *   - Worker initialization fails
   *   - Processing times out (30 second timeout)
   *   - Web Worker encounters an error
   *
   * @example
   * ```javascript
   * const client = new Ariadne({ tokenBudget: 5000 });
   *
   * try {
   *   const map = await client.extract(document);
   *
   *   console.log(`Extracted ${map.elements.length} elements`);
   *   console.log(`Partial result: ${map.partial}`);
   *
   *   // Process form elements
   *   const forms = map.elements.filter(el => el.role === 'form');
   *   forms.forEach(form => {
   *     console.log(`Form: ${form.label || 'Unlabeled'}`);
   *   });
   *
   * } catch (error) {
   *   if (isAriadneError(error)) {
   *     console.error(`Ariadne error: ${error.code} - ${error.message}`);
   *   } else {
   *     console.error('Unexpected error:', error);
   *   }
   * }
   * ```
   */
  public async extract(doc: Document): Promise<AriadneMap> {
    // Validate document
    try {
      DocumentSchema.parse(doc);
    } catch (error) {
      throw AriadneError.invalidDocument({
        message: 'Invalid document provided',
        validationError:
          error instanceof Error ? error.message : 'Unknown validation error',
      });
    }

    // Create abort controller for this extraction
    this.abortController = new AbortController();

    try {
      // Initialize worker if not already created
      if (!this.worker) {
        this.worker = new Worker(new URL('./ariadne.worker.js', import.meta.url), {
          type: 'module',
        });

        // Add cleanup task for worker
        this.cleanupTasks.push(() => {
          if (this.worker) {
            this.worker.terminate();
            this.worker = null;
          }
        });
      }

      // Initialize ID generator if needed for callbacks
      if (this.config.onElementProcess || this.config.markElements) {
        this.idGenerator = new HashIdGenerator();
      }

      // Prepare HTML with iframe stubbing
      const { html } = this.prepareHTML(doc);

      // Create metadata
      const metadata = {
        url: doc.location.href,
        timestamp: Date.now(),
        isPotentiallyDynamic: this.detectDynamicContent(doc),
      };

      // Send to worker and await response
      return await this.sendToWorker({ html, metadata });
    } catch (error) {
      // Clean up on error
      this.cleanup();
      throw error;
    } finally {
      // Clean up abort controller
      this.abortController = null;
    }
  }

  /**
   * Prepare HTML by serializing DOM and replacing cross-origin iframes
   */
  private prepareHTML(doc: Document): { html: string; iframeStubs: Array<unknown> } {
    const iframeStubs: Array<unknown> = [];

    // Create mapping for callbacks if needed
    const originalToClone = (this.config.onElementProcess || this.config.markElements) 
      ? new Map<Element, Element>() 
      : undefined;

    // Use selective cloning to improve performance
    const clone = this.selectiveClone(doc.documentElement, originalToClone);

    // Find all iframes
    const iframes = clone.querySelectorAll('iframe');

    iframes.forEach((iframe, _index) => {
      try {
        // Try to access the iframe's content document
        // This will throw for cross-origin iframes
        void iframe.contentDocument;

        // If we can access it, it's same-origin, leave it alone
        return;
      } catch {
        // Cross-origin iframe - replace with stub
        const stub = doc.createElement('ariadne-iframe-stub');

        // Preserve important attributes
        stub.setAttribute(
          'data-origin',
          iframe.src ? new URL(iframe.src).origin : 'unknown',
        );
        stub.setAttribute('data-selector', generateSimpleSelector(iframe));
        stub.setAttribute('data-width', String(iframe.width || iframe.offsetWidth || 0));
        stub.setAttribute(
          'data-height',
          String(iframe.height || iframe.offsetHeight || 0),
        );
        stub.setAttribute('data-src', iframe.src || '');

        // Store stub info
        iframeStubs.push({
          origin: stub.getAttribute('data-origin'),
          selector: stub.getAttribute('data-selector'),
          width: parseInt(stub.getAttribute('data-width') || '0'),
          height: parseInt(stub.getAttribute('data-height') || '0'),
        });

        // Replace iframe with stub
        iframe.parentNode?.replaceChild(stub, iframe);
      }
    });

    // Process elements if callbacks are enabled
    if (originalToClone && this.idGenerator) {
      this.processElementsWithCallbacks(originalToClone);
    }

    // Serialize the modified DOM
    const html = clone.outerHTML;

    return { html, iframeStubs };
  }

  /**
   * Selective cloning - only clone elements that are likely to be semantically relevant
   */
  private selectiveClone(element: Element, originalToClone?: Map<Element, Element>): HTMLElement {
    const clone = element.cloneNode(false) as HTMLElement;
    
    // Track mapping for callbacks
    if (originalToClone) {
      originalToClone.set(element, clone);
    }

    // Define elements that are semantically relevant
    const relevantElements = new Set([
      'FORM',
      'INPUT',
      'BUTTON',
      'SELECT',
      'TEXTAREA',
      'LABEL',
      'A',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'P',
      'TABLE',
      'THEAD',
      'TBODY',
      'TR',
      'TH',
      'TD',
      'DIV',
      'SECTION',
      'ARTICLE',
      'NAV',
      'MAIN',
      'ASIDE',
      'HEADER',
      'FOOTER',
    ]);

    // Define elements to skip entirely
    const skipElements = new Set([
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
      'META',
      'LINK',
      'TITLE',
    ]);

    for (const child of element.children) {
      const tagName = child.tagName;

      if (skipElements.has(tagName)) {
        continue; // Skip non-semantic elements
      }

      if (relevantElements.has(tagName) || child.children.length > 0) {
        // Clone relevant elements or containers with children
        const childClone = this.selectiveClone(child, originalToClone);
        clone.appendChild(childClone);
      } else {
        // For other elements, only include if they have text content
        const textContent = child.textContent?.trim();
        if (textContent && textContent.length > 0) {
          const childClone = child.cloneNode(true);
          clone.appendChild(childClone);
          if (originalToClone) {
            originalToClone.set(child, childClone as Element);
          }
        }
      }
    }

    return clone;
  }

  /**
   * Process elements with callbacks and/or marking
   */
  private processElementsWithCallbacks(originalToClone: Map<Element, Element>): void {
    // Process each mapped element
    for (const [original, clone] of originalToClone) {
      // Skip non-semantic elements
      const tagName = original.tagName;
      const skipElements = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'TITLE']);
      if (skipElements.has(tagName)) continue;

      // Check if this element would be extracted
      const role = this.getElementRole(original);
      if (!role) continue;

      // Generate ID for this element
      const id = this.idGenerator!.generateId(original);

      // Call user callback if provided
      if (this.config.onElementProcess) {
        try {
          this.config.onElementProcess(original, id);
        } catch (error) {
          if (this.config.debug) {
            console.warn('Error in onElementProcess callback:', error);
          }
        }
      }

      // Mark element with data attribute if requested
      if (this.config.markElements) {
        const attributeName = this.config.elementAttribute || 'data-ariadne-id';
        original.setAttribute(attributeName, id);
        (clone as Element).setAttribute(attributeName, id);
      }
    }
  }

  /**
   * Get the semantic role for an element (simplified version for main thread)
   */
  private getElementRole(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();

    // Form elements
    if (tagName === 'form') return 'form';
    if (tagName === 'label') return 'label';
    if (tagName === 'select') return 'select';
    if (tagName === 'textarea') return 'textarea';

    // Input elements with type differentiation
    if (tagName === 'input') {
      const type = element.getAttribute('type') || 'text';
      switch (type) {
        case 'checkbox': return 'checkbox';
        case 'radio': return 'radio';
        case 'password': return 'password';
        case 'email': return 'email';
        case 'tel': return 'tel';
        case 'number': return 'number';
        case 'search': return 'search';
        case 'url': return 'url';
        case 'date': return 'date';
        case 'time': return 'time';
        case 'datetime-local': return 'datetime-local';
        case 'month': return 'month';
        case 'week': return 'week';
        case 'color': return 'color';
        case 'file': return 'file';
        case 'range': return 'range';
        case 'submit':
        case 'button': return 'button';
        default: return 'input';
      }
    }

    // Button elements
    if (tagName === 'button') return 'button';

    // Link elements
    if (tagName === 'a' && element.hasAttribute('href')) return 'link';

    // Heading elements
    if (/^h[1-6]$/.test(tagName)) return 'heading';

    // Paragraph elements
    if (tagName === 'p') return 'paragraph';

    // Table elements
    if (tagName === 'table') return 'table';
    if (tagName === 'thead') return 'table_head';
    if (tagName === 'tbody') return 'table_body';
    if (tagName === 'tr') return 'table_row';
    if (tagName === 'th') return 'table_header';
    if (tagName === 'td') return 'table_cell';

    return null;
  }

  /**
   * Detect if the page likely has dynamic content
   */
  private detectDynamicContent(doc: Document): boolean {
    // Check if page height is significantly larger than viewport
    // Use a reasonable viewport height if window is not available
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1024;
    const hasScroll = doc.body && doc.body.scrollHeight > viewportHeight * 2;

    // Check for common infinite scroll indicators
    const hasInfiniteScrollIndicators =
      doc.querySelector('[data-infinite-scroll]') !== null ||
      doc.querySelector('.infinite-scroll') !== null ||
      doc.querySelector('[data-paginate]') !== null;

    // Check for lazy loading attributes
    const hasLazyLoad = doc.querySelectorAll('[loading="lazy"]').length > 0;

    return hasScroll || hasInfiniteScrollIndicators || hasLazyLoad;
  }

  /**
   * Send request to worker and await response with timeout and memory management
   */
  private sendToWorker(request: AriadneWorkerRequest): Promise<AriadneMap> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(AriadneError.workerError('Worker not initialized'));
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let abortHandler: (() => void) | null = null;
      let isResolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        // More thorough event listener cleanup
        if (this.worker) {
          this.worker.removeEventListener('message', messageHandler);
          this.worker.removeEventListener('error', errorHandler);
          this.worker.removeEventListener('messageerror', messageErrorHandler);
        }

        // Clean up abort signal handler
        if (abortHandler && this.abortController) {
          this.abortController.signal.removeEventListener('abort', abortHandler);
          abortHandler = null;
        }
      };

      const messageHandler = (event: MessageEvent<AriadneWorkerResponse>) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();

        if (event.data?.type === 'success' && event.data.data) {
          resolve(event.data.data);
        } else {
          reject(AriadneError.workerError(event.data?.error || 'Unknown worker error'));
        }
      };

      const errorHandler = (error: ErrorEvent) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(
          AriadneError.workerError(`Worker error: ${error.message || 'Unknown error'}`),
        );
      };

      // Handle message parsing errors
      const messageErrorHandler = (_error: MessageEvent) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(AriadneError.workerError('Failed to parse worker message'));
      };

      // Set up abort signal handling with proper cleanup
      if (this.abortController) {
        abortHandler = () => {
          if (isResolved) return;
          isResolved = true;
          cleanup();
          reject(AriadneError.processingTimeout(30000, { reason: 'aborted' }));
        };
        this.abortController.signal.addEventListener('abort', abortHandler);
      }

      // Set timeout (30 seconds) with better error context
      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        reject(
          AriadneError.processingTimeout(30000, {
            url: request.metadata.url,
            timestamp: request.metadata.timestamp,
          }),
        );
      }, 30000);

      // Set up listeners with proper error handling
      try {
        this.worker.addEventListener('message', messageHandler);
        this.worker.addEventListener('error', errorHandler);
        this.worker.addEventListener('messageerror', messageErrorHandler);

        // Send the request with error handling
        this.worker.postMessage({
          ...request,
          config: this.config,
        });
      } catch (error) {
        isResolved = true;
        cleanup();
        reject(
          AriadneError.workerError(
            `Failed to send message to worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    });
  }

  /**
   * Clean up resources with improved error handling and memory management
   */
  private cleanup(): void {
    // Abort any ongoing operations with proper error handling
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        // AbortController.abort() can throw in some edge cases
      }
      this.abortController = null;
    }

    // Run all cleanup tasks with individual error handling
    this.cleanupTasks.forEach((task, index) => {
      try {
        task();
      } catch (error) {
        // Log cleanup errors in debug mode but don't throw
        if (this.config.debug) {
          console.warn(`Cleanup task ${index} failed:`, error);
        }
      }
    });
    this.cleanupTasks = [];

    // Clean up ID generator if used
    if (this.idGenerator) {
      this.idGenerator.clearCache();
      this.idGenerator = null;
    }

    // Force garbage collection hints for better memory management
    if (this.worker) {
      // Give worker time to clean up before termination
      try {
        this.worker.postMessage({ type: 'cleanup' });
      } catch {
        // Worker might already be terminated
      }
    }
  }

  /**
   * Terminate the worker and clean up all resources.
   *
   * Shuts down the Web Worker, cancels any ongoing operations, and releases
   * all allocated resources. This method should be called when the client
   * is no longer needed to prevent memory leaks.
   *
   * After calling terminate(), the client cannot be used for further extractions.
   * Create a new instance if you need to perform additional extractions.
   *
   * @example
   * ```javascript
   * const client = new Ariadne();
   * const map = await client.extract(document);
   *
   * // Clean up when done
   * client.terminate();
   *
   * // client can no longer be used after terminate()
   * ```
   */
  public terminate(): void {
    this.cleanup();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Abort the current extraction operation.
   *
   * Cancels any in-progress extraction without terminating the worker.
   * The client can still be used for subsequent extractions after aborting.
   * The aborted extraction will reject with an AriadneError.
   *
   * This is useful when you need to cancel a long-running extraction,
   * for example when a user navigates away from a page.
   *
   * @example
   * ```javascript
   * const client = new Ariadne();
   *
   * // Start extraction
   * const extractionPromise = client.extract(document);
   *
   * // Cancel if needed (e.g., user action)
   * setTimeout(() => {
   *   client.abort();
   * }, 5000);
   *
   * try {
   *   const map = await extractionPromise;
   * } catch (error) {
   *   if (isAriadneError(error) && error.code === 'PROCESSING_TIMEOUT') {
   *     console.log('Extraction was aborted');
   *   }
   * }
   * ```
   */
  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
