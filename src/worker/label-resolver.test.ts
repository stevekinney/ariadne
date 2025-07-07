import { beforeEach, describe, expect, it } from 'bun:test';

import { LabelResolver } from './label-resolver.js';

describe('LabelResolver', () => {
  let resolver: LabelResolver;
  let doc: Document;

  beforeEach(() => {
    // Create a basic mock document for testing
    const mockDoc = {
      querySelector: function (selector: string) {
        if (selector === 'label[for="test-input"]') {
          return {
            textContent: 'Test Label',
            querySelectorAll: () => [],
            cloneNode: () => ({ textContent: 'Test Label' }),
          };
        }
        return null;
      },
      getElementById: function (id: string) {
        if (id === 'test-id') {
          return { textContent: 'Referenced Text' };
        }
        return null;
      },
    };

    doc = mockDoc as any as Document;
    resolver = new LabelResolver(doc);
  });

  describe('Basic Label Resolution', () => {
    it('should resolve aria-label attribute', () => {
      const element = {
        getAttribute: (name: string) =>
          name === 'aria-label' ? 'ARIA Label Text' : null,
        hasAttribute: (name: string) => name === 'aria-label',
        tagName: 'INPUT',
        id: '',
        placeholder: undefined,
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
      } as any as Element;

      const result = resolver.resolve(element);
      expect(result).toBe('ARIA Label Text');
    });

    it('should resolve placeholder attribute', () => {
      const element = {
        getAttribute: (name: string) =>
          name === 'placeholder' ? 'Enter text here' : null,
        hasAttribute: (name: string) => name === 'placeholder',
        tagName: 'INPUT',
        id: '',
        placeholder: 'Enter text here',
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
      } as any as Element;

      const result = resolver.resolve(element);
      expect(result).toBe('Enter text here');
    });

    it('should resolve button text content', () => {
      const element = {
        getAttribute: () => null,
        hasAttribute: () => false,
        tagName: 'BUTTON',
        id: '',
        placeholder: undefined,
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
        textContent: '  Click Me  ',
        querySelectorAll: () => [],
        cloneNode: () => ({ textContent: '  Click Me  ', querySelectorAll: () => [] }),
      } as any as Element;

      const result = resolver.resolve(element);
      expect(result).toBe('Click Me');
    });

    it('should resolve link text content', () => {
      const element = {
        getAttribute: () => null,
        hasAttribute: () => false,
        tagName: 'A',
        id: '',
        placeholder: undefined,
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
        textContent: 'Go to page',
        querySelectorAll: () => [],
        cloneNode: () => ({ textContent: 'Go to page', querySelectorAll: () => [] }),
      } as any as Element;

      const result = resolver.resolve(element);
      expect(result).toBe('Go to page');
    });

    it('should resolve submit input value', () => {
      const element = {
        getAttribute: (name: string) => {
          if (name === 'type') return 'submit';
          if (name === 'value') return 'Submit Form';
          return null;
        },
        hasAttribute: (name: string) => ['type', 'value'].includes(name),
        tagName: 'INPUT',
        id: '',
        placeholder: undefined,
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
      } as any as Element;

      const result = resolver.resolve(element);
      expect(result).toBe('Submit Form');
    });

    it('should return undefined for elements with no labels', () => {
      const element = {
        getAttribute: () => null,
        hasAttribute: () => false,
        tagName: 'INPUT',
        id: '',
        placeholder: undefined,
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
      } as any as Element;

      const result = resolver.resolve(element);
      expect(result).toBeUndefined();
    });

    it('should prioritize explicit label over placeholder', () => {
      const element = {
        getAttribute: (name: string) => {
          if (name === 'aria-label') return 'ARIA Label';
          if (name === 'placeholder') return 'Placeholder text';
          return null;
        },
        hasAttribute: (name: string) => ['aria-label', 'placeholder'].includes(name),
        tagName: 'INPUT',
        id: '',
        placeholder: 'Placeholder text',
        previousElementSibling: null,
        nextElementSibling: null,
        parentElement: null,
      } as any as Element;

      const result = resolver.resolve(element);
      expect(result).toBe('ARIA Label');
    });
  });
});
