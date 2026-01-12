/**
 * A2A Agent Card Types
 * Defines the structure for agent capability advertisement
 * @see https://a2a-protocol.org/latest/specification/
 */

/**
 * A skill represents a capability of the agent
 */
export interface Skill {
  /** Unique identifier for the skill */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the skill does */
  description: string;
  /** Tags for categorization */
  tags?: string[];
  /** Example inputs/usage */
  examples?: string[];
  /** Supported input MIME types (overrides agent default) */
  inputModes?: string[];
  /** Supported output MIME types (overrides agent default) */
  outputModes?: string[];
}

/**
 * Agent capabilities declaration
 */
export interface Capabilities {
  /** Whether the agent supports SSE streaming */
  streaming?: boolean;
  /** Whether the agent supports push notifications via webhooks */
  pushNotifications?: boolean;
  /** Whether the agent exposes task state transition history */
  stateTransitionHistory?: boolean;
}

/**
 * Provider/organization information
 */
export interface Provider {
  /** Organization name */
  organization: string;
  /** Organization URL */
  url?: string;
}

/**
 * Authentication scheme configuration
 */
export interface AuthenticationScheme {
  /** Scheme type (e.g., "Bearer", "Basic", "ApiKey") */
  type: string;
  /** Description of the scheme */
  description?: string;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Supported authentication schemes */
  schemes: AuthenticationScheme[];
}

/**
 * Additional interface/transport configuration
 */
export interface AgentInterface {
  /** URL for this interface */
  url: string;
  /** Protocol binding (JSONRPC, HTTP+JSON, GRPC) */
  transport: 'JSONRPC' | 'HTTP+JSON' | 'GRPC';
}

/**
 * The Agent Card - agent's capability advertisement
 */
export interface AgentCard {
  /** Human-readable agent name */
  name: string;
  /** Description of the agent's purpose */
  description: string;
  /** Base URL where the agent is hosted */
  url: string;
  /** Agent version (provider-defined format) */
  version: string;
  /** A2A protocol version supported */
  protocolVersion: string;
  /** Provider/organization information */
  provider?: Provider;
  /** Link to documentation */
  documentationUrl?: string;
  /** URL to agent icon */
  iconUrl?: string;
  /** Agent capabilities */
  capabilities: Capabilities;
  /** Default supported input MIME types */
  defaultInputModes: string[];
  /** Default supported output MIME types */
  defaultOutputModes: string[];
  /** List of agent skills */
  skills: Skill[];
  /** Authentication requirements */
  authentication?: AuthenticationConfig;
  /** Additional interfaces/transports */
  additionalInterfaces?: AgentInterface[];
}

/**
 * Partial Agent Card options for decorator configuration
 */
export interface AgentCardOptions {
  /** Human-readable agent name */
  name: string;
  /** Description of the agent's purpose */
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
