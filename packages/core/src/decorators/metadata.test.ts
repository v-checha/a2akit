import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  AGENT_METADATA,
  SKILL_METADATA,
  STREAMING_METADATA,
  PARAM_METADATA,
  getAgentMetadata,
  getSkillsMetadata,
  getParamMetadata,
  isStreamingMethod,
  type AgentMetadata,
  type SkillMetadata,
  type ParamMetadata,
} from './metadata.js';
import { A2AAgent } from './agent.js';
import { skill, streaming } from './skill.js';
import { textPart, message } from './params.js';

describe('Metadata utilities', () => {
  describe('getAgentMetadata', () => {
    it('should return agent metadata from decorated class', () => {
      @A2AAgent({
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.0.0',
      })
      class TestAgent {}

      const metadata = getAgentMetadata(TestAgent);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('Test Agent');
      expect(metadata?.description).toBe('A test agent');
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should return undefined for non-decorated class', () => {
      class PlainClass {}

      const metadata = getAgentMetadata(PlainClass);
      expect(metadata).toBeUndefined();
    });
  });

  describe('getSkillsMetadata', () => {
    it('should return all skills from decorated class', () => {
      class TestAgent {
        @skill({ name: 'Skill One', description: 'First skill' })
        skillOne(): void {}

        @skill({ name: 'Skill Two', description: 'Second skill' })
        skillTwo(): void {}
      }

      const skills = getSkillsMetadata(TestAgent);
      expect(skills).toHaveLength(2);
      expect(skills[0]?.name).toBe('Skill One');
      expect(skills[1]?.name).toBe('Skill Two');
    });

    it('should return empty array for class without skills', () => {
      class NoSkillsAgent {}

      const skills = getSkillsMetadata(NoSkillsAgent);
      expect(skills).toEqual([]);
    });
  });

  describe('getParamMetadata', () => {
    it('should return parameter metadata from method', () => {
      class TestAgent {
        testMethod(@textPart() _text: string, @message() _msg: unknown): void {}
      }

      const instance = new TestAgent();
      const params = getParamMetadata(instance, 'testMethod');
      expect(params).toHaveLength(2);

      const textParam = params.find(p => p.type === 'text');
      const msgParam = params.find(p => p.type === 'message');

      expect(textParam).toBeDefined();
      expect(msgParam).toBeDefined();
    });

    it('should return empty array for method without parameter decorators', () => {
      class TestAgent {
        plainMethod(_arg: string): void {}
      }

      const instance = new TestAgent();
      const params = getParamMetadata(instance, 'plainMethod');
      expect(params).toEqual([]);
    });

    it('should return empty array for non-existent method', () => {
      class TestAgent {}

      const instance = new TestAgent();
      const params = getParamMetadata(instance, 'nonExistent');
      expect(params).toEqual([]);
    });
  });

  describe('isStreamingMethod', () => {
    it('should return true for streaming method', () => {
      class TestAgent {
        @streaming()
        streamMethod(): void {}
      }

      const instance = new TestAgent();
      expect(isStreamingMethod(instance, 'streamMethod')).toBe(true);
    });

    it('should return false for non-streaming method', () => {
      class TestAgent {
        normalMethod(): void {}
      }

      const instance = new TestAgent();
      expect(isStreamingMethod(instance, 'normalMethod')).toBe(false);
    });

    it('should return false for non-existent method', () => {
      class TestAgent {}

      const instance = new TestAgent();
      expect(isStreamingMethod(instance, 'nonExistent')).toBe(false);
    });
  });

  describe('Symbol keys', () => {
    it('should export unique symbol keys', () => {
      expect(typeof AGENT_METADATA).toBe('symbol');
      expect(typeof SKILL_METADATA).toBe('symbol');
      expect(typeof STREAMING_METADATA).toBe('symbol');
      expect(typeof PARAM_METADATA).toBe('symbol');

      // All should be unique
      expect(AGENT_METADATA).not.toBe(SKILL_METADATA);
      expect(SKILL_METADATA).not.toBe(STREAMING_METADATA);
      expect(STREAMING_METADATA).not.toBe(PARAM_METADATA);
    });
  });
});
