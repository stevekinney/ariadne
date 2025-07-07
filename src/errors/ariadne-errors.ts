/**
 * Error types specific to Ariadne semantic extraction
 */

/**
 * Base error class providing common error functionality.
 *
 * @internal This class is not exported and is only used internally.
 */
class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(message: string, code: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Enumeration of all possible Ariadne error codes.
 *
 * Each error code represents a specific category of error that can occur
 * during semantic extraction. Use these codes to handle different error
 * types programmatically.
 */
export enum AriadneErrorCode {
  /** General extraction failure */
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  /** Web Worker related errors */
  WORKER_ERROR = 'WORKER_ERROR',
  /** DOM parsing or structure errors */
  DOM_PARSING_ERROR = 'DOM_PARSING_ERROR',
  /** Token budget exceeded during processing */
  TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
  /** Invalid or malformed document provided */
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  /** Processing timeout exceeded */
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
}

/**
 * Main error class for all Ariadne-specific errors.
 *
 * AriadneError extends the base Error class with additional properties
 * for error categorization, operational flags, and contextual details.
 * All errors thrown by Ariadne will be instances of this class.
 *
 * @example
 * ```javascript
 * try {
 *   const map = await extractSemanticMap(document);
 * } catch (error) {
 *   if (error instanceof AriadneError) {
 *     console.log(`Error code: ${error.code}`);
 *     console.log(`Operational: ${error.isOperational}`);
 *     console.log(`Details:`, error.details);
 *   }
 * }
 * ```
 */
export class AriadneError extends BaseError {
  constructor(
    message: string,
    public override readonly code: AriadneErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, 'ARIADNE_ERROR', 500, true);
    this.name = 'AriadneError';
  }

  /**
   * Create an extraction failed error.
   *
   * @param details - Additional error context and debugging information
   * @returns AriadneError with EXTRACTION_FAILED code
   */
  static extractionFailed(details?: Record<string, unknown>): AriadneError {
    return new AriadneError(
      'Failed to extract semantic map from document',
      AriadneErrorCode.EXTRACTION_FAILED,
      details,
    );
  }

  /**
   * Create a Web Worker error.
   *
   * @param message - Specific error message from the worker
   * @param details - Additional error context and debugging information
   * @returns AriadneError with WORKER_ERROR code
   */
  static workerError(message: string, details?: Record<string, unknown>): AriadneError {
    return new AriadneError(
      `Web Worker error: ${message}`,
      AriadneErrorCode.WORKER_ERROR,
      details,
    );
  }

  /**
   * Create a DOM parsing error.
   *
   * @param details - Additional error context and debugging information
   * @returns AriadneError with DOM_PARSING_ERROR code
   */
  static domParsingError(details?: Record<string, unknown>): AriadneError {
    return new AriadneError(
      'Failed to parse DOM structure',
      AriadneErrorCode.DOM_PARSING_ERROR,
      details,
    );
  }

  /**
   * Create a token limit exceeded error.
   *
   * @param limit - The token limit that was exceeded
   * @param details - Additional error context and debugging information
   * @returns AriadneError with TOKEN_LIMIT_EXCEEDED code
   */
  static tokenLimitExceeded(
    limit: number,
    details?: Record<string, unknown>,
  ): AriadneError {
    return new AriadneError(
      `Token limit of ${limit} exceeded during extraction`,
      AriadneErrorCode.TOKEN_LIMIT_EXCEEDED,
      { limit, ...details },
    );
  }

  /**
   * Create an invalid document error.
   *
   * @param details - Additional error context and debugging information
   * @returns AriadneError with INVALID_DOCUMENT code
   */
  static invalidDocument(details?: Record<string, unknown>): AriadneError {
    return new AriadneError(
      'Invalid or empty document provided',
      AriadneErrorCode.INVALID_DOCUMENT,
      details,
    );
  }

  /**
   * Create a processing timeout error.
   *
   * @param timeout - The timeout value in milliseconds that was exceeded
   * @param details - Additional error context and debugging information
   * @returns AriadneError with PROCESSING_TIMEOUT code
   */
  static processingTimeout(
    timeout: number,
    details?: Record<string, unknown>,
  ): AriadneError {
    return new AriadneError(
      `Processing timeout after ${timeout}ms`,
      AriadneErrorCode.PROCESSING_TIMEOUT,
      { timeout, ...details },
    );
  }
}

/**
 * Type guard to check if an error is an AriadneError instance.
 *
 * @param error - The error to check
 * @returns True if the error is an AriadneError, false otherwise
 *
 * @example
 * ```javascript
 * try {
 *   await extractSemanticMap(document);
 * } catch (error) {
 *   if (isAriadneError(error)) {
 *     // Handle Ariadne-specific error
 *     console.log(`Ariadne error: ${error.code}`);
 *   } else {
 *     // Handle other types of errors
 *     console.log('Unexpected error:', error);
 *   }
 * }
 * ```
 */
export function isAriadneError(error: unknown): error is AriadneError {
  return error instanceof AriadneError;
}

/**
 * Type guard to check if an error is specifically a token limit exceeded error.
 *
 * @param error - The error to check
 * @returns True if the error is a token limit exceeded error, false otherwise
 *
 * @example
 * ```javascript
 * try {
 *   await extractSemanticMap(document);
 * } catch (error) {
 *   if (isTokenLimitExceeded(error)) {
 *     console.log('Token limit was exceeded, consider increasing tokenBudget');
 *   }
 * }
 * ```
 */
export function isTokenLimitExceeded(error: unknown): boolean {
  return isAriadneError(error) && error.code === AriadneErrorCode.TOKEN_LIMIT_EXCEEDED;
}

/**
 * Type guard to check if an error is specifically a worker error.
 *
 * @param error - The error to check
 * @returns True if the error is a worker error, false otherwise
 *
 * @example
 * ```javascript
 * try {
 *   await extractSemanticMap(document);
 * } catch (error) {
 *   if (isWorkerError(error)) {
 *     console.log('Web Worker encountered an error:', error.message);
 *   }
 * }
 * ```
 */
export function isWorkerError(error: unknown): boolean {
  return isAriadneError(error) && error.code === AriadneErrorCode.WORKER_ERROR;
}
