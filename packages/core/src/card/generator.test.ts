import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  generateAgentCard,
  getSkillIds,
  hasSkill,
  supportsStreaming,
  PROTOCOL_VERSION,
} from './generator.js';
import { A2AAgent } from '../decorators/agent.js';
import { skill, streaming } from '../decorators/skill.js';

describe('generateAgentCard', () => {
  it('should generate agent card from decorated class', () => {
    @A2AAgent({
      name: 'Test Agent',
      description: 'A test agent',
      version: '1.0.0',
    })
    class TestAgent {
      @skill({ name: 'Greet', description: 'Greet the user' })
      greet(): string {
        return 'Hello';
      }
    }

    const card = generateAgentCard(TestAgent, { baseUrl: 'http://localhost:3000' });

    expect(card.name).toBe('Test Agent');
    expect(card.description).toBe('A test agent');
    expect(card.version).toBe('1.0.0');
    expect(card.url).toBe('http://localhost:3000');
    expect(card.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(card.skills).toHaveLength(1);
    expect(card.skills[0]?.name).toBe('Greet');
  });

  it('should include all agent metadata', () => {
    @A2AAgent({
      name: 'Full Agent',
      description: 'Agent with all options',
      version: '2.0.0',
      provider: { organization: 'Test Org', url: 'https://example.com' },
      documentationUrl: 'https://docs.example.com',
      iconUrl: 'https://example.com/icon.png',
      defaultInputModes: ['text', 'file'],
      defaultOutputModes: ['text', 'data'],
    })
    class FullAgent {}

    const card = generateAgentCard(FullAgent, { baseUrl: 'http://localhost:3000' });

    expect(card.provider).toEqual({ organization: 'Test Org', url: 'https://example.com' });
    expect(card.documentationUrl).toBe('https://docs.example.com');
    expect(card.iconUrl).toBe('https://example.com/icon.png');
    expect(card.defaultInputModes).toEqual(['text', 'file']);
    expect(card.defaultOutputModes).toEqual(['text', 'data']);
  });

  it('should include all skills', () => {
    @A2AAgent({
      name: 'Multi-Skill Agent',
      description: 'Agent with multiple skills',
      version: '1.0.0',
    })
    class MultiSkillAgent {
      @skill({ id: 'skill-1', name: 'Skill One', description: 'First skill' })
      skillOne(): void {}

      @skill({ id: 'skill-2', name: 'Skill Two', description: 'Second skill', tags: ['tag1'] })
      skillTwo(): void {}

      @skill({
        id: 'skill-3',
        name: 'Skill Three',
        description: 'Third skill',
        examples: ['Example 1'],
        inputModes: ['text'],
        outputModes: ['data'],
      })
      skillThree(): void {}
    }

    const card = generateAgentCard(MultiSkillAgent, { baseUrl: 'http://localhost:3000' });

    expect(card.skills).toHaveLength(3);

    const skill1 = card.skills.find(s => s.id === 'skill-1');
    expect(skill1?.name).toBe('Skill One');

    const skill2 = card.skills.find(s => s.id === 'skill-2');
    expect(skill2?.tags).toEqual(['tag1']);

    const skill3 = card.skills.find(s => s.id === 'skill-3');
    expect(skill3?.examples).toEqual(['Example 1']);
    expect(skill3?.inputModes).toEqual(['text']);
    expect(skill3?.outputModes).toEqual(['data']);
  });

  it('should detect streaming capability', () => {
    @A2AAgent({
      name: 'Streaming Agent',
      description: 'Agent with streaming',
      version: '1.0.0',
    })
    class StreamingAgent {
      @skill({ name: 'Normal', description: 'Normal skill' })
      normal(): void {}

      @skill({ name: 'Stream', description: 'Streaming skill' })
      @streaming()
      stream(): void {}
    }

    const card = generateAgentCard(StreamingAgent, { baseUrl: 'http://localhost:3000' });

    expect(card.capabilities.streaming).toBe(true);
  });

  it('should set streaming to false when no streaming skills', () => {
    @A2AAgent({
      name: 'Non-Streaming Agent',
      description: 'Agent without streaming',
      version: '1.0.0',
    })
    class NonStreamingAgent {
      @skill({ name: 'Normal', description: 'Normal skill' })
      normal(): void {}
    }

    const card = generateAgentCard(NonStreamingAgent, { baseUrl: 'http://localhost:3000' });

    expect(card.capabilities.streaming).toBe(false);
  });

  it('should set default capabilities', () => {
    @A2AAgent({
      name: 'Basic Agent',
      description: 'Basic agent',
      version: '1.0.0',
    })
    class BasicAgent {}

    const card = generateAgentCard(BasicAgent, { baseUrl: 'http://localhost:3000' });

    expect(card.capabilities.pushNotifications).toBe(false);
    expect(card.capabilities.stateTransitionHistory).toBe(false);
  });

  it('should allow custom protocol version', () => {
    @A2AAgent({
      name: 'Custom Version Agent',
      description: 'Agent with custom version',
      version: '1.0.0',
    })
    class CustomVersionAgent {}

    const card = generateAgentCard(CustomVersionAgent, {
      baseUrl: 'http://localhost:3000',
      protocolVersion: '0.4.0',
    });

    expect(card.protocolVersion).toBe('0.4.0');
  });

  it('should throw for non-decorated class', () => {
    class PlainClass {}

    expect(() => {
      generateAgentCard(PlainClass, { baseUrl: 'http://localhost:3000' });
    }).toThrow('Class "PlainClass" must be decorated with @A2AAgent');
  });

  it('should use default input/output modes when not specified', () => {
    @A2AAgent({
      name: 'Default Modes Agent',
      description: 'Agent with default modes',
      version: '1.0.0',
    })
    class DefaultModesAgent {}

    const card = generateAgentCard(DefaultModesAgent, { baseUrl: 'http://localhost:3000' });

    expect(card.defaultInputModes).toEqual(['text']);
    expect(card.defaultOutputModes).toEqual(['text']);
  });
});

describe('getSkillIds', () => {
  it('should return all skill IDs', () => {
    @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
    class TestAgent {
      @skill({ id: 'greet', name: 'Greet', description: 'Greet' })
      greet(): void {}

      @skill({ id: 'echo', name: 'Echo', description: 'Echo' })
      echo(): void {}
    }

    const ids = getSkillIds(TestAgent);

    expect(ids).toContain('greet');
    expect(ids).toContain('echo');
    expect(ids).toHaveLength(2);
  });

  it('should return empty array for class without skills', () => {
    @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
    class NoSkillsAgent {}

    const ids = getSkillIds(NoSkillsAgent);

    expect(ids).toEqual([]);
  });
});

describe('hasSkill', () => {
  @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
  class TestAgent {
    @skill({ id: 'greet', name: 'Greet', description: 'Greet' })
    greet(): void {}
  }

  it('should return true for existing skill', () => {
    expect(hasSkill(TestAgent, 'greet')).toBe(true);
  });

  it('should return false for non-existent skill', () => {
    expect(hasSkill(TestAgent, 'unknown')).toBe(false);
  });
});

describe('supportsStreaming', () => {
  it('should return true when agent has streaming skills', () => {
    @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
    class StreamingAgent {
      @skill({ name: 'Stream', description: 'Stream' })
      @streaming()
      stream(): void {}
    }

    expect(supportsStreaming(StreamingAgent)).toBe(true);
  });

  it('should return false when agent has no streaming skills', () => {
    @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
    class NonStreamingAgent {
      @skill({ name: 'Normal', description: 'Normal' })
      normal(): void {}
    }

    expect(supportsStreaming(NonStreamingAgent)).toBe(false);
  });

  it('should return false for agent without skills', () => {
    @A2AAgent({ name: 'Test', description: 'Test', version: '1.0.0' })
    class NoSkillsAgent {}

    expect(supportsStreaming(NoSkillsAgent)).toBe(false);
  });
});

describe('PROTOCOL_VERSION', () => {
  it('should export protocol version constant', () => {
    expect(PROTOCOL_VERSION).toBe('0.3.0');
  });
});
