/**
 * Simple test server for browser tests
 * Serves static files and the built library
 */

import { serve } from 'bun';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

const PORT = 6221;
const ROOT_DIR = join(import.meta.dir, '../..');

serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    // Default to index.html
    if (filePath === '/') {
      filePath = '/tests/end-to-end/fixtures/index.html';
    }

    // Security: prevent directory traversal
    if (filePath.includes('..')) {
      return new Response('Forbidden', { status: 403 });
    }

    // Map common paths
    if (filePath.startsWith('/dist/')) {
            // Already correct
    } else if (filePath.startsWith('/fixtures/')) {
      filePath = `/tests/end-to-end${filePath}`;
    } else if (!filePath.startsWith('/tests/')) {
      filePath = `/tests/end-to-end/fixtures${filePath}`;
    }

    const fullPath = join(ROOT_DIR, filePath);

    try {
      const content = await readFile(fullPath);
      const contentType = getContentType(filePath);
      
      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          // Allow CORS for testing
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error(`Failed to serve ${filePath}:`, error);
      return new Response('Not Found', { status: 404 });
    }
  },
});

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
      return 'text/html; charset=utf-8';
    case 'js':
      return 'application/javascript; charset=utf-8';
    case 'css':
      return 'text/css; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    default:
      return 'text/plain; charset=utf-8';
  }
}

console.log(`Test server running at http://localhost:${PORT}`);
console.log(`Serving files from: ${ROOT_DIR}`);