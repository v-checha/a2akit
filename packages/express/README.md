# @a2akit/express

Express.js adapter for [@a2akit/core](https://www.npmjs.com/package/@a2akit/core) A2A protocol servers.

## Installation

```bash
npm install @a2akit/express @a2akit/core express reflect-metadata
```

## Quick Start

```typescript
import 'reflect-metadata';
import express from 'express';
import { createA2ARouter } from '@a2akit/express';
import { A2AAgent, Skill, TextPart } from '@a2akit/core';

@A2AAgent({
  name: 'Express Agent',
  description: 'An agent running on Express',
  version: '1.0.0',
})
class MyAgent {
  @Skill({
    name: 'Hello',
    description: 'Say hello',
  })
  hello(@TextPart() name: string): string {
    return `Hello, ${name}!`;
  }
}

const app = express();
app.use(express.json());
app.use('/a2a', createA2ARouter(MyAgent));

app.listen(3000, () => {
  console.log('A2A server running at http://localhost:3000');
});
```

## API Reference

### createA2ARouter(agentClass, options?)

Creates an Express Router with A2A protocol endpoints.

```typescript
import { createA2ARouter } from '@a2akit/express';

const router = createA2ARouter(MyAgent, {
  basePath: '/api/v1/a2a',  // Optional: used in Agent Card URL
});

app.use('/api/v1/a2a', router);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basePath` | `string` | `''` | Base path for Agent Card URL |

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/agent.json` | Agent Card |
| POST | `/` | JSON-RPC endpoint |

### createA2AMiddleware

Alias for `createA2ARouter` for semantic clarity.

```typescript
import { createA2AMiddleware } from '@a2akit/express';

app.use('/a2a', createA2AMiddleware(MyAgent));
```

### a2aErrorHandler

Express error handler for A2A errors.

```typescript
import { a2aErrorHandler } from '@a2akit/express';

app.use('/a2a', createA2ARouter(MyAgent));
app.use(a2aErrorHandler);
```

## Examples

### Basic Setup

```typescript
import 'reflect-metadata';
import express from 'express';
import { createA2ARouter } from '@a2akit/express';
import { A2AAgent, Skill, TextPart } from '@a2akit/core';

@A2AAgent({
  name: 'Greeting Agent',
  description: 'Greets users',
  version: '1.0.0',
})
class GreetingAgent {
  @Skill({ name: 'Greet', description: 'Greet by name' })
  greet(@TextPart() name: string): string {
    return `Hello, ${name}!`;
  }
}

const app = express();
app.use(express.json());
app.use(createA2ARouter(GreetingAgent));
app.listen(3000);
```

### With Existing Express App

```typescript
import express from 'express';
import { createA2ARouter } from '@a2akit/express';

const app = express();
app.use(express.json());

// Your existing routes
app.get('/health', (req, res) => res.send('OK'));

// Mount A2A agent on a specific path
app.use('/agents/greeting', createA2ARouter(GreetingAgent));
app.use('/agents/calculator', createA2ARouter(CalculatorAgent));

app.listen(3000);
```

### With CORS and Other Middleware

```typescript
import express from 'express';
import cors from 'cors';
import { createA2ARouter, a2aErrorHandler } from '@a2akit/express';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/a2a', createA2ARouter(MyAgent));
app.use(a2aErrorHandler);

app.listen(3000);
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

## License

MIT
