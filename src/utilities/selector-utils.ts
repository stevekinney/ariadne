/**
 * Shared selector generation utilities
 * Used by both Ariadne and DomProcessor to avoid code duplication
 */

/**
 * Generate a simple CSS selector for an element
 * Used for basic element identification (like iframe stubs)
 */
export function generateSimpleSelector(element: Element): string {
  // Priority 1: ID selector
  if (element.id) {
    return `#${escapeSelector(element.id)}`;
  }

  // Priority 2: Build structural selector
  const path: string[] = [];
  let current: Element | null = element;
  let depth = 0;
  const maxDepth = 5; // Prevent overly long selectors

  while (current && current.tagName !== 'HTML' && depth < maxDepth) {
    let selector = current.tagName.toLowerCase();

    // Add nth-of-type if needed for uniqueness
    const nth = getNthOfTypeIndex(current);
    if (nth > 1 || hasSiblingOfSameType(current)) {
      selector += `:nth-of-type(${nth})`;
    }

    path.unshift(selector);
    current = current.parentElement;
    depth++;
  }

  return path.join(' > ');
}

/**
 * Escape CSS selector special characters
 */
export function escapeSelector(str: string): string {
  return str.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

/**
 * Get nth-of-type index for an element
 */
export function getNthOfTypeIndex(element: Element): number {
  let index = 1;
  let sibling = element.previousElementSibling;

  while (sibling) {
    if (sibling.tagName === element.tagName) {
      index++;
    }
    sibling = sibling.previousElementSibling;
  }

  return index;
}

/**
 * Check if element has siblings of the same type
 */
export function hasSiblingOfSameType(element: Element): boolean {
  const parent = element.parentElement;
  if (!parent) return false;

  for (const child of parent.children) {
    if (child !== element && child.tagName === element.tagName) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a selector with name attribute for form elements
 */
export function generateFormElementSelector(element: Element): string {
  const tagName = element.tagName.toLowerCase();

  // For form elements, prefer name attribute
  if (isFormElement(element) && element.hasAttribute('name')) {
    const name = element.getAttribute('name')!;
    return `${tagName}[name="${escapeSelector(name)}"]`;
  }

  return generateSimpleSelector(element);
}

/**
 * Check if element is a form element
 */
export function isFormElement(element: Element): boolean {
  const formTags = ['input', 'select', 'textarea', 'button'];
  return formTags.includes(element.tagName.toLowerCase());
}
