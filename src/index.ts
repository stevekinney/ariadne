/**
 * Threadline - Semantic HTML Extraction for LLM Navigation
 * Browser-based library using Web Workers for secure processing
 */

import type { ThreadlineConfiguration } from './types/threadline.js';

/**
 * The main Threadline client class for semantic HTML extraction.
 *
 * Provides a high-level interface for extracting semantic information from DOM documents.
 * Uses Web Workers for secure, non-blocking processing. Supports configuration for
 * token budgets, child element inclusion, and debug mode.
 *
 * @example
 * ```javascript
 * const client = new Threadline({ tokenBudget: 5000 });
 * const map = await client.extract(document);
 * console.log(map.elements);
 * client.terminate(); // Clean up when done
 * ```
 */
export { Threadline } from './threadline-client.js';

// Core types
export type {
  ThreadlineMap,
  ThreadlineElement,
  ThreadlineMeta,
  ThreadlineRole,
  ThreadlineConfiguration as ThreadlineConfig,
  ThreadlineElementState,
} from './types/threadline.js';

/**
 * Zod validation schemas for runtime type checking.
 *
 * These schemas validate configuration objects and document parameters
 * to ensure type safety at runtime and provide helpful error messages.
 */
export {
  /** Validates ThreadlineConfiguration objects with proper defaults and constraints */
  ThreadlineConfigurationSchema,
  /** Validates Document objects to ensure they have required properties */
  DocumentSchema,
} from './types/threadline.js';

/**
 * Error handling utilities and classes.
 *
 * Provides structured error handling with specific error codes and operational flags.
 * All Threadline-specific errors inherit from ThreadlineError for consistent handling.
 */
export {
  /** The main error class for all Threadline-specific errors */
  ThreadlineError,
  /** Enumeration of all possible Threadline error codes */
  ThreadlineErrorCode,
  /** Type guard to check if an error is a ThreadlineError instance */
  isThreadlineError,
  /** Type guard to check if an error is specifically a token limit exceeded error */
  isTokenLimitExceeded,
  /** Type guard to check if an error is specifically a worker error */
  isWorkerError,
} from './errors/threadline-errors.js';

/**
 * Convenience function for one-off semantic HTML extraction.
 *
 * Creates a Threadline, performs extraction, and automatically cleans up.
 * This is the simplest way to extract semantic information from a document
 * if you don't need to reuse the client or control its lifecycle.
 *
 * @param doc - The DOM document to extract semantic information from
 * @param config - Optional configuration object for extraction parameters
 * @returns Promise that resolves to the extracted semantic map
 *
 * @throws {ThreadlineError} When document validation fails or extraction encounters an error
 *
 * @example
 * ```javascript
 * // Simple extraction with default configuration
 * const map = await extractSemanticMap(document);
 *
 * // Extraction with custom configuration
 * const map = await extractSemanticMap(document, {
 *   tokenBudget: 8000,
 *   includeChildren: false,
 *   debug: true
 * });
 *
 * // Process the results
 * map.elements.forEach(element => {
 *   console.log(`${element.role}: ${element.label}`);
 * });
 * ```
 */
export async function extractSemanticMap(
  doc: Document,
  config?: import('./types/threadline.js').ThreadlineConfiguration,
): Promise<import('./types/threadline.js').ThreadlineMap> {
  // Validate inputs
  const { DocumentSchema, ThreadlineConfigurationSchema } = await import(
    './types/threadline.js'
  );
  const { ThreadlineError } = await import('./errors/threadline-errors.js');

  try {
    DocumentSchema.parse(doc);
    const validatedConfig = config ? ThreadlineConfigurationSchema.parse(config) : undefined;

    const { Threadline } = await import('./threadline-client.js');
    const client = new Threadline(validatedConfig as ThreadlineConfiguration);

    try {
      return await client.extract(doc);
    } finally {
      client.terminate();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      throw ThreadlineError.invalidDocument({ validationError: error.message });
    }
    throw error;
  }
}

// Browser environment check
if (typeof window === 'undefined' || typeof Worker === 'undefined') {
  console.warn('⚠️  Threadline requires a browser environment with Web Worker support');
}
