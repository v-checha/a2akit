import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { skill, streaming } from './skill.js';
import { SKILL_METADATA, STREAMING_METADATA, type SkillMetadata } from './metadata.js';

describe('@skill decorator', () => {
  it('should register skill metadata on class', () => {
    class TestAgent {
      @skill({
        name: 'Greet',
        description: 'Greet the user',
      })
      greet(): string {
        return 'Hello';
      }
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe('Greet');
    expect(skills[0]?.description).toBe('Greet the user');
    expect(skills[0]?.methodName).toBe('greet');
    expect(skills[0]?.isStreaming).toBe(false);
  });

  it('should default skill ID to method name', () => {
    class TestAgent {
      @skill({
        name: 'Echo',
        description: 'Echo input',
      })
      echo(): string {
        return '';
      }
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills[0]?.id).toBe('echo');
  });

  it('should allow custom skill ID', () => {
    class TestAgent {
      @skill({
        id: 'custom-id',
        name: 'Custom',
        description: 'Custom ID skill',
      })
      myMethod(): string {
        return '';
      }
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills[0]?.id).toBe('custom-id');
    expect(skills[0]?.methodName).toBe('myMethod');
  });

  it('should register multiple skills on same class', () => {
    class TestAgent {
      @skill({
        name: 'Skill One',
        description: 'First skill',
      })
      skillOne(): string {
        return '';
      }

      @skill({
        name: 'Skill Two',
        description: 'Second skill',
      })
      skillTwo(): string {
        return '';
      }
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills).toHaveLength(2);
    expect(skills[0]?.name).toBe('Skill One');
    expect(skills[1]?.name).toBe('Skill Two');
  });

  it('should store all optional properties', () => {
    class TestAgent {
      @skill({
        id: 'full-skill',
        name: 'Full Skill',
        description: 'A skill with all options',
        tags: ['tag1', 'tag2'],
        examples: ['Example 1', 'Example 2'],
        inputModes: ['text', 'file'],
        outputModes: ['data'],
      })
      fullSkill(): string {
        return '';
      }
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills[0]?.tags).toEqual(['tag1', 'tag2']);
    expect(skills[0]?.examples).toEqual(['Example 1', 'Example 2']);
    expect(skills[0]?.inputModes).toEqual(['text', 'file']);
    expect(skills[0]?.outputModes).toEqual(['data']);
  });

  it('should handle undefined optional properties', () => {
    class TestAgent {
      @skill({
        name: 'Minimal',
        description: 'Minimal skill',
      })
      minimal(): string {
        return '';
      }
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills[0]?.tags).toBeUndefined();
    expect(skills[0]?.examples).toBeUndefined();
    expect(skills[0]?.inputModes).toBeUndefined();
    expect(skills[0]?.outputModes).toBeUndefined();
  });
});

describe('@streaming decorator', () => {
  it('should mark method as streaming', () => {
    class TestAgent {
      @streaming()
      streamMethod(): void {}
    }

    const instance = new TestAgent();
    const isStreaming = Reflect.getMetadata(STREAMING_METADATA, instance, 'streamMethod');
    expect(isStreaming).toBe(true);
  });

  it('should mark skill as streaming when used with @skill (streaming first)', () => {
    class TestAgent {
      @streaming()
      @skill({
        name: 'Stream',
        description: 'Streaming skill',
      })
      streamSkill(): void {}
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills[0]?.isStreaming).toBe(true);
  });

  it('should mark skill as streaming when used with @skill (skill first)', () => {
    class TestAgent {
      @skill({
        name: 'Stream',
        description: 'Streaming skill',
      })
      @streaming()
      streamSkill(): void {}
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    expect(skills[0]?.isStreaming).toBe(true);
  });

  it('should not affect non-streaming skills', () => {
    class TestAgent {
      @skill({
        name: 'Normal',
        description: 'Normal skill',
      })
      normalSkill(): void {}

      @skill({
        name: 'Streaming',
        description: 'Streaming skill',
      })
      @streaming()
      streamingSkill(): void {}
    }

    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[];
    const normalSkill = skills.find(s => s.methodName === 'normalSkill');
    const streamingSkill = skills.find(s => s.methodName === 'streamingSkill');

    expect(normalSkill?.isStreaming).toBe(false);
    expect(streamingSkill?.isStreaming).toBe(true);
  });

  it('should handle streaming without existing skill', () => {
    class TestAgent {
      @streaming()
      justStreaming(): void {}
    }

    const instance = new TestAgent();
    const isStreaming = Reflect.getMetadata(STREAMING_METADATA, instance, 'justStreaming');
    expect(isStreaming).toBe(true);

    // No skill metadata since @skill was not applied
    const skills = Reflect.getMetadata(SKILL_METADATA, TestAgent) as SkillMetadata[] | undefined;
    expect(skills ?? []).toHaveLength(0);
  });
});
