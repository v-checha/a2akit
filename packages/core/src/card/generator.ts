/**
 * Agent Card generator from decorated class metadata
 */

import 'reflect-metadata';
import type { AgentCard, Skill } from '../types/agent-card.js';
import {
  getAgentMetadata,
  getSkillsMetadata,
  type SkillMetadata,
} from '../decorators/metadata.js';

/**
 * Protocol version supported by this library
 */
export const PROTOCOL_VERSION = '0.3.0';

/**
 * Options for generating an Agent Card
 */
export interface GenerateAgentCardOptions {
  /** Base URL where the agent is hosted */
  baseUrl: string;
  /** Override protocol version */
  protocolVersion?: string;
}

/**
 * Convert skill metadata to Agent Card skill format
 */
function toSkill(meta: SkillMetadata): Skill {
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    tags: meta.tags,
    examples: meta.examples,
    inputModes: meta.inputModes,
    outputModes: meta.outputModes,
  };
}

/**
 * Generate an Agent Card from a decorated class
 *
 * @param agentClass - The decorated agent class
 * @param options - Generation options including baseUrl
 * @returns The generated Agent Card
 * @throws Error if class is not decorated with @A2AAgent
 *
 * @example
 * ```typescript
 * @A2AAgent({ name: 'My Agent', description: '...', version: '1.0.0' })
 * class MyAgent { ... }
 *
 * const card = generateAgentCard(MyAgent, { baseUrl: 'http://localhost:3000' });
 * ```
 */
export function generateAgentCard(
  agentClass: new (...args: unknown[]) => unknown,
  options: GenerateAgentCardOptions
): AgentCard {
  const agentMeta = getAgentMetadata(agentClass);

  if (!agentMeta) {
    throw new Error(
      `Class "${agentClass.name}" must be decorated with @A2AAgent`
    );
  }

  const skillsMeta = getSkillsMetadata(agentClass);
  const hasStreaming = skillsMeta.some(s => s.isStreaming);

  return {
    name: agentMeta.name,
    description: agentMeta.description,
    url: options.baseUrl,
    version: agentMeta.version,
    protocolVersion: options.protocolVersion ?? PROTOCOL_VERSION,
    provider: agentMeta.provider,
    documentationUrl: agentMeta.documentationUrl,
    iconUrl: agentMeta.iconUrl,
    defaultInputModes: agentMeta.defaultInputModes ?? ['text'],
    defaultOutputModes: agentMeta.defaultOutputModes ?? ['text'],
    capabilities: {
      streaming: hasStreaming,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    skills: skillsMeta.map(toSkill),
  };
}

/**
 * Get available skill IDs from a decorated class
 */
export function getSkillIds(
  agentClass: new (...args: unknown[]) => unknown
): string[] {
  return getSkillsMetadata(agentClass).map(s => s.id);
}

/**
 * Check if an agent class has a specific skill
 */
export function hasSkill(
  agentClass: new (...args: unknown[]) => unknown,
  skillId: string
): boolean {
  return getSkillsMetadata(agentClass).some(s => s.id === skillId);
}

/**
 * Check if an agent supports streaming
 */
export function supportsStreaming(
  agentClass: new (...args: unknown[]) => unknown
): boolean {
  return getSkillsMetadata(agentClass).some(s => s.isStreaming);
}
