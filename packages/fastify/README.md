# @a2akit/fastify

Fastify adapter for [@a2akit/core](https://www.npmjs.com/package/@a2akit/core) A2A protocol servers.

## Installation

```bash
npm install @a2akit/fastify @a2akit/core fastify reflect-metadata
```

## Quick Start

```typescript
import 'reflect-metadata';
import Fastify from 'fastify';
import { createA2APlugin } from '@a2akit/fastify';
import { A2AAgent, skill, textPart } from '@a2akit/core';

@A2AAgent({
  name: 'Fastify Agent',
  description: 'An agent running on Fastify',
  version: '1.0.0',
})
class MyAgent {
  @skill({
    name: 'Hello',
    description: 'Say hello',
  })
  hello(@textPart() name: string): string {
    return `Hello, ${name}!`;
  }
}

const fastify = Fastify({ logger: true });

fastify.register(createA2APlugin(MyAgent), { prefix: '/a2a' });

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`A2A server running at ${address}`);
});
```

## API Reference

### createA2APlugin(agentClass)

Creates a Fastify plugin with A2A protocol endpoints.

```typescript
import { createA2APlugin } from '@a2akit/fastify';

fastify.register(createA2APlugin(MyAgent), {
  prefix: '/a2a',  // Optional: route prefix
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefix` | `string` | `''` | Route prefix for all endpoints |

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/agent.json` | Agent Card |
| POST | `/` | JSON-RPC endpoint |

### Fastify Decoration

The plugin decorates the Fastify instance with access to the task manager:

```typescript
fastify.register(createA2APlugin(MyAgent));

// Access task manager
const taskManager = fastify.a2aTaskManager;
const task = taskManager?.get('task-id');
```

## Examples

### Basic Setup

```typescript
import 'reflect-metadata';
import Fastify from 'fastify';
import { createA2APlugin } from '@a2akit/fastify';
import { A2AAgent, skill, textPart } from '@a2akit/core';

@A2AAgent({
  name: 'Greeting Agent',
  description: 'Greets users',
  version: '1.0.0',
})
class GreetingAgent {
  @skill({ name: 'Greet', description: 'Greet by name' })
  greet(@textPart() name: string): string {
    return `Hello, ${name}!`;
  }
}

const fastify = Fastify();
fastify.register(createA2APlugin(GreetingAgent));
fastify.listen({ port: 3000 });
```

### Multiple Agents

```typescript
import Fastify from 'fastify';
import { createA2APlugin } from '@a2akit/fastify';

const fastify = Fastify();

// Mount different agents on different paths
fastify.register(createA2APlugin(GreetingAgent), { prefix: '/agents/greeting' });
fastify.register(createA2APlugin(CalculatorAgent), { prefix: '/agents/calculator' });

fastify.listen({ port: 3000 });
```

### With Logging

```typescript
import Fastify from 'fastify';
import { createA2APlugin } from '@a2akit/fastify';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
    },
  },
});

fastify.register(createA2APlugin(MyAgent), { prefix: '/a2a' });
fastify.listen({ port: 3000 });
```

### With Other Plugins

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createA2APlugin } from '@a2akit/fastify';

const fastify = Fastify();

await fastify.register(cors, {
  origin: true,
});

await fastify.register(createA2APlugin(MyAgent), { prefix: '/a2a' });

fastify.listen({ port: 3000 });
```

## Testing Your Agent

```bash
# Get Agent Card
curl http://localhost:3000/a2a/.well-known/agent.json | jq

# Call a skill
curl -X POST http://localhost:3000/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tasks/send",
    "params": {
      "id": "task-1",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "World"}]
      },
      "metadata": {"skillId": "hello"}
    }
  }'
```

## TypeScript Support

The plugin includes TypeScript declaration merging for the Fastify instance:

```typescript
declare module 'fastify' {
  interface FastifyInstance {
    a2aTaskManager?: TaskManager;
  }
}
```

## License

MIT
