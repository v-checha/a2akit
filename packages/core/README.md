# @a2akit/core

Core library for creating A2A (Agent-to-Agent) protocol servers with TypeScript decorators.

## Installation

```bash
npm install @a2akit/core reflect-metadata
```

## Quick Start

```typescript
import 'reflect-metadata';
import { A2AAgent, skill, textPart, A2AServer } from '@a2akit/core';

@A2AAgent({
  name: 'Greeting Agent',
  description: 'An agent that greets users',
  version: '1.0.0',
})
class GreetingAgent {
  @skill({
    name: 'Greet',
    description: 'Greet the user by name',
  })
  greet(@textPart() name: string): string {
    return `Hello, ${name}!`;
  }
}

const server = new A2AServer(GreetingAgent);
server.listen(3000);
```

## API Reference

### Decorators

#### @A2AAgent(options)

Class decorator for marking a class as an A2A Agent.

```typescript
@A2AAgent({
  name: string;              // Required: Agent name
  description: string;       // Required: Agent description
  version: string;           // Required: Agent version
  provider?: {               // Optional: Provider info
    organization: string;
    url?: string;
  };
  documentationUrl?: string; // Optional: Docs URL
  iconUrl?: string;          // Optional: Icon URL
  defaultInputModes?: string[];  // Default: ['text']
  defaultOutputModes?: string[]; // Default: ['text']
})
```

#### @skill(options)

Method decorator for marking a method as a skill.

```typescript
@skill({
  id?: string;               // Default: method name
  name: string;              // Required: Skill name
  description: string;       // Required: Skill description
  tags?: string[];           // Optional: Tags for categorization
  examples?: string[];       // Optional: Example usage
  inputModes?: string[];     // Optional: Override agent defaults
  outputModes?: string[];    // Optional: Override agent defaults
})
```

#### @streaming()

Method decorator for marking a skill as streaming.

```typescript
@skill({ name: 'Stream', description: 'Stream response' })
@streaming()
async *streamResponse(): AsyncGenerator<string> {
  yield 'Part 1...';
  yield 'Part 2...';
}
```

### Parameter Decorators

| Decorator | Description |
|-----------|-------------|
| `@textPart(index?)` | Extract text content from message |
| `@filePart(index?)` | Extract file content from message |
| `@dataPart(index?)` | Extract structured data from message |
| `@message()` | Get the full message object |
| `@taskContext()` | Get the task context |
| `@parts()` | Get all message parts |

### Server

#### A2AServer

Built-in HTTP server using Node.js `http` module.

```typescript
const server = new A2AServer(AgentClass, {
  basePath: '/api',  // Optional path prefix
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Types

#### Task

```typescript
interface Task {
  id: string;
  contextId?: string;
  status: TaskStatus;
  artifacts?: Artifact[];
  history?: Message[];
  metadata?: Record<string, unknown>;
}
```

#### Message

```typescript
interface Message {
  messageId?: string;
  role: 'user' | 'agent';
  parts: Part[];
  metadata?: Record<string, unknown>;
}
```

#### Part Types

```typescript
type Part = TextPart | FilePart | DataPart;

interface TextPart {
  type: 'text';
  text: string;
}

interface FilePart {
  type: 'file';
  file: FileContent;
}

interface DataPart {
  type: 'data';
  data: Record<string, unknown> | unknown[];
}
```

### Task Management

#### TaskManager

In-memory task storage and lifecycle management.

```typescript
const manager = new TaskManager();

// Create task
const task = manager.create({ id: 'task-1' });

// Update status
manager.setWorking('task-1');
manager.setCompleted('task-1', message);

// Query
const task = manager.get('task-1');
const task = manager.getOrThrow('task-1');
```

### Errors

| Error Class | Description |
|-------------|-------------|
| `A2AError` | Base error class |
| `TaskNotFoundError` | Task not found |
| `TaskNotCancelableError` | Task cannot be canceled |
| `InvalidStateTransitionError` | Invalid state transition |
| `SkillNotFoundError` | Skill not found |
| `InvalidParamsError` | Invalid parameters |

### Utilities

#### generateAgentCard

Generate an Agent Card from a decorated class.

```typescript
const card = generateAgentCard(AgentClass, {
  baseUrl: 'http://localhost:3000',
});
```

#### Validation Functions

```typescript
import { validateMessage, validatePart, isValidMessage } from '@a2akit/core';

validateMessage(message);  // Throws on invalid
isValidMessage(message);   // Returns boolean
```

## Examples

### Basic Agent

```typescript
@A2AAgent({
  name: 'Calculator',
  description: 'A simple calculator',
  version: '1.0.0',
})
class Calculator {
  @skill({ name: 'Add', description: 'Add two numbers' })
  add(@dataPart() data: { a: number; b: number }): string {
    return `Result: ${data.a + data.b}`;
  }
}
```

### Streaming Agent

```typescript
@A2AAgent({
  name: 'Counter',
  description: 'Counts to a number',
  version: '1.0.0',
})
class Counter {
  @skill({ name: 'Count', description: 'Count to N' })
  @streaming()
  async *count(@textPart() input: string): AsyncGenerator<string> {
    const n = parseInt(input, 10);
    for (let i = 1; i <= n; i++) {
      yield `${i}...`;
      await new Promise(r => setTimeout(r, 100));
    }
    yield 'Done!';
  }
}
```

## License

MIT
