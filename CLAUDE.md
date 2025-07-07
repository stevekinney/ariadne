# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development

```bash
bun run dev                # Start development with watch mode
bun run build             # Build for production (outputs to dist/)
bun run start             # Run production build
```

### Testing

```bash
bun test                  # Run all tests
bun test src/utils        # Run tests in specific directory
bun test logger          # Run tests matching pattern
bun test --watch         # Watch mode
bun test --coverage      # Generate coverage report
```

### Code Quality

```bash
bun run lint             # Check linting errors
bun run lint:fix         # Auto-fix linting errors
bun run typecheck        # TypeScript type checking
bun run format           # Format all files with Prettier
bun run format:check     # Check formatting without changes
```

### Utilities

```bash
bun run clean            # Clean build artifacts (dist/, coverage/, caches)
bun run check:env        # Validate .env against .env.example
```

## Architecture Overview

### Core Design Principles

1. **Environment-First Configuration**: All configuration starts with environment variables validated through Zod schemas in `src/configuration/environment.ts`. The `environment` object is the single source of truth.

2. **Structured Error Hierarchy**: All errors inherit from `BaseError` with specific error codes, HTTP status codes, and operational flags. This enables consistent error handling across the application.

3. **Dependency Injection Pattern**: The logger instance (`log`) is imported where needed rather than being globally available, making dependencies explicit and testable.

4. **Result Type Pattern**: The `Result<T, E>` type in `src/types/utilities.ts` provides functional error handling with `ok()` and `uhoh()` constructors.

### Key Architectural Decisions

- **No sleep.ts file**: The retry utility imports `sleep` directly from 'bun' runtime
- **Logger renamed**: The logger instance is exported as `log` (not `logger`)
- **Import paths**: All internal imports use `.js` extensions for ESM compatibility
- **Test isolation**: Tests run with `NODE_ENV=test` and logging disabled by default

### Git Hooks Architecture

The `.husky/` directory contains sophisticated git hooks:

- **utilities.sh**: Shared functions for colorful output, CI detection, and performance timing
- **Helper scripts**: `check-secrets.sh`, `check-dependencies.sh`, `validate-environment.sh`
- Hooks automatically skip in CI environments and run checks in parallel where possible

### Type System Utilities

The codebase includes advanced TypeScript utility types in `src/types/common.ts`:

- `RequireAtLeastOne<T>` - Requires at least one property from a type
- `RequireOnlyOne<T>` - Requires exactly one property from a type
- `UnionToIntersection<U>` - Converts union types to intersections
- `Prettify<T>` - Flattens type intersections for better IDE display

## Development Patterns

### Adding New Features

1. **Environment variables**: Add to `.env.example` first, then update the schema in `src/configuration/environment.ts`
2. **Error types**: Extend `BaseError` in `src/errors/custom-errors.ts` with appropriate error codes
3. **Utilities**: Create in `src/utilities/`, export from `index.ts`, add tests alongside
4. **Types**: Shared types go in `src/types/`, domain-specific types stay with their modules

### Testing Approach

- Tests use Bun's built-in test runner with `describe`, `it`, `expect`
- Test files are colocated with source files using `.test.ts` suffix
- Use test helpers from `src/test/helpers/` for common patterns
- Benchmarking available via `compareBenchmarks()` function

### Import Organization

Prettier enforces this exact order:

1. Bun built-ins (`import { sleep } from 'bun'`)
2. Node built-ins (`import { readFile } from 'node:fs'`)
3. External packages (`import { z } from 'zod'`)
4. Internal imports (`import { log } from '@/utilities/logger.js'`)
5. Relative imports (`import { BaseError } from './custom-errors.js'`)

## Bun-Specific Considerations

- Always use `bun` commands, not `npm` or `yarn`
- Prefer Bun's built-in APIs (e.g., `Bun.serve()` over Express)
- The lockfile is `bun.lockb` (binary format)
- Bun provides native TypeScript execution without compilation
- Use `bunx` for one-off package execution (like `npx`)

### Bun-Optimized Utilities

The codebase includes Bun-specific utilities for maximum performance:

1. **File Operations** (`src/utilities/bun-file.ts`):

   - `readFile()`, `writeFile()` - Using Bun.file() and Bun.write()
   - `readJSON()`, `writeJSON()` - Native JSON parsing
   - `getFileHash()` - Using Bun.CryptoHasher
   - `streamFile()` - Efficient file streaming

2. **Shell Operations** (`src/utilities/bun-shell.ts`):

   - `exec()`, `execSync()` - Cross-platform command execution
   - `commandExists()` - Check command availability
   - `execParallel()` - Run commands in parallel
   - `createTaskRunner()` - Simple task runner

3. **Performance** (`src/utilities/bun-performance.ts`):
   - `PerformanceTimer` - High-resolution timing with Bun.nanoseconds()
   - `measureAsync()`, `measureSync()` - Function timing
   - `createPerformanceMonitor()` - Statistical performance tracking
   - `forceGC()` - Manual garbage collection with Bun.gc()

### Configuration Optimizations

- **bunfig.toml**: Configured with aggressive minification, tree-shaking, and dead code elimination
- **TypeScript**: Removed Node.js types, using only Bun types
- **Testing**: Parallel test execution enabled by default
- **No peerDependencies**: TypeScript runs natively in Bun

## CI/CD Pipeline

The GitHub Actions workflow (`verify.yml`) includes:

- Parallel execution of tests, linting, and builds
- Caching for Bun dependencies and TypeScript build info
- Template placeholder detection
- Build output verification

Additional workflows:

- **pr-title.yml**: Enforces conventional commit format
- **codeql.yml**: Security scanning for JavaScript/TypeScript
