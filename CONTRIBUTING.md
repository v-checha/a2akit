# Contributing to a2akit

Thank you for your interest in contributing to a2akit! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 9+
- TypeScript 5+

### Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/a2akit/a2akit.git
   cd a2akit
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

4. Run tests:
   ```bash
   pnpm test
   ```

## Project Structure

```
a2akit/
├── packages/
│   ├── core/           # Core library
│   ├── express/        # Express adapter
│   └── fastify/        # Fastify adapter
├── examples/
│   ├── hello-agent/    # Basic example
│   └── express-agent/  # Express example
├── scripts/            # Build and publish scripts
└── docs/               # Additional documentation
```

## Development Workflow

### Making Changes

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes following the code style guide below

3. Add tests for new functionality

4. Ensure all tests pass:
   ```bash
   pnpm test
   ```

5. Build to check for TypeScript errors:
   ```bash
   pnpm build
   ```

### Code Style Guide

- Use TypeScript for all code
- Follow existing code patterns and naming conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Prefer composition over inheritance

### TypeScript Guidelines

- Avoid using `any` type - use proper types or `unknown`
- Use type inference where appropriate
- Export types explicitly using `export type`
- Use interfaces for object shapes, types for unions

### Testing Requirements

- All new code must have tests
- Aim for 100% test coverage
- Use descriptive test names
- Test edge cases and error scenarios

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests for a specific package
cd packages/core && pnpm test
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md with your changes
5. Create a Pull Request with a clear description

### PR Title Format

Use a descriptive title that summarizes the change:

- `feat: add new feature`
- `fix: resolve issue with X`
- `docs: update README`
- `refactor: improve code structure`
- `test: add tests for X`

### PR Description

Include:
- What the change does
- Why the change is needed
- Any breaking changes
- Related issues

## Reporting Issues

When reporting issues, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: How to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: Node.js version, OS, package versions
6. **Code Sample**: Minimal code to reproduce (if applicable)

## Feature Requests

For feature requests, please include:

1. **Use Case**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other solutions you've considered
4. **Examples**: Code examples showing the desired API

## Release Process

Releases are managed by maintainers using the following process:

1. Update version numbers:
   ```bash
   pnpm version:patch  # or minor, major
   ```

2. Update CHANGELOG.md

3. Create a release tag and GitHub release

4. Publish to npm:
   ```bash
   pnpm publish:all
   ```

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow project maintainer decisions

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Join discussions in PR comments

## License

By contributing to a2akit, you agree that your contributions will be licensed under the MIT License.
