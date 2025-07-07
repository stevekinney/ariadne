import { describe, it, expect, beforeEach } from 'bun:test';
import { HashIdGenerator } from './hash-id-generator.js';

describe('HashIdGenerator', () => {
  let generator: HashIdGenerator;
  let mockDocument: Document;

  beforeEach(() => {
    generator = new HashIdGenerator();
    // Create a minimal mock document
    mockDocument = {
      createElement: (tag: string) => {
        const element = {
          tagName: tag.toUpperCase(),
          getAttribute: (_attr: string) => null,
          setAttribute: (_attr: string, _value: string) => {},
          parentNode: null,
          children: [],
        } as any;
        return element;
      },
    } as any;
  });

  describe('ID Generation', () => {
    it('should generate short IDs', () => {
      const element = mockDocument.createElement('div');
      const id = generator.generateId(element);
      
      expect(id).toBeDefined();
      expect(id.length).toBeLessThanOrEqual(12); // Much shorter than UUID (36 chars)
      expect(id.length).toBeGreaterThanOrEqual(1); // At least 1 character
    });

    it('should generate consistent IDs for the same element', () => {
      const element = mockDocument.createElement('button');
      const id1 = generator.generateId(element);
      const id2 = generator.generateId(element);
      
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different elements', () => {
      const element1 = mockDocument.createElement('div');
      const element2 = mockDocument.createElement('span');
      
      const id1 = generator.generateId(element1);
      const id2 = generator.generateId(element2);
      
      expect(id1).not.toBe(id2);
    });

    it('should use only base62 characters', () => {
      const element = mockDocument.createElement('input');
      const id = generator.generateId(element);
      
      const base62Regex = /^[0-9A-Za-z]+$/;
      expect(id).toMatch(base62Regex);
    });
  });

  describe('Element Properties', () => {
    it('should consider element attributes in hash', () => {
      const element1 = mockDocument.createElement('input');
      element1.getAttribute = (attr: string) => {
        if (attr === 'type') return 'email';
        if (attr === 'name') return 'user-email';
        return null;
      };
      
      const element2 = mockDocument.createElement('input');
      element2.getAttribute = (attr: string) => {
        if (attr === 'type') return 'password';
        if (attr === 'name') return 'user-password';
        return null;
      };
      
      const id1 = generator.generateId(element1);
      const id2 = generator.generateId(element2);
      
      expect(id1).not.toBe(id2);
    });

    it('should handle elements with same tag but different positions', () => {
      const parent = mockDocument.createElement('div');
      const child1 = mockDocument.createElement('span');
      const child2 = mockDocument.createElement('span');
      
      // Mock parent-child relationships
      Object.defineProperty(parent, 'children', {
        value: [child1, child2],
        writable: true,
        configurable: true
      });
      Object.defineProperty(child1, 'parentNode', {
        value: parent,
        writable: true,
        configurable: true
      });
      Object.defineProperty(child2, 'parentNode', {
        value: parent,
        writable: true,
        configurable: true
      });
      
      const id1 = generator.generateId(child1);
      const id2 = generator.generateId(child2);
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('Uniqueness', () => {
    it('should ensure uniqueness even for similar elements', () => {
      const ids = new Set<string>();
      
      // Generate IDs for many similar elements
      for (let i = 0; i < 100; i++) {
        const element = mockDocument.createElement('div');
        const id = generator.generateId(element);
        ids.add(id);
      }
      
      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('should handle hash collisions gracefully', () => {
      // Create two elements that might have similar hashes
      const element1 = mockDocument.createElement('div');
      const element2 = mockDocument.createElement('div');
      
      // Force them to have same initial properties
      Object.defineProperty(element1, 'parentNode', {
        value: null,
        writable: true,
        configurable: true
      });
      Object.defineProperty(element2, 'parentNode', {
        value: null,
        writable: true,
        configurable: true
      });
      
      const id1 = generator.generateId(element1);
      const id2 = generator.generateId(element2);
      
      // Even if initial hash is same, final IDs should differ
      expect(id1).not.toBe(id2);
    });
  });

  describe('Cache Management', () => {
    it('should cache generated IDs', () => {
      const element = mockDocument.createElement('button');
      
      expect(generator.getCacheSize()).toBe(0);
      
      generator.generateId(element);
      expect(generator.getCacheSize()).toBe(1);
      
      // Generating again shouldn't increase cache size
      generator.generateId(element);
      expect(generator.getCacheSize()).toBe(1);
    });

    it('should clear cache properly', () => {
      const element1 = mockDocument.createElement('div');
      const element2 = mockDocument.createElement('span');
      
      generator.generateId(element1);
      generator.generateId(element2);
      expect(generator.getCacheSize()).toBe(2);
      
      generator.clearCache();
      expect(generator.getCacheSize()).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should generate IDs quickly for many elements', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const element = mockDocument.createElement('div');
        element.getAttribute = (attr: string) => {
          if (attr === 'id') return `element-${i}`;
          return null;
        };
        generator.generateId(element);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be very fast (less than 50ms for 1000 elements)
      expect(duration).toBeLessThan(50);
    });
  });
});