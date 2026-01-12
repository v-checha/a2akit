# a2akit Architecture

This document describes the architecture and design of a2akit.

## Overview

a2akit is a TypeScript library for building A2A (Agent-to-Agent) protocol servers using decorators. It follows a modular architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Request                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HTTP Layer (Server)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ A2AServer   │  │ Express     │  │ Fastify                 │  │
│  │ (built-in)  │  │ Router      │  │ Plugin                  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     JSON-RPC Router                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Method Dispatch: tasks/send, tasks/get, tasks/cancel     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Request Handlers                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ SendHandler │  │ GetHandler  │  │ CancelHandler           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Skill Invoker                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Parameter Extraction → Method Invocation → Result       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Instance                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ User-defined @skill methods                              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Decorators (`packages/core/src/decorators/`)

Decorators are the primary API for defining agents and skills.

#### `@A2AAgent`
- Applied to classes
- Stores agent metadata (name, description, version, etc.)
- Uses `reflect-metadata` to store data on the class

#### `@skill`
- Applied to methods
- Registers method as an invokable skill
- Stores skill metadata (id, name, description, tags, etc.)

#### `@streaming`
- Applied to methods
- Marks a skill as returning an `AsyncGenerator<string>`
- Used for SSE streaming responses

#### Parameter Decorators
- `@textPart`, `@filePart`, `@dataPart`: Extract specific part types
- `@message`: Full message object
- `@taskContext`: Full task object
- `@parts`: All message parts

### 2. Metadata System (`packages/core/src/decorators/metadata.ts`)

Metadata is stored using `reflect-metadata`:

```typescript
// Symbol keys for metadata storage
export const AGENT_METADATA = Symbol('a2akit:agent');
export const SKILL_METADATA = Symbol('a2akit:skill');
export const STREAMING_METADATA = Symbol('a2akit:streaming');
export const PARAM_METADATA = Symbol('a2akit:params');
```

Helper functions provide type-safe access:
- `getAgentMetadata(target)`: Get agent metadata from class
- `getSkillsMetadata(target)`: Get all skill metadata from class
- `getParamMetadata(target, method)`: Get parameter metadata from method

### 3. Task Management (`packages/core/src/task/`)

#### TaskStateMachine
Enforces valid state transitions according to A2A protocol:

```
submitted → working → completed
         → canceled    → canceled
         → failed      → failed
                       → input-required → working
```

#### TaskManager
In-memory storage for tasks:
- Create, get, update, delete tasks
- State transition validation
- History and artifact management

### 4. Server Layer (`packages/core/src/server/`)

#### JsonRpcRouter
Routes JSON-RPC requests to handlers:
- Method registration and dispatch
- Error handling
- Batch request support

#### Request Handlers
Implement A2A protocol methods:
- `createSendHandler`: Execute skill and return task
- `createGetHandler`: Return task by ID
- `createCancelHandler`: Cancel a task

#### SkillInvoker
Invokes skill methods with parameter extraction:
1. Look up skill by ID
2. Extract parameters based on decorators
3. Call method on agent instance
4. Return result (string or AsyncGenerator)

#### SSEWriter
Handles Server-Sent Events for streaming:
- Write task status updates
- Write artifact chunks
- Handle connection lifecycle

### 5. Agent Card (`packages/core/src/card/`)

#### generateAgentCard
Creates Agent Card from decorated class:
1. Read agent metadata from class
2. Read skill metadata from methods
3. Detect streaming capability
4. Generate A2A-compliant card

## Protocol Flow

### Non-Streaming Request (`tasks/send`)

```
1. Client sends JSON-RPC request
2. Server validates request structure
3. Router dispatches to SendHandler
4. Handler:
   a. Creates/gets task in TaskManager
   b. Stores user message in history
   c. Transitions to "working" state
   d. Invokes skill via SkillInvoker
   e. Stores response in history
   f. Transitions to "completed" state
5. Returns task object to client
```

### Streaming Request (`tasks/sendSubscribe`)

```
1. Client sends JSON-RPC request
2. Server validates request structure
3. Server opens SSE connection
4. StreamingHandler:
   a. Creates/gets task in TaskManager
   b. Stores user message in history
   c. Transitions to "working" state
   d. Sends status update via SSE
   e. Invokes streaming skill
   f. For each yielded chunk:
      - Creates artifact chunk
      - Sends via SSE
   g. Transitions to "completed" state
   h. Sends final status update
5. Closes SSE connection
```

## Package Dependencies

```
@a2akit/core (no runtime dependencies)
    └── reflect-metadata (peer dependency)

@a2akit/express
    ├── @a2akit/core (peer)
    └── express (peer)

@a2akit/fastify
    ├── @a2akit/core (peer)
    └── fastify (peer)
```

## Extension Points

### Custom Server Integration

To integrate with other HTTP frameworks:

1. Use `generateAgentCard` for Agent Card endpoint
2. Use `JsonRpcRouter` + `createHandlers` for JSON-RPC
3. Use `SSEWriter` for streaming
4. Use `handleStreamingRequest` for `tasks/sendSubscribe`

### Custom Task Storage

To use a different storage backend:

1. Implement the `TaskManager` interface
2. Pass custom manager to handlers

## Error Handling

Errors are converted to JSON-RPC errors:

```typescript
// A2A-specific errors (-32001 to -32009)
TaskNotFoundError       // -32001
TaskNotCancelableError  // -32002
StreamingNotSupported   // -32006
// etc.

// Standard JSON-RPC errors
PARSE_ERROR            // -32700
INVALID_REQUEST        // -32600
METHOD_NOT_FOUND       // -32601
INVALID_PARAMS         // -32602
INTERNAL_ERROR         // -32603
```

## Design Decisions

### Why Decorators?
- Familiar pattern for TypeScript developers (similar to NestJS, TypeORM)
- Clean separation of metadata from logic
- Easy to understand and extend

### Why reflect-metadata?
- Standard way to attach metadata to classes/methods
- Works with TypeScript decorators
- Widely used in the ecosystem

### Why In-Memory Task Storage?
- Simple default implementation
- Easy to understand and debug
- Can be replaced with persistent storage

### Why Explicit Skill Routing?
- Clear and predictable behavior
- Avoids ambiguity in skill selection
- Easy to document and test
