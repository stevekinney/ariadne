/**
 * Hash-based ID Generator for Ariadne
 * Generates short, efficient IDs using element properties and base62 encoding
 */

export class HashIdGenerator {
  private idCache: Map<Element, string> = new Map();
  private readonly base62Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  /**
   * Generate a short, unique ID for an element
   * Uses element properties to create a deterministic hash
   */
  generateId(element: Element): string {
    // Check cache first
    const cached = this.idCache.get(element);
    if (cached) {
      return cached;
    }

    // Generate hash based on element properties
    const hash = this.generateElementHash(element);
    
    // Cache it
    this.idCache.set(element, hash);
    
    return hash;
  }

  /**
   * Generate a hash based on element properties
   * Combines tag name, position, and attributes for uniqueness
   */
  private generateElementHash(element: Element): string {
    // Collect element properties for hashing
    const parts: string[] = [
      element.tagName.toLowerCase(),
      this.getElementIndex(element).toString(),
    ];

    // Add key attributes that help identify the element
    const keyAttributes = ['id', 'name', 'class', 'type', 'href', 'src', 'action'];
    for (const attr of keyAttributes) {
      const value = element.getAttribute(attr);
      if (value) {
        parts.push(`${attr}:${value}`);
      }
    }

    // Create a simple hash from the parts
    const hashInput = parts.join('|');
    const hash = this.simpleHash(hashInput);
    
    // Convert to base62 and ensure uniqueness
    const base62Hash = this.toBase62(hash);
    const shortHash = base62Hash.slice(0, 8);
    
    // Add counter suffix if we've seen this hash before
    const finalId = this.ensureUniqueness(shortHash);
    
    return finalId;
  }

  /**
   * Get the index of an element among its siblings
   */
  private getElementIndex(element: Element): number {
    if (!element.parentNode) return 0;
    
    const siblings = Array.from(element.parentNode.children);
    return siblings.indexOf(element);
  }

  /**
   * Simple hash function using djb2 algorithm
   * Fast and good enough for our use case
   */
  private simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & 0x7FFFFFFF; // Keep it positive
    }
    return hash;
  }

  /**
   * Convert number to base62 string
   */
  private toBase62(num: number): string {
    if (num === 0) return '0';
    
    let result = '';
    while (num > 0) {
      result = this.base62Chars[num % 62] + result;
      num = Math.floor(num / 62);
    }
    return result;
  }

  /**
   * Ensure the generated ID is unique
   * Adds a counter suffix if needed
   */
  private ensureUniqueness(baseId: string): string {
    // Check if we've used this base ID before
    const usedIds = new Set(this.idCache.values());
    
    if (!usedIds.has(baseId)) {
      return baseId;
    }
    
    // Add counter suffix to make it unique
    let uniqueId: string;
    let suffix = 0;
    do {
      suffix++;
      uniqueId = `${baseId}${this.toBase62(suffix)}`;
    } while (usedIds.has(uniqueId));
    
    return uniqueId;
  }

  /**
   * Clear the ID cache
   */
  clearCache(): void {
    this.idCache.clear();
  }

  /**
   * Get cache size for monitoring
   */
  getCacheSize(): number {
    return this.idCache.size;
  }
}