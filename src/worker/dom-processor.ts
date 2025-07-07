/**
 * DomProcessor - Core orchestration logic within the worker
 * Traverses the DOM and coordinates extraction components
 */

import type {
  ThreadlineConfiguration,
  ThreadlineElement,
  ThreadlineMap,
  ThreadlineRole,
} from '../types/threadline.js';
import { HashIdGenerator } from './hash-id-generator.js';
import { LabelResolver } from './label-resolver.js';
import { ThreadlineSelectorGenerator } from './selector-generator.js';
import { TokenBudgetManager } from './token-budget.js';

export class DomProcessor {
  private doc: Document;
  private metadata: { url: string; timestamp: number; isPotentiallyDynamic?: boolean };
  private config: ThreadlineConfiguration;
  private idGenerator: HashIdGenerator;
  private labelResolver: LabelResolver;
  private selectorGenerator: ThreadlineSelectorGenerator;
  private tokenBudget: TokenBudgetManager;
  private nodeToId: Map<Node, string> = new Map();
  private elements: ThreadlineElement[] = [];

  constructor(
    doc: Document,
    metadata: { url: string; timestamp: number; isPotentiallyDynamic?: boolean },
    config: ThreadlineConfiguration = {},
  ) {
    this.doc = doc;
    this.metadata = metadata;
    this.config = {
      tokenBudget: 4000,
      includeChildren: true,
      debug: false,
      ...config,
    };

    // Initialize components
    this.idGenerator = new HashIdGenerator();
    this.labelResolver = new LabelResolver(doc);
    this.selectorGenerator = new ThreadlineSelectorGenerator();
    this.tokenBudget = new TokenBudgetManager(this.config.tokenBudget!);
  }

  /**
   * Generate the semantic map
   */
  generateMap(): ThreadlineMap {
    try {
      // Process the DOM
      this.processDocument();

      // Build the final map with appropriate format
      const map: ThreadlineMap = {
        schemaVersion: '1.0',
        meta: {
          url: this.metadata.url,
          timestamp: this.metadata.timestamp,
          ...(this.metadata.isPotentiallyDynamic && { dynamicContent: true }),
        },
        partial: this.tokenBudget.isExceeded(),
        ...(this.tokenBudget.isExceeded() && {
          reason: 'token_limit_exceeded' as const,
          lastProcessedId: this.elements[this.elements.length - 1]?.id || undefined,
        }),
      };

      // Apply output format based on configuration
      if (this.config.elementsAsObject) {
        // Convert array to object keyed by ID
        const elementsById: Record<string, ThreadlineElement> = {};
        for (const element of this.elements) {
          elementsById[element.id] = element;
        }
        map.elementsById = elementsById;
      } else {
        // Use traditional array format
        map.elements = this.elements;
      }

      // Include element IDs array if requested
      if (this.config.includeElementIds) {
        map.elementIds = this.elements.map(el => el.id);
      }

      // Clean up caches to free memory
      this.internalCleanup();

      return map;
    } catch {
      // Clean up even on error
      this.internalCleanup();

      // Return error state
      const errorMap: ThreadlineMap = {
        schemaVersion: '1.0',
        meta: {
          url: this.metadata.url,
          timestamp: this.metadata.timestamp,
        },
        partial: true,
        reason: 'processing_error',
      };

      // Apply consistent format even for errors
      if (this.config.elementsAsObject) {
        errorMap.elementsById = {};
      } else {
        errorMap.elements = [];
      }

      return errorMap;
    }
  }

  /**
   * Clean up caches and references to free memory
   */
  cleanup(): void {
    // Clear all caches and references
    this.selectorGenerator.clearCache();
    this.idGenerator.clearCache();
    this.nodeToId.clear();
    this.elements = [];

    // Clear references to DOM objects to prevent memory leaks
    this.doc = null as unknown as Document;
    this.labelResolver = null as unknown as LabelResolver;
    this.selectorGenerator = null as unknown as ThreadlineSelectorGenerator;
    this.tokenBudget = null as unknown as TokenBudgetManager;
    this.idGenerator = null as unknown as HashIdGenerator;
  }

  /**
   * Private cleanup method for internal use
   */
  private internalCleanup(): void {
    this.selectorGenerator.clearCache();
    this.idGenerator.clearCache();
    this.nodeToId.clear();
    this.elements = [];
  }

  /**
   * Process the document using optimized lazy traversal
   */
  private processDocument(): void {
    // Use optimized processing based on configuration
    if (this.config.tokenBudget && this.config.tokenBudget > 10000) {
      this.processDocumentLazy();
    } else {
      this.processDocumentStandard();
    }

    // Post-process to add children arrays if enabled
    if (this.config.includeChildren) {
      this.buildChildrenArrays();
    }
  }

  /**
   * Standard processing for smaller documents
   */
  private processDocumentStandard(): void {
    const walker = this.doc.createTreeWalker(
      this.doc.body,
      1, // NodeFilter.SHOW_ELEMENT = 1
      {
        acceptNode: (node: Node) => {
          if (node.nodeType !== 1) return 3; // ELEMENT_NODE = 1, FILTER_SKIP = 3
          const role = this.getElementRole(node as Element);
          return role ? 1 : 3; // FILTER_ACCEPT = 1, FILTER_SKIP = 3
        },
      },
    );

    let currentNode = walker.nextNode();
    while (currentNode && !this.tokenBudget.isExceeded()) {
      if (currentNode.nodeType === 1) {
        this.processElement(currentNode as Element);
      }
      currentNode = walker.nextNode();
    }
  }

  /**
   * Lazy processing for larger documents - process in batches
   */
  private processDocumentLazy(): void {
    const batchSize = 50; // Process 50 elements at a time
    let processed = 0;

    const walker = this.doc.createTreeWalker(this.doc.body, 1, {
      acceptNode: (node: Node) => {
        if (node.nodeType !== 1) return 3;
        const role = this.getElementRole(node as Element);
        return role ? 1 : 3;
      },
    });

    const processBatch = (): boolean => {
      let batchCount = 0;
      let currentNode = walker.nextNode();

      while (currentNode && batchCount < batchSize && !this.tokenBudget.isExceeded()) {
        if (currentNode.nodeType === 1) {
          this.processElement(currentNode as Element);
          batchCount++;
          processed++;
        }
        currentNode = walker.nextNode();
      }

      return currentNode !== null && !this.tokenBudget.isExceeded();
    };

    // Process in batches
    while (processBatch()) {
      // Allow for micro-task breaks between batches for better performance
      if (processed % (batchSize * 4) === 0) {
        // Every 4 batches, yield control briefly
        continue;
      }
    }
  }

  /**
   * Process an individual element
   */
  private processElement(element: Element): void {
    // Generate ID
    const id = this.idGenerator.generateId(element);
    this.nodeToId.set(element, id);

    // Get role
    const role = this.getElementRole(element)!;

    // Find parent ID
    let parentId: string | null = null;
    let parent = element.parentNode;
    while (parent && parent.nodeType === 1 && !parentId) {
      // ELEMENT_NODE = 1
      if (this.nodeToId.has(parent)) {
        parentId = this.nodeToId.get(parent)!;
      }
      parent = parent.parentNode;
    }

    // Create element object
    const ariadneElement: ThreadlineElement = {
      id,
      role,
      selector: this.selectorGenerator.generate(element),
      parentId,
    };

    // Add label if applicable
    const label = this.labelResolver.resolve(element);
    if (label) {
      ariadneElement.label = label;
    }

    // Add state for interactive elements
    if (this.isInteractiveElement(element)) {
      const elementState = this.getElementState(element);
      if (elementState !== undefined) {
        ariadneElement.state = elementState;
      }
    }

    // Add href for links
    if (element.tagName === 'A' && element.hasAttribute('href')) {
      ariadneElement.href = element.getAttribute('href')!;
    }

    // Check for shadow DOM
    if (
      'shadowRoot' in element &&
      element.shadowRoot &&
      'mode' in element.shadowRoot &&
      element.shadowRoot.mode === 'closed'
    ) {
      ariadneElement.shadowClosed = true;
    }

    // Check for iframe stub
    if (element.tagName === 'ARIADNE-IFRAME-STUB') {
      ariadneElement.stub = 'iframe';
      const origin = element.getAttribute('data-origin');
      if (origin) {
        ariadneElement.origin = origin;
      }
      const width = element.getAttribute('data-width');
      const height = element.getAttribute('data-height');
      if (width) ariadneElement.width = parseInt(width);
      if (height) ariadneElement.height = parseInt(height);
    }

    // Add to elements array
    this.elements.push(ariadneElement);

    // Update token budget
    this.tokenBudget.addElement(ariadneElement);
  }

  /**
   * Get the semantic role for an element
   */
  private getElementRole(element: Element): ThreadlineRole | null {
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
        case 'checkbox':
          return 'checkbox';
        case 'radio':
          return 'radio';
        case 'password':
          return 'password';
        case 'email':
          return 'email';
        case 'tel':
          return 'tel';
        case 'number':
          return 'number';
        case 'search':
          return 'search';
        case 'url':
          return 'url';
        case 'date':
          return 'date';
        case 'time':
          return 'time';
        case 'datetime-local':
          return 'datetime-local';
        case 'month':
          return 'month';
        case 'week':
          return 'week';
        case 'color':
          return 'color';
        case 'file':
          return 'file';
        case 'range':
          return 'range';
        case 'submit':
        case 'button':
          return 'button';
        default:
          return 'input';
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

    // Special case for iframe stubs
    if (tagName === 'ariadne-iframe-stub') return 'link'; // Treat as link for now

    return null;
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return ['input', 'select', 'textarea', 'button'].includes(tagName);
  }

  /**
   * Get current state of interactive elements
   */
  private getElementState(element: Element): ThreadlineElement['state'] {
    const state: ThreadlineElement['state'] = {};

    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'input': {
        const type = element.getAttribute('type') || 'text';
        if (type === 'checkbox' || type === 'radio') {
          state.checked = element.hasAttribute('checked');
        }
        state.value = element.getAttribute('value') || '';
        state.disabled = element.hasAttribute('disabled');
        break;
      }
      case 'select': {
        // For select elements, try to find selected option
        const selectedOption = element.querySelector(
          'option[selected]',
        ) as Element | null;
        if (selectedOption) {
          state.value =
            selectedOption.getAttribute('value') || selectedOption.textContent || '';
          state.selectedText = selectedOption.textContent || '';
        }
        state.disabled = element.hasAttribute('disabled');
        break;
      }
      case 'textarea': {
        state.value = element.textContent || '';
        state.disabled = element.hasAttribute('disabled');
        break;
      }
      case 'button': {
        state.disabled = element.hasAttribute('disabled');
        break;
      }
    }

    return Object.keys(state).length > 0 ? state : undefined;
  }

  /**
   * Build children arrays for elements
   */
  private buildChildrenArrays(): void {
    // Create a map of parent IDs to child IDs
    const parentToChildren = new Map<string, string[]>();

    for (const element of this.elements) {
      if (element.parentId) {
        if (!parentToChildren.has(element.parentId)) {
          parentToChildren.set(element.parentId, []);
        }
        parentToChildren.get(element.parentId)!.push(element.id);
      }
    }

    // Add children arrays to elements
    for (const element of this.elements) {
      const children = parentToChildren.get(element.id);
      if (children && children.length > 0) {
        element.children = children;
      }
    }
  }
}
