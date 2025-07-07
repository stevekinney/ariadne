#!/usr/bin/env bun
/**
 * Build script for Ariadne
 * Handles bundling and type generation
 */
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const rootDir = join(import.meta.dir, '..');
const srcDir = join(rootDir, 'src');
const distDir = join(rootDir, 'dist');

// Clean and create dist directory
async function clean() {
  console.log('🧹 Cleaning dist directory...');
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
}

// Build the main library bundle
async function buildMain() {
  console.log('📦 Building main library...');

  const result = await Bun.build({
    entrypoints: [join(srcDir, 'index.ts')],
    outdir: distDir,
    target: 'browser',
    format: 'esm',
    minify: true,
    sourcemap: 'external',
    naming: {
      entry: '[name].js',
    },
    external: [],
  });

  if (!result.success) {
    console.error('❌ Build failed:', result.logs);
    process.exit(1);
  }

  console.log('✅ Main library built successfully');
  return result;
}

// Build the Web Worker separately
async function buildWorker() {
  console.log('👷 Building Web Worker...');

  const result = await Bun.build({
    entrypoints: [join(srcDir, 'ariadne.worker.ts')],
    outdir: distDir,
    target: 'browser',
    format: 'iife',
    minify: true,
    sourcemap: 'external',
    naming: {
      entry: '[name].js',
    },
  });

  if (!result.success) {
    console.error('❌ Worker build failed:', result.logs);
    process.exit(1);
  }

  console.log('✅ Web Worker built successfully');
  return result;
}

// Copy and transform TypeScript files to .d.ts
async function generateTypes() {
  console.log('🔤 Generating TypeScript declarations...');

  const glob = new Bun.Glob('**/*.ts');
  const files = [];

  for await (const file of glob.scan({ cwd: srcDir })) {
    // Skip test files
    if (file.includes('.test.') || file.includes('.spec.')) continue;
    files.push(file);
  }

  for (const file of files) {
    const srcPath = join(srcDir, file);
    const destPath = join(distDir, file.replace('.ts', '.d.ts'));

    // Create directory if needed
    await mkdir(dirname(destPath), { recursive: true });

    // Read and transform the file
    const content = await Bun.file(srcPath).text();

    // Transform imports to remove .js extensions
    const transformed = content
      // Remove .js from imports
      .replace(/from\s+['"]([^'"]+)\.js['"]/g, "from '$1'")
      // Also fix dynamic imports
      .replace(/import\(['"]([^'"]+)\.js['"]\)/g, "import('$1')")
      // Remove implementation details, keep only declarations
      .replace(
        /^export\s+(?:async\s+)?function\s+(\w+)[^{]*\{[\s\S]*?\n\}/gm,
        (match) => {
          // Extract function signature
          const signature =
            match.match(/^export\s+(?:async\s+)?function\s+(\w+)([^{]*)/)?.[0] || '';
          return signature + ';';
        },
      )
      // Convert classes to declarations
      .replace(/^export\s+class\s+(\w+)([^{]*)\{[\s\S]*?\n\}/gm, (match) => {
        // Extract class declaration and public members
        const lines = match.split('\n');
        const result = [];

        for (const line of lines) {
          if (line.includes('export class')) {
            result.push(line.replace('{', '{'));
          } else if (line.match(/^\s*(public|private|protected|readonly)/)) {
            result.push(line.endsWith(',') || line.endsWith(';') ? line : line + ';');
          } else if (line.match(/^\s*constructor/)) {
            result.push(line.replace('{', ';').replace(/\s*\{[\s\S]*?\}/, ';'));
          } else if (line.match(/^\s*(async\s+)?(\w+)\s*\(/)) {
            const methodLine = line.replace(/\s*\{[\s\S]*?\}/, ';');
            result.push(methodLine);
          }
        }
        result.push('}');
        return result.join('\n');
      });

    await Bun.write(destPath, transformed);
  }

  console.log('✅ TypeScript declarations generated');
}

// Create package.json for npm publishing
async function createPackageJson() {
  console.log('📋 Creating dist package.json...');

  const pkg = await Bun.file(join(rootDir, 'package.json')).json();

  const distPkg = {
    name: pkg.name,
    version: pkg.version,
    description: 'Semantic HTML extraction for LLM navigation',
    type: 'module',
    main: './index.js',
    module: './index.js',
    types: './index.d.ts',
    exports: {
      '.': {
        types: './index.d.ts',
        import: './index.js',
        default: './index.js',
      },
    },
    files: ['**/*.js', '**/*.js.map', '**/*.d.ts'],
    keywords: [
      'semantic',
      'html',
      'extraction',
      'llm',
      'web-scraping',
      'accessibility',
      'aria',
      'browser',
    ],
    author: pkg.author || '',
    license: pkg.license || 'MIT',
    repository: pkg.repository,
    bugs: pkg.bugs,
    homepage: pkg.homepage,
    engines: {
      node: '>=18.0.0',
    },
  };

  await Bun.write(join(distDir, 'package.json'), JSON.stringify(distPkg, null, 2));
  console.log('✅ Package.json created');
}

// Main build process
async function build() {
  console.log('🏗️  Building Ariadne...\n');

  const startTime = performance.now();

  try {
    await clean();

    const [mainResult, workerResult] = await Promise.all([buildMain(), buildWorker()]);

    await generateTypes();
    await createPackageJson();

    const buildTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log('\n📊 Build Statistics:');
    console.log(`   ⏱️  Build time: ${buildTime}s`);

    if (mainResult.outputs.length > 0) {
      const mainSize = mainResult.outputs[0]?.size;
      if (mainSize) {
        console.log(`   📦 Main bundle: ${(mainSize / 1024).toFixed(2)} KB`);
      }
    }

    if (workerResult.outputs.length > 0) {
      const workerSize = workerResult.outputs[0]?.size;
      if (workerSize) {
        console.log(`   👷 Worker bundle: ${(workerSize / 1024).toFixed(2)} KB`);
      }
    }

    console.log('\n✨ Build completed successfully!');
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build if called directly
if (import.meta.main) {
  await build();
}
