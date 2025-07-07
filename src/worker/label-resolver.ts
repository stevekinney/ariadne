/**
 * LabelResolver - Resolves human-readable labels for elements
 * Implements the 5-priority system from requirements
 */

export class LabelResolver {
  private doc: Document;

  constructor(doc: Document) {
    this.doc = doc;
  }

  /**
   * Resolve label for an element using the 5-priority system:
   * 1. <label for="...">
   * 2. aria-labelledby
   * 3. aria-label
   * 4. placeholder (for inputs)
   * 5. Proximity heuristic (text from nearest siblings)
   */
  resolve(element: Element): string | undefined {
    // Priority 1: Explicit label via 'for' attribute
    const labelViaFor = this.findLabelByFor(element);
    if (labelViaFor) return labelViaFor;

    // Priority 2: aria-labelledby
    const labelViaAriaLabelledBy = this.resolveAriaLabelledBy(element);
    if (labelViaAriaLabelledBy) return labelViaAriaLabelledBy;

    // Priority 3: aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel?.trim()) return ariaLabel.trim();

    // Priority 4: placeholder (for inputs)
    if ('placeholder' in element && element.placeholder !== undefined) {
      const placeholder = element.getAttribute('placeholder');
      if (placeholder?.trim()) return placeholder.trim();
    }

    // Priority 5: Proximity heuristic
    const proximityLabel = this.findLabelByProximity(element);
    if (proximityLabel) return proximityLabel;

    // Special handling for buttons and links - use their text content
    if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      const textContent = this.getCleanTextContent(element);
      if (textContent) return textContent;
    }

    // For submit/button inputs, use value attribute
    if (element.tagName === 'INPUT' && element.hasAttribute('type')) {
      const type = element.getAttribute('type');
      if (type === 'submit' || type === 'button') {
        const value = element.getAttribute('value');
        if (value?.trim()) return value.trim();
      }
    }

    return undefined;
  }

  /**
   * Find label element with 'for' attribute pointing to this element
   */
  private findLabelByFor(element: Element): string | undefined {
    const id = element.id;
    if (!id) return undefined;

    // CSS.escape might not be available in all environments
    const escapedId = id.replace(/["\\]/g, '\\$&');
    const label = this.doc.querySelector(`label[for="${escapedId}"]`);
    if (label) {
      return this.getCleanTextContent(label);
    }

    return undefined;
  }

  /**
   * Resolve aria-labelledby references
   */
  private resolveAriaLabelledBy(element: Element): string | undefined {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (!labelledBy) return undefined;

    const ids = labelledBy.split(/\s+/);
    const labels: string[] = [];

    for (const id of ids) {
      const labelElement = this.doc.getElementById(id);
      if (labelElement) {
        const text = this.getCleanTextContent(labelElement);
        if (text) labels.push(text);
      }
    }

    return labels.length > 0 ? labels.join(' ') : undefined;
  }

  /**
   * Find label by proximity (within 2 siblings)
   */
  private findLabelByProximity(element: Element): string | undefined {
    const maxDistance = 2;

    // Check previous siblings
    let sibling = element.previousElementSibling;
    let distance = 0;

    while (sibling && distance < maxDistance) {
      if (!this.isInteractiveElement(sibling)) {
        const text = this.getCleanTextContent(sibling);
        if (text && this.looksLikeLabel(text)) {
          return text;
        }
      }
      sibling = sibling.previousElementSibling;
      distance++;
    }

    // Check next siblings
    sibling = element.nextElementSibling;
    distance = 0;

    while (sibling && distance < maxDistance) {
      if (!this.isInteractiveElement(sibling)) {
        const text = this.getCleanTextContent(sibling);
        if (text && this.looksLikeLabel(text)) {
          return text;
        }
      }
      sibling = sibling.nextElementSibling;
      distance++;
    }

    // Check parent's text nodes (common pattern: text before input)
    const parent = element.parentElement;
    if (parent) {
      const textBefore = this.getTextBeforeElement(element, parent);
      if (textBefore && this.looksLikeLabel(textBefore)) {
        return textBefore;
      }
    }

    return undefined;
  }

  /**
   * Get text content before a specific child element
   */
  private getTextBeforeElement(element: Element, parent: Element): string | undefined {
    let text = '';

    for (const node of parent.childNodes) {
      if (node === element) break;

      if (node.nodeType === 3) {
        // TEXT_NODE = 3
        text += node.textContent || '';
      } else if (node.nodeType === 1 && !this.isInteractiveElement(node as Element)) {
        // ELEMENT_NODE = 1
        text += this.getCleanTextContent(node as Element) || '';
      }
    }

    return text.trim() || undefined;
  }

  /**
   * Check if element is interactive (should not be used as label)
   */
  private isInteractiveElement(element: Element): boolean {
    const interactiveTags = ['input', 'button', 'select', 'textarea', 'a'];
    return interactiveTags.includes(element.tagName.toLowerCase());
  }

  /**
   * Check if text looks like a label (basic heuristic)
   */
  private looksLikeLabel(text: string): boolean {
    // Must be reasonably short and end with common label punctuation
    return (
      text.length > 0 &&
      text.length < 100 &&
      (text.endsWith(':') || text.endsWith('?') || /^[A-Z]/.test(text))
    );
  }

  /**
   * Get clean text content from an element
   */
  private getCleanTextContent(element: Element): string | undefined {
    // Clone to avoid modifying original
    const clone = element.cloneNode(true) as Element;

    // Remove script and style elements
    const unwanted = clone.querySelectorAll('script, style, svg, noscript');
    unwanted.forEach((el) => el.remove());

    // Get text and clean it up
    const text = clone.textContent || '';
    return text.replace(/\s+/g, ' ').trim() || undefined;
  }
}
