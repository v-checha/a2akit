# a2akit

[![npm version](https://img.shields.io/npm/v/@a2akit/core.svg)](https://www.npmjs.com/package/@a2akit/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@a2akit/core.svg)](https://nodejs.org)

A TypeScript library for creating A2A protocol servers with decorators — "NestJS for AI agents".

## Table of Contents

- [Overview](#overview)
- [Why a2akit?](#why-a2akit)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Packages](#packages)
- [API Reference](#api-reference)
- [Testing Your Agent](#testing-your-agent)
- [Examples](#examples)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [License](#license)

## Overview

a2akit provides a decorator-based API for building [A2A (Agent-to-Agent) protocol](https://a2a-protocol.org) compliant servers. It handles JSON-RPC routing, task management, SSE streaming, and Agent Card generation automatically.

## Why a2akit?

- **Decorator-based API**: Define agents and skills using familiar TypeScript decorators
- **Zero runtime dependencies**: Core library has no external runtime dependencies
- **Framework agnostic**: Built-in HTTP server, plus Express and Fastify adapters
- **Full A2A protocol support**: Tasks, streaming (SSE), Agent Cards, and more
- **Type-safe**: Full TypeScript support with comprehensive types
- **Easy to test**: Simple APIs that are straightforward to unit test

## Installation

```bash
# Core library (zero runtime deps, only reflect-metadata as peer)
npm install @a2akit/core reflect-metadata

# Optional: Express adapter
npm install @a2akit/express express

# Optional: Fastify adapter
npm install @a2akit/fastify fastify
```

## Quick Start

```typescript
import 'reflect-metadata';
import { A2AAgent, Skill, Streaming, TextPart, A2AServer } from '@a2akit/core';

@A2AAgent({
  name: 'Hello Agent',
  description: 'A simple greeting agent',
  version: '1.0.0',
})
class HelloAgent {
  @Skill({
    id: 'greet',
    name: 'Greet',
    description: 'Greet the user',
    tags: ['greeting'],
  })
  async greet(@TextPart() name: string): Promise<string> {
    return `Hello, ${name}!`;
  }

  @Skill({
    id: 'count',
    name: 'Count',
    description: 'Count with streaming',
    tags: ['demo'],
  })
  @Streaming()
  async *count(@TextPart() input: string): AsyncGenerator<string> {
    const max = parseInt(input, 10) || 5;
    for (let i = 1; i <= max; i++) {
      await new Promise(r => setTimeout(r, 500));
      yield `Counting: ${i}...`;
    }
    yield `Done!`;
  }
}

// Start the server
const server = new A2AServer(HelloAgent, { port: 3000 });
server.listen();
```

## Packages

| Package | Description | NPM |
|---------|-------------|-----|
| [@a2akit/core](./packages/core) | Core library with decorators, types, and built-in server | [![npm](https://img.shields.io/npm/v/@a2akit/core.svg)](https://www.npmjs.com/package/@a2akit/core) |
| [@a2akit/express](./packages/express) | Express.js adapter | [![npm](https://img.shields.io/npm/v/@a2akit/express.svg)](https://www.npmjs.com/package/@a2akit/express) |
| [@a2akit/fastify](./packages/fastify) | Fastify adapter | [![npm](https://img.shields.io/npm/v/@a2akit/fastify.svg)](https://www.npmjs.com/package/@a2akit/fastify) |

## API Reference

### Decorators

#### `@A2AAgent(options)`

Class decorator for marking a class as an A2A agent.

```typescript
@A2AAgent({
  name: string;              // Agent name
  description: string;       // Agent description
  version: string;           // Agent version
  provider?: {               // Optional provider info
    organization: string;
    url?: string;
  };
  defaultInputModes?: string[];  // Default: ['text']
  defaultOutputModes?: string[]; // Default: ['text']
})
```

#### `@Skill(options)`

Method decorator for marking a method as a skill.

```typescript
@Skill({
  id?: string;              // Skill ID (defaults to method name)
  name: string;             // Display name
  description: string;      // Skill description
  tags?: string[];          // Tags for categorization
  examples?: string[];      // Example inputs
  inputModes?: string[];    // Override default input modes
  outputModes?: string[];   // Override default output modes
})
```

#### `@Streaming()`

Method decorator for marking a skill as streaming. Must return `AsyncGenerator<string>`.

```typescript
@Skill({ name: 'Stream', description: '...' })
@Streaming()
async *mySkill(@TextPart() input: string): AsyncGenerator<string> {
  yield 'chunk 1';
  yield 'chunk 2';
}
```

#### Parameter Decorators

| Decorator | Description |
|-----------|-------------|
| `@TextPart(index?)` | Extract text from message parts |
| `@FilePart(index?)` | Extract file content from message parts |
| `@DataPart(index?)` | Extract structured data from message parts |
| `@Message()` | Get the full Message object |
| `@TaskContext()` | Get the full Task object |
| `@Parts()` | Get all message parts |

### Server Options

#### Built-in Server

```typescript
import { A2AServer } from '@a2akit/core';

const server = new A2AServer(MyAgent, {
  port: 3000,        // Default: 3000
  host: 'localhost', // Default: 'localhost'
  basePath: '',      // Default: ''
});

await server.listen();
```

#### Express Adapter

```typescript
import express from 'express';
import { createA2ARouter } from '@a2akit/express';

const app = express();
app.use(express.json());
app.use('/a2a', createA2ARouter(MyAgent, { basePath: '/a2a' }));
app.listen(3000);
```

#### Fastify Adapter

```typescript
import Fastify from 'fastify';
import { createA2APlugin } from '@a2akit/fastify';

const fastify = Fastify();
fastify.register(createA2APlugin(MyAgent), { prefix: '/a2a' });
fastify.listen({ port: 3000 });
```

## Testing Your Agent

### Get Agent Card

```bash
curl http://localhost:3000/.well-known/agent.json | jq
```

### Send a Message

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tasks/send",
    "params": {
      "id": "task-123",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "World"}]
      },
      "metadata": {
        "skillId": "greet"
      }
    }
  }'
```

### Streaming Request

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "2",
    "method": "tasks/sendSubscribe",
    "params": {
      "id": "task-456",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "5"}]
      },
      "metadata": {
        "skillId": "count"
      }
    }
  }'
```

## Examples

### Basic Agent

See [examples/hello-agent](./examples/hello-agent) for a basic example.

### Express Integration

See [examples/express-agent](./examples/express-agent) for an Express.js example.

## Project Structure

```
a2akit/
├── packages/
│   ├── core/           # Main library (zero deps)
│   ├── express/        # Express adapter
│   └── fastify/        # Fastify adapter
└── examples/
    ├── hello-agent/    # Basic example
    └── express-agent/  # Express example
```

## Requirements

- Node.js 18+
- TypeScript 5.0+
- `reflect-metadata` package

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT
