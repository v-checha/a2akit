/**
 * Decorator exports for @a2akit/core
 */

// Metadata infrastructure
export {
  AGENT_METADATA,
  SKILL_METADATA,
  STREAMING_METADATA,
  PARAM_METADATA,
  type AgentMetadata,
  type SkillMetadata,
  type ParamMetadata,
  type ParamType,
  getAgentMetadata,
  getSkillsMetadata,
  getParamMetadata,
  isStreamingMethod,
} from './metadata.js';

// Class decorator
export { A2AAgent, type A2AAgentOptions } from './agent.js';

// Method decorators
export { skill, streaming, type SkillOptions } from './skill.js';

// Parameter decorators
export {
  textPart,
  filePart,
  dataPart,
  message,
  taskContext,
  parts,
} from './params.js';
