/**
 * ThreadlineSelectorGenerator - Creates stable CSS selectors for Threadline elements
 * Prioritizes stability and uniqueness over brevity
 */

import { escapeSelector, isFormElement } from '../utilities/selector-utils.js';

export class ThreadlineSelectorGenerator {
  private selectorCache = new Map<Element, string>();
  private uniquenessCache = new Map<string, boolean>();
  private elementIndexCache = new Map<Element, number>();
  private parentChildrenCache = new Map<Element, Element[]>();

  /**
   * Generate a stable CSS selector for an element with caching
   * Priority order:
   * 1. ID selector
   * 2. Unique attribute combination
   * 3. Structural path with stable classes
   * 4. nth-child/nth-of-type fallback
   */
  generate(element: Element): string {
    // Check cache first
    const cached = this.selectorCache.get(element);
    if (cached) {
      return cached;
    }

    const selector = this.generateSelector(element);
    this.selectorCache.set(element, selector);
    return selector;
  }

  /**
   * Clear caches to free memory
   */
  clearCache(): void {
    this.selectorCache.clear();
    this.uniquenessCache.clear();
    this.elementIndexCache.clear();
    this.parentChildrenCache.clear();
  }

  /**
   * Internal selector generation logic
   */
  private generateSelector(element: Element): string {
    // Priority 1: ID selector (if ID exists and is unique)
    if (element.id) {
      const idSelector = `#${escapeSelector(element.id)}`;
      if (this.isUniqueSelector(element, idSelector)) {
        return idSelector;
      }
    }

    // Priority 2: Unique attribute combination
    const attrSelector = this.generateAttributeSelector(element);
    if (attrSelector && this.isUniqueSelector(element, attrSelector)) {
      return attrSelector;
    }

    // Priority 3: Structural path with stable classes
    const classSelector = this.generateClassBasedSelector(element);
    if (classSelector && this.isUniqueSelector(element, classSelector)) {
      return classSelector;
    }

    // Priority 4: Full structural path (fallback)
    return this.generateStructuralSelector(element);
  }

  /**
   * Generate selector based on unique attributes
   */
  private generateAttributeSelector(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();
    const attributes: string[] = [];

    // Important attributes that often make elements unique
    const importantAttrs = ['name', 'type', 'role', 'data-testid', 'data-id'];

    for (const attr of importantAttrs) {
      if (element.hasAttribute(attr)) {
        const value = element.getAttribute(attr)!;
        attributes.push(`[${attr}="${escapeSelector(value)}"]`);
      }
    }

    if (attributes.length === 0) {
      return null;
    }

    return tagName + attributes.join('');
  }

  /**
   * Generate selector using stable classes
   */
  private generateClassBasedSelector(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();
    const classList = Array.from(element.classList);

    if (classList.length === 0) {
      return null;
    }

    // Filter out potentially unstable classes (those with numbers, hashes, etc.)
    const stableClasses = classList.filter((cls) => !this.isUnstableClass(cls));

    if (stableClasses.length === 0) {
      return null;
    }

    // Build selector with tag and classes
    const classSelector = stableClasses.map((cls) => `.${escapeSelector(cls)}`).join('');

    return tagName + classSelector;
  }

  /**
   * Generate a full structural selector (most stable, least concise)
   */
  private generateStructuralSelector(element: Element): string {
    const path: string[] = [];
    let current: Element | null = element;
    let depth = 0;
    const maxDepth = 6; // Limit traversal depth

    while (current && current.tagName !== 'HTML' && depth < maxDepth) {
      const selector = this.getElementPathSegment(current);
      path.unshift(selector);
      current = current.parentElement;
      depth++;
    }

    // Optimize path length for performance
    if (path.length > 5) {
      // Keep most specific (last 3) and most general (first 2) segments
      const start = path.slice(0, 2);
      const end = path.slice(-3);
      return [...start, '*', ...end].join(' > ');
    }

    return path.join(' > ');
  }

  /**
   * Get a single path segment for an element
   */
  private getElementPathSegment(element: Element): string {
    const tagName = element.tagName.toLowerCase();

    // Try to use a unique attribute first
    if (element.id) {
      return `${tagName}#${escapeSelector(element.id)}`;
    }

    // Try name attribute for form elements
    if (element.hasAttribute('name') && isFormElement(element)) {
      const name = element.getAttribute('name')!;
      return `${tagName}[name="${escapeSelector(name)}"]`;
    }

    // Use nth-of-type for uniqueness
    const index = this.getNthOfTypeIndex(element);
    if (index > 1 || this.hasSiblingOfSameType(element)) {
      return `${tagName}:nth-of-type(${index})`;
    }

    return tagName;
  }

  /**
   * Check if class name appears unstable
   */
  private isUnstableClass(className: string): boolean {
    // Classes with random hashes, timestamps, or generated IDs
    const unstablePatterns = [
      /^[a-f0-9]{8,}$/, // Hash-like
      /\d{10,}/, // Timestamp-like
      /_[a-z0-9]{5,}$/i, // Generated suffix
      /^css-/, // CSS modules
      /^sc-/, // Styled components
      /^emotion-/, // Emotion CSS
    ];

    return unstablePatterns.some((pattern) => pattern.test(className));
  }

  /**
   * Get nth-of-type index with caching for better performance
   */
  private getNthOfTypeIndex(element: Element): number {
    // Check cache first
    const cached = this.elementIndexCache.get(element);
    if (cached !== undefined) {
      return cached;
    }

    // Get parent and its children efficiently
    const parent = element.parentElement;
    if (!parent) {
      this.elementIndexCache.set(element, 1);
      return 1;
    }

    // Use cached children if available
    let children = this.parentChildrenCache.get(parent);
    if (!children) {
      children = Array.from(parent.children);
      this.parentChildrenCache.set(parent, children);
    }

    // Calculate indices for all children of same type at once
    let index = 1;
    for (const child of children) {
      if (child.tagName === element.tagName) {
        this.elementIndexCache.set(child, index);
        if (child === element) {
          return index;
        }
        index++;
      }
    }

    // Fallback (shouldn't happen)
    this.elementIndexCache.set(element, 1);
    return 1;
  }

  /**
   * Check if element has siblings of same type with caching
   */
  private hasSiblingOfSameType(element: Element): boolean {
    const parent = element.parentElement;
    if (!parent) return false;

    // Use cached children if available
    let children = this.parentChildrenCache.get(parent);
    if (!children) {
      children = Array.from(parent.children);
      this.parentChildrenCache.set(parent, children);
    }

    // Count elements of same type
    let count = 0;
    for (const child of children) {
      if (child.tagName === element.tagName) {
        count++;
        if (count > 1) return true;
      }
    }

    return false;
  }

  /**
   * Verify selector uniquely identifies element with caching and optimization
   */
  private isUniqueSelector(element: Element, selector: string): boolean {
    // Create cache key that includes element reference
    const cacheKey = `${selector}:${element.tagName}:${element.ownerDocument?.location?.href || ''}`;

    if (this.uniquenessCache.has(cacheKey)) {
      return this.uniquenessCache.get(cacheKey)!;
    }

    try {
      const doc = element.ownerDocument;

      // Fast path for ID selectors
      if (selector.startsWith('#') && !selector.includes(' ')) {
        const id = selector.slice(1);
        const found = doc.getElementById(id);
        const isUnique = found === element;
        this.uniquenessCache.set(cacheKey, isUnique);
        return isUnique;
      }

      // For complex selectors, use querySelectorAll but with early exit
      const matches = doc.querySelectorAll(selector);
      let isUnique = false;

      if (matches.length === 1) {
        isUnique = matches[0] === element;
      } else if (matches.length > 1) {
        // Early exit if element is not in the first few matches
        for (let i = 0; i < Math.min(matches.length, 3); i++) {
          if (matches[i] === element) {
            isUnique = matches.length === 1;
            break;
          }
        }
      }

      // Cache the result
      this.uniquenessCache.set(cacheKey, isUnique);
      return isUnique;
    } catch {
      // Invalid selector
      this.uniquenessCache.set(cacheKey, false);
      return false;
    }
  }
}
