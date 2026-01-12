import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { A2AAgent, type A2AAgentOptions } from './agent.js';
import { AGENT_METADATA, type AgentMetadata } from './metadata.js';

describe('@A2AAgent decorator', () => {
  it('should apply agent metadata to class', () => {
    @A2AAgent({
      name: 'Test Agent',
      description: 'A test agent',
      version: '1.0.0',
    })
    class TestAgent {}

    const metadata = Reflect.getMetadata(AGENT_METADATA, TestAgent) as AgentMetadata;
    expect(metadata).toBeDefined();
    expect(metadata.name).toBe('Test Agent');
    expect(metadata.description).toBe('A test agent');
    expect(metadata.version).toBe('1.0.0');
  });

  it('should set default input/output modes', () => {
    @A2AAgent({
      name: 'Test Agent',
      description: 'A test agent',
      version: '1.0.0',
    })
    class TestAgent {}

    const metadata = Reflect.getMetadata(AGENT_METADATA, TestAgent) as AgentMetadata;
    expect(metadata.defaultInputModes).toEqual(['text']);
    expect(metadata.defaultOutputModes).toEqual(['text']);
  });

  it('should allow custom input/output modes', () => {
    @A2AAgent({
      name: 'Test Agent',
      description: 'A test agent',
      version: '1.0.0',
      defaultInputModes: ['text', 'file'],
      defaultOutputModes: ['text', 'data'],
    })
    class TestAgent {}

    const metadata = Reflect.getMetadata(AGENT_METADATA, TestAgent) as AgentMetadata;
    expect(metadata.defaultInputModes).toEqual(['text', 'file']);
    expect(metadata.defaultOutputModes).toEqual(['text', 'data']);
  });

  it('should store all optional properties', () => {
    const options: A2AAgentOptions = {
      name: 'Full Agent',
      description: 'An agent with all options',
      version: '2.0.0',
      provider: {
        organization: 'Test Org',
        url: 'https://example.com',
      },
      documentationUrl: 'https://docs.example.com',
      iconUrl: 'https://example.com/icon.png',
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
    };

    @A2AAgent(options)
    class FullAgent {}

    const metadata = Reflect.getMetadata(AGENT_METADATA, FullAgent) as AgentMetadata;
    expect(metadata.name).toBe('Full Agent');
    expect(metadata.description).toBe('An agent with all options');
    expect(metadata.version).toBe('2.0.0');
    expect(metadata.provider).toEqual({
      organization: 'Test Org',
      url: 'https://example.com',
    });
    expect(metadata.documentationUrl).toBe('https://docs.example.com');
    expect(metadata.iconUrl).toBe('https://example.com/icon.png');
  });

  it('should handle undefined optional properties', () => {
    @A2AAgent({
      name: 'Minimal Agent',
      description: 'Minimal options',
      version: '1.0.0',
    })
    class MinimalAgent {}

    const metadata = Reflect.getMetadata(AGENT_METADATA, MinimalAgent) as AgentMetadata;
    expect(metadata.provider).toBeUndefined();
    expect(metadata.documentationUrl).toBeUndefined();
    expect(metadata.iconUrl).toBeUndefined();
  });

  it('should handle provider without url', () => {
    @A2AAgent({
      name: 'Test Agent',
      description: 'Test',
      version: '1.0.0',
      provider: {
        organization: 'Org Only',
      },
    })
    class OrgAgent {}

    const metadata = Reflect.getMetadata(AGENT_METADATA, OrgAgent) as AgentMetadata;
    expect(metadata.provider).toEqual({ organization: 'Org Only' });
    expect(metadata.provider?.url).toBeUndefined();
  });
});
