#!/usr/bin/env bun

/**
 * Browser test runner
 * Builds the project and runs Playwright tests
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = join(import.meta.dir, '../..');
const DIST_DIR = join(PROJECT_ROOT, 'dist');

function runCommand(command: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function ensureBuild(): Promise<void> {
  console.log('Checking if build exists...');
  
  const indexExists = existsSync(join(DIST_DIR, 'index.js'));
  const workerExists = existsSync(join(DIST_DIR, 'ariadne.worker.js'));
  
  if (!indexExists || !workerExists) {
    console.log('Build not found, building project...');
    await runCommand('bun', ['run', 'build']);
  } else {
    console.log('Build found, skipping build step');
  }
}

async function installPlaywright(): Promise<void> {
  console.log('Installing Playwright browsers...');
  try {
    await runCommand('bunx', ['playwright', 'install']);
  } catch {
    console.warn('Playwright install failed, continuing anyway...');
  }
}

async function runTests(): Promise<void> {
  console.log('Running browser tests...');
  
  const args = process.argv.slice(2);
  const playwrightArgs = ['playwright', 'test'];
  
  // Pass through any arguments
  if (args.length > 0) {
    playwrightArgs.push(...args);
  }
  
  await runCommand('bunx', playwrightArgs);
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting browser tests...\n');
    
    await ensureBuild();
    await installPlaywright();
    await runTests();
    
    console.log('\n✅ Browser tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Browser tests failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  void main();
}