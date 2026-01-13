/**
 * @Skill and @Streaming method decorators
 */

import 'reflect-metadata';
import {
  SKILL_METADATA,
  STREAMING_METADATA,
  type SkillMetadata,
} from './metadata.js';

/**
 * Options for the @Skill decorator
 */
export interface SkillOptions {
  /** Skill ID (defaults to method name) */
  id?: string;
  /** Skill display name */
  name: string;
  /** Skill description */
  description: string;
  /** Tags for categorization */
  tags?: string[];
  /** Example usage strings */
  examples?: string[];
  /** Input MIME types (overrides agent default) */
  inputModes?: string[];
  /** Output MIME types (overrides agent default) */
  outputModes?: string[];
}

/**
 * Method decorator for marking a method as a skill
 *
 * @example
 * ```typescript
 * @Skill({
 *   name: 'Greet',
 *   description: 'Greet the user',
 *   tags: ['greeting']
 * })
 * async greet(@TextPart() name: string): Promise<string> {
 *   return `Hello, ${name}!`;
 * }
 * ```
 */
export function Skill(options: SkillOptions): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void {
    const methodName = String(propertyKey);
    const constructor = target.constructor;

    // Get existing skills or initialize empty array
    const existingSkills: SkillMetadata[] =
      Reflect.getMetadata(SKILL_METADATA, constructor) || [];

    // Check if streaming was already set on this method
    const isStreaming = Reflect.getMetadata(STREAMING_METADATA, target, propertyKey) === true;

    const skillMetadata: SkillMetadata = {
      id: options.id ?? methodName,
      name: options.name,
      description: options.description,
      tags: options.tags,
      examples: options.examples,
      inputModes: options.inputModes,
      outputModes: options.outputModes,
      methodName,
      isStreaming,
    };

    // Add to skills array
    existingSkills.push(skillMetadata);
    Reflect.defineMetadata(SKILL_METADATA, existingSkills, constructor);
  };
}

/**
 * Method decorator for marking a skill as streaming
 * Must be used together with @Skill
 *
 * @example
 * ```typescript
 * @Skill({ name: 'Stream', description: 'Stream response' })
 * @Streaming()
 * async *streamResponse(@TextPart() input: string): AsyncGenerator<string> {
 *   yield 'Part 1...';
 *   yield 'Part 2...';
 * }
 * ```
 */
export function Streaming(): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void {
    // Mark method as streaming
    Reflect.defineMetadata(STREAMING_METADATA, true, target, propertyKey);

    // Update existing skill metadata if it exists
    const constructor = target.constructor;
    const existingSkills: SkillMetadata[] =
      Reflect.getMetadata(SKILL_METADATA, constructor) || [];

    const methodName = String(propertyKey);
    const skillIndex = existingSkills.findIndex(s => s.methodName === methodName);

    if (skillIndex !== -1) {
      existingSkills[skillIndex]!.isStreaming = true;
      Reflect.defineMetadata(SKILL_METADATA, existingSkills, constructor);
    }
  };
}
