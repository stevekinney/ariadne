// eslint.config.js
import js from '@eslint/js';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import eslintComments from 'eslint-plugin-eslint-comments';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

const commonFiles = '**/*.{js,jsx,cjs,mjs,ts,tsx}';
const tsFiles = '**/*.{ts,tsx}';
const testFiles = '**/*.{test,spec}.{js,jsx,ts,tsx}';

const commonPlugins = {
  promise,
  unicorn,
  import: importPlugin,
  'eslint-comments': eslintComments,
  'unused-imports': unusedImports,
};

const coreRules = {
  'no-restricted-syntax': ['error', 'WithStatement', 'LabeledStatement'],
  'no-console': 'off',
};

const promiseRules = {
  'promise/no-return-wrap': 'error',
  'promise/param-names': 'error',
  'promise/catch-or-return': 'error',
  'promise/no-nesting': 'warn',
  'promise/no-promise-in-callback': 'warn',
  'promise/no-callback-in-promise': 'warn',
  'promise/no-new-statics': 'error',
  'promise/no-return-in-finally': 'warn',
  'promise/valid-params': 'warn',
};

const unicornRules = {
  'unicorn/prevent-abbreviations': 'off',
  'unicorn/no-null': 'off',
  'unicorn/prefer-switch': 'warn',
  'unicorn/prefer-logical-operator-over-ternary': 'warn',
  'unicorn/no-await-expression-member': 'error',
};

const importRules = {
  'import/no-extraneous-dependencies': 'off',
  'import/order': 'off',
  'import/first': 'error',
  'import/no-duplicates': 'error',
  'import/no-cycle': 'error',
  'unused-imports/no-unused-imports': 'error',
};

const eslintCommentsRules = {
  'eslint-comments/disable-enable-pair': 'error',
  'eslint-comments/no-unlimited-disable': 'error',
  'eslint-comments/no-unused-disable': 'error',
};

const typeScriptRules = {
  ...tseslintPlugin.configs.recommended.rules,
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/consistent-type-imports': 'off',
  '@typescript-eslint/await-thenable': 'error',
};

export default [
  // Ignore patterns
  {
    ignores: [
      '**/{dist,build,coverage,.bun}/**',
      '**/node_modules/**',
      '**/*.lock',
      '**/README.md',
      '**/package.json',
    ],
  },

  // Base configuration
  js.configs.recommended,

  // Common JavaScript/TypeScript rules
  {
    files: [commonFiles],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          importAttributes: true,
        },
      },
      globals: {
        Bun: 'readonly',
        ...globals.node,
        ...globals.browser,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    plugins: commonPlugins,
    settings: {
      'import/resolver': { typescript: true },
    },
    rules: {
      ...coreRules,
      ...promiseRules,
      ...unicornRules,
      ...importRules,
      ...eslintCommentsRules,
    },
  },

  // TypeScript-specific rules
  {
    files: [tsFiles],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
    },
    rules: typeScriptRules,
  },

  // Test file overrides
  {
    files: [testFiles, 'src/test-setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
