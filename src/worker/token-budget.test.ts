import { beforeEach, describe, expect, it } from 'bun:test';

import type { ThreadlineElement } from '../types/threadline.js';
import { TokenBudgetManager } from './token-budget.js';

describe('TokenBudgetManager', () => {
  let manager: TokenBudgetManager;

  beforeEach(() => {
    manager = new TokenBudgetManager(1000); // Small budget for testing
  });

  it('should initialize with base token count', () => {
    expect(manager.getCurrentTokens()).toBe(50); // Base structure
    expect(manager.getRemainingTokens()).toBe(950);
    expect(manager.isExceeded()).toBe(false);
  });

  it('should add tokens for elements', () => {
    const element: ThreadlineElement = {
      id: '12345678',
      role: 'input',
      label: 'Email Address',
      selector: '#email-input',
      parentId: 'abcdef12',
    };

    const tokensBefore = manager.getCurrentTokens();
    manager.addElement(element);
    const tokensAfter = manager.getCurrentTokens();

    // Should have added tokens (exact amount depends on improved algorithm)
    expect(tokensAfter).toBeGreaterThan(tokensBefore);
    expect(tokensAfter - tokensBefore).toBeGreaterThan(10); // Should be reasonable
    expect(tokensAfter - tokensBefore).toBeLessThan(50); // But not excessive
  });

  it('should detect budget exceeded', () => {
    const largeElement: ThreadlineElement = {
      id: '12345678',
      role: 'paragraph',
      label: 'A'.repeat(4000), // Very large label to ensure budget exceeded
      selector: 'p:nth-of-type(1)',
      parentId: null,
    };

    manager.addElement(largeElement);

    expect(manager.isExceeded()).toBe(true);
    expect(manager.getCurrentTokens()).toBeLessThanOrEqual(1000);
  });

  it('should stop counting after budget exceeded', () => {
    // Fill up the budget
    const largeElement: ThreadlineElement = {
      id: '12345678',
      role: 'paragraph',
      label: 'A'.repeat(4000), // Ensure budget is exceeded
      selector: 'p',
      parentId: null,
    };

    manager.addElement(largeElement);
    expect(manager.isExceeded()).toBe(true);
    const tokensAfterExceeded = manager.getCurrentTokens();

    // Try to add more
    manager.addElement({
      id: '87654321',
      role: 'input',
      selector: 'input',
      parentId: null,
    });

    // Token count should not increase
    expect(manager.getCurrentTokens()).toBe(tokensAfterExceeded);
  });

  it('should calculate statistics correctly', () => {
    const element: ThreadlineElement = {
      id: '12345678',
      role: 'input',
      selector: 'input',
      parentId: null,
    };

    manager.addElement(element);

    const stats = manager.getStats();
    expect(stats.budget).toBe(1000);
    expect(stats.used).toBeGreaterThan(50);
    expect(stats.percentage).toBeGreaterThan(5);
    expect(stats.percentage).toBeLessThan(100);
    expect(stats.exceeded).toBe(false);
  });

  it('should reset properly', () => {
    const element: ThreadlineElement = {
      id: '12345678',
      role: 'input',
      selector: 'input',
      parentId: null,
    };

    manager.addElement(element);
    expect(manager.getCurrentTokens()).toBeGreaterThan(50);

    manager.reset();
    expect(manager.getCurrentTokens()).toBe(50);
    expect(manager.isExceeded()).toBe(false);
  });

  it('should handle complex elements with all properties', () => {
    const complexElement: ThreadlineElement = {
      id: '12345678',
      role: 'input',
      label: 'Email Address',
      selector: 'form > div:nth-child(2) > input[type="email"]',
      parentId: 'abcdef12',
      children: ['child1', 'child2', 'child3'],
      state: {
        value: 'user@example.com',
        disabled: false,
        required: true,
      },
      href: 'https://example.com/submit',
    };

    const tokensBefore = manager.getCurrentTokens();
    manager.addElement(complexElement);
    const tokensAfter = manager.getCurrentTokens();

    // Complex element should add significant tokens
    expect(tokensAfter - tokensBefore).toBeGreaterThan(50);
  });

  it('should provide accurate remaining tokens', () => {
    expect(manager.getRemainingTokens()).toBe(950);

    const element: ThreadlineElement = {
      id: '12345678',
      role: 'button',
      label: 'Click me',
      selector: 'button',
      parentId: null,
    };

    manager.addElement(element);
    const tokensUsed = manager.getCurrentTokens() - 50;
    expect(manager.getRemainingTokens()).toBe(950 - tokensUsed);
  });
});
