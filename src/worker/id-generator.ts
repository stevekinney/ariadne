/**
 * ID Generator with crypto API polyfill support
 * Generates unique identifiers for DOM elements with fallback for older browsers
 */

export class IdGenerator {
  private idCache: Map<Element, string> = new Map();
  private counter: number = 0;

  /**
   * Generate a unique ID for an element
   * Uses crypto.randomUUID() with fallback for broader browser compatibility
   */
  generateId(element: Element): string {
    // Check cache first
    const cached = this.idCache.get(element);
    if (cached) {
      return cached;
    }

    // Generate new UUID with fallback
    const id = this.generateUUID();

    // Cache it
    this.idCache.set(element, id);

    return id;
  }

  /**
   * Generate UUID with crypto API polyfill
   * Falls back to custom implementation for older browsers
   */
  private generateUUID(): string {
    // Modern browsers with crypto.randomUUID()
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch {
        // Fallback if crypto.randomUUID() fails
      }
    }

    // Browsers with crypto.getRandomValues()
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      try {
        return this.generateUUIDWithGetRandomValues();
      } catch {
        // Fallback if crypto.getRandomValues() fails
      }
    }

    // Fallback for environments without crypto API
    return this.generateUUIDFallback();
  }

  /**
   * Generate UUID using crypto.getRandomValues()
   */
  private generateUUIDWithGetRandomValues(): string {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);

    // Set version (4) and variant bits according to RFC 4122
    buffer[6] = (buffer[6]! & 0x0f) | 0x40; // Version 4
    buffer[8] = (buffer[8]! & 0x3f) | 0x80; // Variant 10

    // Convert to hex string with proper formatting
    const hex = Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  /**
   * Fallback UUID generator for environments without crypto API
   * Not cryptographically secure but sufficient for DOM element identification
   */
  private generateUUIDFallback(): string {
    // Simple UUID v4 format with timestamp and counter for uniqueness
    const timestamp = Date.now().toString(16);
    const random1 = Math.random().toString(16).slice(2);
    const random2 = Math.random().toString(16).slice(2);
    const counterHex = (++this.counter).toString(16);

    // Pad components to required lengths
    const part1 = (timestamp + random1).slice(-8);
    const part2 = random2.slice(-4);
    const part3 = '4' + random1.slice(-3); // Version 4
    const part4 = (8 + Math.floor(Math.random() * 4)).toString(16) + random2.slice(-3); // Variant
    const part5 = (random1 + random2 + counterHex).slice(-12);

    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  }

  /**
   * Clear the ID cache
   */
  clearCache(): void {
    this.idCache.clear();
  }
}
