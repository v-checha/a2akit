/**
 * Skill Invoker
 * Invokes skill methods with parameter extraction
 */

import 'reflect-metadata';
import type { Message, Task, FileContent } from '../types/protocol.js';
import { isTextPart, isFilePart, isDataPart } from '../types/protocol.js';
import {
  getSkillsMetadata,
  getParamMetadata,
  type SkillMetadata,
  type ParamMetadata,
} from '../decorators/metadata.js';
import { SkillNotFoundError } from '../errors/index.js';

/**
 * Result from skill invocation
 */
export type SkillResult = string | AsyncGenerator<string, void, unknown>;

/**
 * Skill Invoker extracts parameters and invokes skill methods
 */
export class SkillInvoker {
  private skillsMap: Map<string, SkillMetadata>;
  private agentInstance: object;

  constructor(
    agentInstance: object,
    agentClass: new (...args: unknown[]) => unknown
  ) {
    this.agentInstance = agentInstance;
    const skills = getSkillsMetadata(agentClass);
    this.skillsMap = new Map(skills.map(s => [s.id, s]));
  }

  /**
   * Check if a skill exists
   */
  hasSkill(skillId: string): boolean {
    return this.skillsMap.has(skillId);
  }

  /**
   * Get skill metadata
   */
  getSkill(skillId: string): SkillMetadata | undefined {
    return this.skillsMap.get(skillId);
  }

  /**
   * Check if a skill is streaming
   */
  isStreaming(skillId: string): boolean {
    const skill = this.skillsMap.get(skillId);
    return skill?.isStreaming ?? false;
  }

  /**
   * Invoke a skill with the given message and task context
   */
  async invoke(
    skillId: string,
    message: Message,
    task: Task
  ): Promise<SkillResult> {
    const skill = this.skillsMap.get(skillId);

    if (!skill) {
      throw new SkillNotFoundError(skillId);
    }

    const args = this.extractArgs(skill.methodName, message, task);
    const method = (this.agentInstance as Record<string, Function>)[skill.methodName];

    if (typeof method !== 'function') {
      throw new Error(`Method "${skill.methodName}" not found on agent instance`);
    }

    return method.apply(this.agentInstance, args);
  }

  /**
   * Extract arguments for a skill method based on parameter decorators
   */
  private extractArgs(
    methodName: string,
    message: Message,
    task: Task
  ): unknown[] {
    const paramsMeta = getParamMetadata(this.agentInstance, methodName);

    if (paramsMeta.length === 0) {
      // No decorated params - check if method expects any args
      // Default to providing the text content as first argument
      return [this.extractText(message)];
    }

    // Sort by index and extract values
    const sortedParams = [...paramsMeta].sort((a, b) => a.index - b.index);
    const args: unknown[] = [];

    for (const param of sortedParams) {
      args[param.index] = this.extractParamValue(param, message, task);
    }

    return args;
  }

  /**
   * Extract a single parameter value based on its type
   */
  private extractParamValue(
    param: ParamMetadata,
    message: Message,
    task: Task
  ): unknown {
    switch (param.type) {
      case 'text':
        return this.extractText(message, param.partIndex);
      case 'file':
        return this.extractFile(message, param.partIndex);
      case 'data':
        return this.extractData(message, param.partIndex);
      case 'message':
        return message;
      case 'task':
        return task;
      case 'parts':
        return message.parts;
      default:
        return undefined;
    }
  }

  /**
   * Extract text content from message parts
   */
  private extractText(message: Message, partIndex?: number): string {
    if (partIndex !== undefined) {
      const part = message.parts[partIndex];
      return part && isTextPart(part) ? part.text : '';
    }

    const textPart = message.parts.find(isTextPart);
    return textPart?.text ?? '';
  }

  /**
   * Extract file content from message parts
   */
  private extractFile(message: Message, partIndex?: number): FileContent | undefined {
    if (partIndex !== undefined) {
      const part = message.parts[partIndex];
      return part && isFilePart(part) ? part.file : undefined;
    }

    const filePart = message.parts.find(isFilePart);
    return filePart?.file;
  }

  /**
   * Extract data content from message parts
   */
  private extractData(
    message: Message,
    partIndex?: number
  ): Record<string, unknown> | unknown[] | undefined {
    if (partIndex !== undefined) {
      const part = message.parts[partIndex];
      return part && isDataPart(part) ? part.data : undefined;
    }

    const dataPart = message.parts.find(isDataPart);
    return dataPart?.data;
  }
}
