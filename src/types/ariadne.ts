/**
 * Ariadne Type Definitions
 * Complete type system for the Ariadne semantic extraction service
 */

import { z } from 'zod';

/**
 * Metadata about the document being processed.
 */
export interface AriadneMeta {
  /** The URL of the document when extraction occurred */
  url: string;
  /** Timestamp when extraction was performed (milliseconds since epoch) */
  timestamp: number;
  /** True if the page likely contains dynamic content like infinite scroll */
  dynamicContent?: boolean;
}

/**
 * State information for interactive elements.
 *
 * Captures the current state of form elements and interactive components
 * at the time of extraction.
 */
export interface AriadneElementState {
  /** For checkbox and radio inputs - whether the element is checked */
  checked?: boolean;
  /** Current value of the element (for inputs, selects, textareas) */
  value?: string;
  /** Whether the element is disabled */
  disabled?: boolean;
  /** For select options - whether the option is selected */
  selected?: boolean;
  /** For select elements - the text content of the selected option */
  selectedText?: string;
  /** Additional state properties for extensibility */
  [key: string]: unknown;
}

/**
 * Represents a single semantic element extracted from the DOM.
 *
 * Each element contains identification, semantic role, positioning,
 * and contextual information needed for automated interaction.
 */
export interface AriadneElement {
  /** Unique identifier generated using crypto.randomUUID() */
  id: string;
  /** Semantic role from the supported AriadneRole list */
  role: string;
  /** Human-readable label resolved using accessibility best practices */
  label?: string;
  /** Highly specific CSS selector for reliable element targeting */
  selector: string;
  /** ID of the parent element in the semantic hierarchy */
  parentId: string | null;
  /** Array of child element IDs (included when includeChildren is true) */
  children?: string[];
  /** Current state of interactive elements */
  state?: AriadneElementState;
  /** URL for link elements */
  href?: string;
  /** True if element has closed shadow DOM that cannot be accessed */
  shadowClosed?: boolean;
  /** Indicates this element is a stub for a cross-origin iframe */
  stub?: 'iframe';
  /** Origin domain for iframe stubs */
  origin?: string;
  /** Width dimension for iframe stubs */
  width?: number;
  /** Height dimension for iframe stubs */
  height?: number;
}

/**
 * Complete semantic map of a document.
 *
 * Contains all extracted semantic elements along with metadata
 * and information about the extraction process.
 */
export interface AriadneMap {
  /** Version of the extraction schema used */
  schemaVersion: string;
  /** Metadata about the source document */
  meta: AriadneMeta;
  /** Array of all extracted semantic elements (when elementsAsObject is false) */
  elements?: AriadneElement[];
  /** Object mapping element IDs to elements (when elementsAsObject is true) */
  elementsById?: Record<string, AriadneElement>;
  /** Array of all element IDs (when includeElementIds is true) */
  elementIds?: string[];
  /** True if extraction was stopped before completion */
  partial: boolean;
  /** Reason for partial extraction (if applicable) */
  reason?: 'token_limit_exceeded' | 'processing_error' | null;
  /** ID of the last element processed before truncation */
  lastProcessedId?: string | undefined;
}

/**
 * Supported semantic roles for element classification.
 *
 * These roles represent the semantic meaning and interaction patterns
 * of HTML elements. The extraction process maps HTML elements to these
 * standardized roles for consistent interpretation.
 */
export type AriadneRole =
  /** Form container element */
  | 'form'
  /** Generic text input field */
  | 'input'
  /** Checkbox input */
  | 'checkbox'
  /** Radio button input */
  | 'radio'
  /** Password input field */
  | 'password'
  /** Email input field */
  | 'email'
  /** Telephone number input */
  | 'tel'
  /** Numeric input field */
  | 'number'
  /** Search input field */
  | 'search'
  /** URL input field */
  | 'url'
  /** Date picker input */
  | 'date'
  /** Time picker input */
  | 'time'
  /** Date and time picker input */
  | 'datetime-local'
  /** Month picker input */
  | 'month'
  /** Week picker input */
  | 'week'
  /** Color picker input */
  | 'color'
  /** File upload input */
  | 'file'
  /** Range/slider input */
  | 'range'
  /** Dropdown selection list */
  | 'select'
  /** Multi-line text input */
  | 'textarea'
  /** Clickable button element */
  | 'button'
  /** Text label for form elements */
  | 'label'
  /** Navigational link */
  | 'link'
  /** Heading element (h1-h6) */
  | 'heading'
  /** Paragraph text element */
  | 'paragraph'
  /** Table container */
  | 'table'
  /** Table header section */
  | 'table_head'
  /** Table body section */
  | 'table_body'
  /** Table row */
  | 'table_row'
  /** Table header cell */
  | 'table_header'
  /** Table data cell */
  | 'table_cell';

// Message types for worker communication
export interface AriadneWorkerRequest {
  html: string;
  metadata: {
    url: string;
    timestamp: number;
    isPotentiallyDynamic?: boolean;
  };
}

export interface AriadneWorkerResponse {
  type: 'success' | 'error';
  code?: string;
  data?: AriadneMap;
  error?: string;
}

/**
 * Configuration options for Ariadne extraction.
 *
 * Controls various aspects of the semantic extraction process
 * including performance limits and output formatting.
 */
export interface AriadneConfiguration {
  /** Maximum number of tokens to use during extraction (default: 4000) */
  tokenBudget?: number;
  /** Whether to include children arrays in element objects (default: true) */
  includeChildren?: boolean;
  /** Enable debug mode for additional logging and diagnostics (default: false) */
  debug?: boolean;
  
  // Node processing options
  /** Callback function to process each element during extraction */
  onElementProcess?: (element: Element, id: string) => void;
  /** Whether to mark elements with data attributes (default: false) */
  markElements?: boolean;
  /** The attribute name to use for marking elements (default: 'data-ariadne-id') */
  elementAttribute?: string;
  
  // Output format options
  /** Enable compact mode to reduce output size (default: false) */
  compact?: boolean;
  /** Return elements as an object keyed by ID (default: true unless compact is true) */
  elementsAsObject?: boolean;
  /** Include a separate array of element IDs (default: true unless compact is true) */
  includeElementIds?: boolean;
}

// Validation schemas
export const AriadneConfigurationSchema = z
  .object({
    tokenBudget: z.number().int().positive().max(100000).optional().default(4000),
    includeChildren: z.boolean().optional().default(true),
    debug: z.boolean().optional().default(false),
    
    // Node processing options
    onElementProcess: z.function().args(z.any(), z.string()).returns(z.void()).optional(),
    markElements: z.boolean().optional().default(false),
    elementAttribute: z.string().optional().default('data-ariadne-id'),
    
    // Output format options
    compact: z.boolean().optional().default(false),
    elementsAsObject: z.boolean().optional(),
    includeElementIds: z.boolean().optional(),
  })
  .strict()
  .transform((config) => {
    // Apply defaults based on compact mode
    if (config.elementsAsObject === undefined) {
      config.elementsAsObject = !config.compact;
    }
    if (config.includeElementIds === undefined) {
      config.includeElementIds = !config.compact;
    }
    return config;
  });

export const DocumentSchema = z.custom<Document>(
  (value) => {
    return (
      (value instanceof Document || 
       (typeof value === 'object' && 
        value !== null && 
        value.constructor?.name === 'HTMLDocument')) &&
      value.documentElement !== null &&
      value.location !== null
    );
  },
  {
    message: 'Must be a valid Document with documentElement and location',
  },
);
