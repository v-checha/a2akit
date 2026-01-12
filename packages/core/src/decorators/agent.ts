/**
 * @A2AAgent class decorator
 */

import 'reflect-metadata';
import { AGENT_METADATA, type AgentMetadata } from './metadata.js';

/**
 * Options for the @A2AAgent decorator
 */
export interface A2AAgentOptions {
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent version */
  version: string;
  /** Provider information */
  provider?: {
    organization: string;
    url?: string;
  };
  /** Documentation URL */
  documentationUrl?: string;
  /** Icon URL */
  iconUrl?: string;
  /** Default input MIME types (defaults to ['text']) */
  defaultInputModes?: string[];
  /** Default output MIME types (defaults to ['text']) */
  defaultOutputModes?: string[];
}

/**
 * Class decorator for marking a class as an A2A Agent
 *
 * @example
 * ```typescript
 * @A2AAgent({
 *   name: 'My Agent',
 *   description: 'An agent that does things',
 *   version: '1.0.0'
 * })
 * class MyAgent {
 *   // skills...
 * }
 * ```
 */
export function A2AAgent(options: A2AAgentOptions): ClassDecorator {
  return function (target: Function): void {
    const metadata: AgentMetadata = {
      name: options.name,
      description: options.description,
      version: options.version,
      provider: options.provider,
      documentationUrl: options.documentationUrl,
      iconUrl: options.iconUrl,
      defaultInputModes: options.defaultInputModes ?? ['text'],
      defaultOutputModes: options.defaultOutputModes ?? ['text'],
    };

    Reflect.defineMetadata(AGENT_METADATA, metadata, target);
  };
}
