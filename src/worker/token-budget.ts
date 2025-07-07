/**
 * TokenBudgetManager - Manages token counting and budget enforcement
 * Uses a simple heuristic: JSON length / 4 ≈ token count
 */

import type { AriadneElement } from '../types/ariadne.js';

export class TokenBudgetManager {
  private budget: number;
  private currentTokens: number = 0;
  private exceeded: boolean = false;

  constructor(budget: number = 4000) {
    this.budget = budget;

    // Account for the base structure tokens
    // {"schemaVersion":"1.0","meta":{...},"elements":[],"partial":false}
    this.currentTokens = 50; // Approximate base structure
  }

  /**
   * Add an element and update token count
   */
  addElement(element: AriadneElement): void {
    if (this.exceeded || !element) return;

    const elementTokens = this.estimateTokens(element);

    if (this.currentTokens + elementTokens > this.budget) {
      this.exceeded = true;
    } else {
      this.currentTokens += elementTokens;
    }
  }

  /**
   * Check if budget has been exceeded
   */
  isExceeded(): boolean {
    return this.exceeded;
  }

  /**
   * Get current token count
   */
  getCurrentTokens(): number {
    return this.currentTokens;
  }

  /**
   * Get remaining tokens
   */
  getRemainingTokens(): number {
    return Math.max(0, this.budget - this.currentTokens);
  }

  /**
   * Estimate token count for an element using improved algorithm
   * Uses different multipliers for different content types
   */
  private estimateTokens(element: AriadneElement): number {
    if (!element) return 0;

    let totalTokens = 0;

    // Base element structure tokens (id, role, parentId, etc.)
    totalTokens += 8; // Base structure overhead

    // ID tokens (always present)
    if (element.id) {
      totalTokens += Math.ceil(element.id.length / 6); // UUIDs are efficiently tokenized
    }

    // Role tokens (typically 1 token)
    totalTokens += 1;

    // Selector tokens (CSS selectors are tokenized differently)
    if (element.selector) {
      // CSS selectors have more tokens due to punctuation
      totalTokens += Math.ceil(element.selector.length / 3);
    }

    // Label tokens (natural language, use standard ratio)
    if (element.label) {
      totalTokens += Math.ceil(element.label.length / 4);
    }

    // State object tokens
    if (element.state) {
      const stateJson = JSON.stringify(element.state);
      totalTokens += Math.ceil(stateJson.length / 4);
    }

    // Children array tokens
    if (element.children && element.children.length > 0) {
      // Array of UUIDs
      totalTokens += element.children.length * 2; // Each UUID ≈ 2 tokens in array
    }

    // Additional properties
    if (element.href) {
      // URLs are tokenized less efficiently
      totalTokens += Math.ceil(element.href.length / 3);
    }

    if (element.origin) {
      totalTokens += Math.ceil(element.origin.length / 6); // Domain names are efficient
    }

    // Metadata properties (small overhead)
    if (element.width !== undefined) totalTokens += 1;
    if (element.height !== undefined) totalTokens += 1;
    if (element.shadowClosed !== undefined) totalTokens += 1;
    if (element.stub !== undefined) totalTokens += 1;

    return totalTokens;
  }

  /**
   * Reset the token counter
   */
  reset(): void {
    this.currentTokens = 50; // Base structure
    this.exceeded = false;
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    used: number;
    budget: number;
    percentage: number;
    exceeded: boolean;
  } {
    return {
      used: this.currentTokens,
      budget: this.budget,
      percentage: (this.currentTokens / this.budget) * 100,
      exceeded: this.exceeded,
    };
  }
}
