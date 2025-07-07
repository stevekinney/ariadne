/**
 * Ariadne - Semantic HTML Extraction for LLM Navigation
 * Browser-based library using Web Workers for secure processing
 */

import type { AriadneConfiguration } from './types/ariadne.js';

/**
 * The main Ariadne client class for semantic HTML extraction.
 *
 * Provides a high-level interface for extracting semantic information from DOM documents.
 * Uses Web Workers for secure, non-blocking processing. Supports configuration for
 * token budgets, child element inclusion, and debug mode.
 *
 * @example
 * ```javascript
 * const client = new Ariadne({ tokenBudget: 5000 });
 * const map = await client.extract(document);
 * console.log(map.elements);
 * client.terminate(); // Clean up when done
 * ```
 */
export { Ariadne } from './ariadne-client.js';

// Core types
export type {
  AriadneMap,
  AriadneElement,
  AriadneMeta,
  AriadneRole,
  AriadneConfiguration as AriadneConfig,
  AriadneElementState,
} from './types/ariadne.js';

/**
 * Zod validation schemas for runtime type checking.
 *
 * These schemas validate configuration objects and document parameters
 * to ensure type safety at runtime and provide helpful error messages.
 */
export {
  /** Validates AriadneConfiguration objects with proper defaults and constraints */
  AriadneConfigurationSchema,
  /** Validates Document objects to ensure they have required properties */
  DocumentSchema,
} from './types/ariadne.js';

/**
 * Error handling utilities and classes.
 *
 * Provides structured error handling with specific error codes and operational flags.
 * All Ariadne-specific errors inherit from AriadneError for consistent handling.
 */
export {
  /** The main error class for all Ariadne-specific errors */
  AriadneError,
  /** Enumeration of all possible Ariadne error codes */
  AriadneErrorCode,
  /** Type guard to check if an error is an AriadneError instance */
  isAriadneError,
  /** Type guard to check if an error is specifically a token limit exceeded error */
  isTokenLimitExceeded,
  /** Type guard to check if an error is specifically a worker error */
  isWorkerError,
} from './errors/ariadne-errors.js';

/**
 * Convenience function for one-off semantic HTML extraction.
 *
 * Creates an Ariadne, performs extraction, and automatically cleans up.
 * This is the simplest way to extract semantic information from a document
 * if you don't need to reuse the client or control its lifecycle.
 *
 * @param doc - The DOM document to extract semantic information from
 * @param config - Optional configuration object for extraction parameters
 * @returns Promise that resolves to the extracted semantic map
 *
 * @throws {AriadneError} When document validation fails or extraction encounters an error
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
  config?: import('./types/ariadne.js').AriadneConfiguration,
): Promise<import('./types/ariadne.js').AriadneMap> {
  // Validate inputs
  const { DocumentSchema, AriadneConfigurationSchema } = await import(
    './types/ariadne.js'
  );
  const { AriadneError } = await import('./errors/ariadne-errors.js');

  try {
    DocumentSchema.parse(doc);
    const validatedConfig = config ? AriadneConfigurationSchema.parse(config) : undefined;

    const { Ariadne } = await import('./ariadne-client.js');
    const client = new Ariadne(validatedConfig as AriadneConfiguration);

    try {
      return await client.extract(doc);
    } finally {
      client.terminate();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      throw AriadneError.invalidDocument({ validationError: error.message });
    }
    throw error;
  }
}

// Browser environment check
if (typeof window === 'undefined' || typeof Worker === 'undefined') {
  console.warn('⚠️  Ariadne requires a browser environment with Web Worker support');
}
