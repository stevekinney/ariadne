import { beforeEach, describe, expect, it } from 'bun:test';

import { IdGenerator } from './id-generator.js';

describe('IdGenerator', () => {
  let generator: IdGenerator;

  beforeEach(() => {
    generator = new IdGenerator();
  });

  it('should generate unique IDs for different elements', () => {
    const element1 = { tagName: 'DIV' } as Element;
    const element2 = { tagName: 'SPAN' } as Element;

    const id1 = generator.generateId(element1);
    const id2 = generator.generateId(element2);

    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
    expect(id2.length).toBeGreaterThan(0);
  });

  it('should return the same ID for the same element', () => {
    const element = { tagName: 'DIV', id: 'test' } as Element;

    const id1 = generator.generateId(element);
    const id2 = generator.generateId(element);

    expect(id1).toBe(id2);
  });

  it('should handle different element types', () => {
    const elements = [
      { tagName: 'INPUT' },
      { tagName: 'BUTTON' },
      { tagName: 'FORM' },
      { tagName: 'DIV' },
    ] as Element[];

    const ids = elements.map((el) => generator.generateId(el));
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(elements.length);
    ids.forEach((id) => expect(typeof id).toBe('string'));
  });

  it('should use cache for repeated calls', () => {
    const element = { tagName: 'INPUT', id: 'email' } as Element;

    const id1 = generator.generateId(element);
    const id2 = generator.generateId(element);
    const id3 = generator.generateId(element);

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });

  it('should clear cache properly', () => {
    const element = { tagName: 'BUTTON', id: 'submit' } as Element;

    const id1 = generator.generateId(element);
    generator.clearCache();
    const id2 = generator.generateId(element);

    expect(id1).not.toBe(id2);
  });

  it('should handle multiple generator instances independently', () => {
    const element = { tagName: 'DIV' } as Element;

    const generator1 = new IdGenerator();
    const generator2 = new IdGenerator();

    const id1 = generator1.generateId(element);
    const id2 = generator2.generateId(element);

    expect(id1).not.toBe(id2);
  });

  it('should generate valid UUID format with crypto API', () => {
    const element = { tagName: 'DIV' } as Element;
    const id = generator.generateId(element);

    // Should generate valid UUID format (v4)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(id).toHaveLength(36);
  });

  it('should work without crypto API (fallback mode)', () => {
    // Mock environment without crypto
    const originalCrypto = globalThis.crypto;
    (globalThis as any).crypto = undefined;

    try {
      const fallbackGenerator = new IdGenerator();
      const element = { tagName: 'DIV' } as Element;
      const id = fallbackGenerator.generateId(element);

      // Should still generate valid UUID format
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(id).toHaveLength(36);
      expect(typeof id).toBe('string');
    } finally {
      // Restore original crypto
      (globalThis as any).crypto = originalCrypto;
    }
  });

  it('should generate unique IDs in fallback mode', () => {
    // Mock environment without crypto
    const originalCrypto = globalThis.crypto;
    (globalThis as any).crypto = undefined;

    try {
      const fallbackGenerator = new IdGenerator();
      const element1 = { tagName: 'DIV' } as Element;
      const element2 = { tagName: 'SPAN' } as Element;

      const id1 = fallbackGenerator.generateId(element1);
      const id2 = fallbackGenerator.generateId(element2);

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      // Restore original crypto
      (globalThis as any).crypto = originalCrypto;
    }
  });

  it('should handle crypto.getRandomValues() only scenario', () => {
    // Mock environment with only getRandomValues
    const originalCrypto = globalThis.crypto;
    (globalThis as any).crypto = {
      getRandomValues: originalCrypto?.getRandomValues?.bind(originalCrypto),
      // No randomUUID method
    };

    try {
      const generator = new IdGenerator();
      const element = { tagName: 'DIV' } as Element;
      const id = generator.generateId(element);

      // Should generate valid UUID format using getRandomValues
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(id).toHaveLength(36);
    } finally {
      // Restore original crypto
      (globalThis as any).crypto = originalCrypto;
    }
  });
});
