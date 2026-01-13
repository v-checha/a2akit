/**
 * Express Agent Example
 * Demonstrates using @a2akit/express adapter
 */

import 'reflect-metadata';
import express from 'express';
import {
  A2AAgent,
  Skill,
  Streaming,
  TextPart,
} from '@a2akit/core';
import { createA2ARouter, a2aErrorHandler } from '@a2akit/express';

/**
 * A calculator agent using Express
 */
@A2AAgent({
  name: 'Calculator Agent',
  description: 'A simple calculator agent that performs basic math operations',
  version: '1.0.0',
})
class CalculatorAgent {
  /**
   * Add two numbers
   */
  @Skill({
    id: 'add',
    name: 'Add',
    description: 'Add two numbers (format: "a + b")',
    tags: ['math', 'arithmetic'],
    examples: ['3 + 5', '10 + 20'],
  })
  async add(@TextPart() input: string): Promise<string> {
    const match = input.match(/(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      return 'Please provide two numbers in format: "a + b"';
    }
    const [, a, b] = match;
    const result = parseFloat(a!) + parseFloat(b!);
    return `${a} + ${b} = ${result}`;
  }

  /**
   * Subtract two numbers
   */
  @Skill({
    id: 'subtract',
    name: 'Subtract',
    description: 'Subtract two numbers (format: "a - b")',
    tags: ['math', 'arithmetic'],
  })
  async subtract(@TextPart() input: string): Promise<string> {
    const match = input.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      return 'Please provide two numbers in format: "a - b"';
    }
    const [, a, b] = match;
    const result = parseFloat(a!) - parseFloat(b!);
    return `${a} - ${b} = ${result}`;
  }

  /**
   * Multiply two numbers
   */
  @Skill({
    id: 'multiply',
    name: 'Multiply',
    description: 'Multiply two numbers (format: "a * b")',
    tags: ['math', 'arithmetic'],
  })
  async multiply(@TextPart() input: string): Promise<string> {
    const match = input.match(/(-?\d+(?:\.\d+)?)\s*\*\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      return 'Please provide two numbers in format: "a * b"';
    }
    const [, a, b] = match;
    const result = parseFloat(a!) * parseFloat(b!);
    return `${a} * ${b} = ${result}`;
  }

  /**
   * Divide two numbers
   */
  @Skill({
    id: 'divide',
    name: 'Divide',
    description: 'Divide two numbers (format: "a / b")',
    tags: ['math', 'arithmetic'],
  })
  async divide(@TextPart() input: string): Promise<string> {
    const match = input.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      return 'Please provide two numbers in format: "a / b"';
    }
    const [, a, b] = match;
    const divisor = parseFloat(b!);
    if (divisor === 0) {
      return 'Error: Division by zero';
    }
    const result = parseFloat(a!) / divisor;
    return `${a} / ${b} = ${result}`;
  }

  /**
   * Evaluate a simple math expression with streaming steps
   */
  @Skill({
    id: 'evaluate',
    name: 'Evaluate',
    description: 'Evaluate a math expression step by step',
    tags: ['math', 'streaming'],
  })
  @Streaming()
  async *evaluate(@TextPart() expression: string): AsyncGenerator<string> {
    yield `Evaluating: ${expression}\n\n`;

    // Simple tokenizer for basic expressions
    const tokens = expression.match(/(-?\d+(?:\.\d+)?|[+\-*/()])/g);
    if (!tokens) {
      yield 'Invalid expression format.\n';
      return;
    }

    yield `Tokens: ${tokens.join(' ')}\n\n`;

    try {
      // Very basic evaluation (unsafe for production!)
      // Only allows numbers and basic operators
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      if (sanitized !== expression.replace(/\s/g, '')) {
        yield 'Expression contains invalid characters.\n';
        return;
      }

      // Use Function constructor for evaluation (demo only)
      const result = new Function(`return ${sanitized}`)();

      await new Promise(r => setTimeout(r, 500));
      yield `Step 1: Parse expression\n`;

      await new Promise(r => setTimeout(r, 500));
      yield `Step 2: Validate tokens\n`;

      await new Promise(r => setTimeout(r, 500));
      yield `Step 3: Compute result\n\n`;

      yield `Result: ${expression} = ${result}`;
    } catch (error) {
      yield `Error evaluating expression: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}

// Create Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount A2A router at /a2a
app.use('/a2a', createA2ARouter(CalculatorAgent, { basePath: '/a2a' }));

// Error handler
app.use(a2aErrorHandler);

// Start server
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Calculator Agent (Express) running at http://${HOST}:${PORT}`);
  console.log('');
  console.log('Test commands:');
  console.log('');
  console.log('# Get Agent Card');
  console.log(`curl http://${HOST}:${PORT}/a2a/.well-known/agent.json | jq`);
  console.log('');
  console.log('# Add numbers');
  console.log(`curl -X POST http://${HOST}:${PORT}/a2a \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"jsonrpc":"2.0","id":"1","method":"tasks/send","params":{"id":"calc-1","message":{"role":"user","parts":[{"type":"text","text":"3 + 5"}]},"metadata":{"skillId":"add"}}}\'');
  console.log('');
  console.log('# Evaluate expression (streaming)');
  console.log(`curl -X POST http://${HOST}:${PORT}/a2a \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"jsonrpc":"2.0","id":"2","method":"tasks/sendSubscribe","params":{"id":"calc-2","message":{"role":"user","parts":[{"type":"text","text":"(2 + 3) * 4"}]},"metadata":{"skillId":"evaluate"}}}\'');
});
