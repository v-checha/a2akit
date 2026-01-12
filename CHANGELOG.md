# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-01-01

### Added

#### @a2akit/core
- `@A2AAgent` class decorator for defining A2A agents
- `@skill` method decorator for defining skills
- `@streaming` method decorator for streaming skills
- Parameter decorators: `@textPart`, `@filePart`, `@dataPart`, `@message`, `@taskContext`, `@parts`
- `A2AServer` built-in HTTP server
- `TaskManager` for in-memory task management
- `JsonRpcRouter` for JSON-RPC routing
- `SSEWriter` for Server-Sent Events streaming
- `generateAgentCard` for automatic Agent Card generation
- Full A2A protocol types (Task, Message, Part, Artifact, etc.)
- Error classes for A2A-specific errors
- Validation utilities for protocol data structures

#### @a2akit/express
- `createA2ARouter` function for Express integration
- `createA2AMiddleware` alias
- `a2aErrorHandler` middleware for error handling

#### @a2akit/fastify
- `createA2APlugin` function for Fastify integration
- Fastify instance decoration with `a2aTaskManager`

### Protocol Support
- A2A Protocol v0.3.0 compliance
- JSON-RPC 2.0 methods: `tasks/send`, `tasks/sendSubscribe`, `tasks/get`, `tasks/cancel`
- Agent Card endpoint at `/.well-known/agent.json`
- SSE streaming for `tasks/sendSubscribe`
- Explicit skill routing via `metadata.skillId`

[Unreleased]: https://github.com/a2akit/a2akit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/a2akit/a2akit/releases/tag/v0.1.0
