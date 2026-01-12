/**
 * Metadata storage infrastructure for decorators
 */

import type { Provider } from '../types/agent-card.js';

/**
 * Symbol keys for storing metadata on decorated classes and methods
 */
export const AGENT_METADATA = Symbol('a2akit:agent');
export const SKILL_METADATA = Symbol('a2akit:skill');
export const STREAMING_METADATA = Symbol('a2akit:streaming');
export const PARAM_METADATA = Symbol('a2akit:params');

/**
 * Agent metadata stored on decorated class
 */
export interface AgentMetadata {
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent version */
  version: string;
  /** Provider information */
  provider?: Provider;
  /** Documentation URL */
  documentationUrl?: string;
  /** Icon URL */
  iconUrl?: string;
  /** Default input MIME types */
  defaultInputModes?: string[];
  /** Default output MIME types */
  defaultOutputModes?: string[];
}

/**
 * Skill metadata stored on decorated methods
 */
export interface SkillMetadata {
  /** Skill ID (defaults to method name) */
  id: string;
  /** Skill display name */
  name: string;
  /** Skill description */
  description: string;
  /** Tags for categorization */
  tags?: string[];
  /** Example usage */
  examples?: string[];
  /** Input MIME types */
  inputModes?: string[];
  /** Output MIME types */
  outputModes?: string[];
  /** Method name on the class */
  methodName: string;
  /** Whether skill supports streaming */
  isStreaming: boolean;
}

/**
 * Parameter type for extraction
 */
export type ParamType = 'text' | 'file' | 'data' | 'message' | 'task' | 'parts';

/**
 * Parameter metadata for decorated parameters
 */
export interface ParamMetadata {
  /** Parameter index */
  index: number;
  /** Parameter type for extraction */
  type: ParamType;
  /** Optional part index for extracting specific part */
  partIndex?: number;
}

/**
 * Get agent metadata from a class
 */
export function getAgentMetadata(
  target: new (...args: unknown[]) => unknown
): AgentMetadata | undefined {
  return Reflect.getMetadata(AGENT_METADATA, target) as AgentMetadata | undefined;
}

/**
 * Get skill metadata from a class
 */
export function getSkillsMetadata(
  target: new (...args: unknown[]) => unknown
): SkillMetadata[] {
  return (Reflect.getMetadata(SKILL_METADATA, target) as SkillMetadata[]) || [];
}

/**
 * Get parameter metadata from a method
 */
export function getParamMetadata(
  target: object,
  methodName: string | symbol
): ParamMetadata[] {
  return (Reflect.getMetadata(PARAM_METADATA, target, methodName) as ParamMetadata[]) || [];
}

/**
 * Check if a method is marked as streaming
 */
export function isStreamingMethod(
  target: object,
  methodName: string | symbol
): boolean {
  return Reflect.getMetadata(STREAMING_METADATA, target, methodName) === true;
}
