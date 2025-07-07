import { describe, it, expect } from 'bun:test';
import './test-setup.js'; // Import DOM setup before other imports
import { Ariadne, extractSemanticMap } from './index.js';
import type { AriadneConfiguration } from './types/ariadne.js';
import { HashIdGenerator } from './worker/hash-id-generator.js';

describe('New Ariadne Features', () => {
  describe('Hash ID Generator', () => {
    it('should generate shorter IDs than UUIDs', () => {
      const generator = new HashIdGenerator();
      const mockElement = { tagName: 'DIV', getAttribute: () => null } as any;
      
      const id = generator.generateId(mockElement);
      
      // Hash IDs should be much shorter than UUIDs (36 chars)
      expect(id.length).toBeLessThanOrEqual(12);
      expect(id.length).toBeGreaterThanOrEqual(1); // At least 1 character
    });

    it('should generate valid base62 IDs', () => {
      const generator = new HashIdGenerator();
      const mockElement = { tagName: 'INPUT', getAttribute: () => null } as any;
      
      const id = generator.generateId(mockElement);
      
      // Should only contain alphanumeric characters
      expect(id).toMatch(/^[0-9A-Za-z]+$/);
    });
  });

  describe('Element Processing Callbacks', () => {
    it('should call onElementProcess during extraction', async () => {
      if (typeof Worker === 'undefined') {
        console.warn('⚠️  Skipping Worker-dependent tests');
        return;
      }

      const processedElements: Array<{ element: Element; id: string }> = [];
      
      const config: AriadneConfiguration = {
        onElementProcess: (element: Element, id: string) => {
          processedElements.push({ element, id });
        },
      };

      // Create a test document
      const doc = createTestDocument();
      
      const client = new Ariadne(config);
      try {
        await client.extract(doc);
        
        // Should have processed some elements
        expect(processedElements.length).toBeGreaterThan(0);
        
        // Each processed element should have a valid ID
        processedElements.forEach(({ id }) => {
          expect(id).toMatch(/^[0-9A-Za-z]+$/);
          expect(id.length).toBeLessThanOrEqual(12);
        });
      } finally {
        client.terminate();
      }
    });

    it('should mark elements when markElements is true', async () => {
      if (typeof Worker === 'undefined') return;

      const config: AriadneConfiguration = {
        markElements: true,
        elementAttribute: 'data-test-id',
      };

      const doc = createTestDocument();
      const client = new Ariadne(config);
      
      try {
        await client.extract(doc);
        
        // Check that elements were marked
        const markedElements = doc.querySelectorAll('[data-test-id]');
        expect(markedElements.length).toBeGreaterThan(0);
        
        // Each marked element should have a valid ID
        markedElements.forEach((element) => {
          const id = element.getAttribute('data-test-id');
          expect(id).toMatch(/^[0-9A-Za-z]+$/);
        });
      } finally {
        client.terminate();
      }
    });
  });

  describe('Output Format Options', () => {
    it('should return elements as object when elementsAsObject is true', async () => {
      if (typeof Worker === 'undefined') return;

      const config: AriadneConfiguration = {
        elementsAsObject: true,
      };

      const doc = createTestDocument();
      const map = await extractSemanticMap(doc, config);
      
      // Should have elementsById instead of elements
      expect(map.elementsById).toBeDefined();
      expect(map.elements).toBeUndefined();
      
      // elementsById should be an object
      expect(typeof map.elementsById).toBe('object');
      
      // Each value should be an element with matching ID
      if (map.elementsById) {
        Object.entries(map.elementsById).forEach(([id, element]) => {
          expect(element.id).toBe(id);
        });
      }
    });

    it('should include elementIds array when includeElementIds is true', async () => {
      if (typeof Worker === 'undefined') return;

      const config: AriadneConfiguration = {
        includeElementIds: true,
      };

      const doc = createTestDocument();
      const map = await extractSemanticMap(doc, config);
      
      // Should have elementIds array
      expect(map.elementIds).toBeDefined();
      expect(Array.isArray(map.elementIds)).toBe(true);
      
      // Should have same number of IDs as elements
      if (map.elementsById && map.elementIds) {
        expect(map.elementIds.length).toBe(Object.keys(map.elementsById).length);
      }
    });

    it('should use compact mode correctly', async () => {
      if (typeof Worker === 'undefined') return;

      const config: AriadneConfiguration = {
        compact: true,
      };

      const doc = createTestDocument();
      const map = await extractSemanticMap(doc, config);
      
      // In compact mode, should use array format and no IDs array
      expect(map.elements).toBeDefined();
      expect(map.elementsById).toBeUndefined();
      expect(map.elementIds).toBeUndefined();
    });

    it('should respect explicit settings over compact defaults', async () => {
      if (typeof Worker === 'undefined') return;

      const config: AriadneConfiguration = {
        compact: true,
        elementsAsObject: true, // Override compact default
        includeElementIds: true, // Override compact default
      };

      const doc = createTestDocument();
      const map = await extractSemanticMap(doc, config);
      
      // Should respect explicit settings
      expect(map.elementsById).toBeDefined();
      expect(map.elements).toBeUndefined();
      expect(map.elementIds).toBeDefined();
    });
  });
});

// Helper function to create a test document
function createTestDocument(): Document {
  // Create a test document with happy-dom
  const doc = document.implementation.createHTMLDocument('Test');
  doc.body.innerHTML = `
    <form id="test-form">
      <input type="text" name="username" />
      <input type="email" name="email" />
      <button type="submit">Submit</button>
    </form>
    <a href="/test">Test Link</a>
    <h1>Test Heading</h1>
  `;
  
  // Ensure the document has the required properties for validation
  if (!doc.location) {
    (doc as any).location = {
      href: 'http://localhost/test',
      origin: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/test',
      search: '',
      hash: ''
    };
  }
  
  return doc;
}