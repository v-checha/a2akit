/**
 * Hello Agent Example
 * A simple A2A agent demonstrating the decorator-based API
 */

import 'reflect-metadata';
import {
  A2AAgent,
  Skill,
  Streaming,
  TextPart,
  A2AServer,
} from '@a2akit/core';

/**
 * A simple greeting agent with multiple skills
 */
@A2AAgent({
  name: 'Hello Agent',
  description: 'A simple greeting agent that demonstrates a2akit features',
  version: '1.0.0',
  provider: {
    organization: 'a2akit',
    url: 'https://github.com/a2akit',
  },
})
class HelloAgent {
  /**
   * Simple greeting skill
   */
  @Skill({
    id: 'greet',
    name: 'Greet',
    description: 'Greet the user by name',
    tags: ['greeting', 'hello'],
    examples: ['Hello, World!', 'Hi there!'],
  })
  async greet(@TextPart() name: string): Promise<string> {
    return `Hello, ${name}! Welcome to the A2A protocol.`;
  }

  /**
   * Echo skill that returns the input
   */
  @Skill({
    id: 'echo',
    name: 'Echo',
    description: 'Echo back the input message',
    tags: ['utility'],
  })
  async echo(@TextPart() input: string): Promise<string> {
    return `You said: ${input}`;
  }

  /**
   * Counting skill with streaming output
   */
  @Skill({
    id: 'count',
    name: 'Count',
    description: 'Count to a number with streaming output',
    tags: ['demo', 'streaming'],
  })
  @Streaming()
  async *count(@TextPart() input: string): AsyncGenerator<string> {
    const max = parseInt(input, 10) || 5;
    const clampedMax = Math.min(Math.max(1, max), 100);

    yield `Starting to count to ${clampedMax}...\n`;

    for (let i = 1; i <= clampedMax; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      yield `${i}... `;
    }

    yield `\nDone counting to ${clampedMax}!`;
  }

  /**
   * Info skill that returns agent information
   */
  @Skill({
    id: 'info',
    name: 'Info',
    description: 'Get information about this agent',
    tags: ['utility', 'info'],
  })
  async info(): Promise<string> {
    return [
      'Hello Agent v1.0.0',
      '',
      'Available skills:',
      '- greet: Greet the user by name',
      '- echo: Echo back the input',
      '- count: Count to a number (streaming)',
      '- info: Show this information',
      '',
      'This agent demonstrates the a2akit library features.',
    ].join('\n');
  }
}

// Start the server
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? 'localhost';

const server = new A2AServer(HelloAgent, {
  port: PORT,
  host: HOST,
});

server.listen().then(() => {
  console.log('');
  console.log('Test commands:');
  console.log('');
  console.log('# Get Agent Card');
  console.log(`curl http://${HOST}:${PORT}/.well-known/agent.json | jq`);
  console.log('');
  console.log('# Call greet skill');
  console.log(`curl -X POST http://${HOST}:${PORT} \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"jsonrpc":"2.0","id":"1","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"World"}]},"metadata":{"skillId":"greet"}}}\'');
  console.log('');
  console.log('# Call count skill (streaming)');
  console.log(`curl -X POST http://${HOST}:${PORT} \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"jsonrpc":"2.0","id":"2","method":"tasks/sendSubscribe","params":{"id":"task-2","message":{"role":"user","parts":[{"type":"text","text":"5"}]},"metadata":{"skillId":"count"}}}\'');
});
