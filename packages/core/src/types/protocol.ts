/**
 * A2A Protocol Types
 * Based on A2A Protocol Specification v0.3.0
 * @see https://a2a-protocol.org/latest/specification/
 */

/**
 * Task state enum representing the lifecycle of a task
 */
export type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'canceled'
  | 'failed'
  | 'unknown';

/**
 * Text content part
 */
export interface TextPart {
  type: 'text';
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * File content with either URI or base64 bytes
 */
export interface FileContent {
  /** File name */
  name?: string;
  /** MIME type of the file */
  mimeType?: string;
  /** Base64-encoded file content */
  bytes?: string;
  /** URI reference to the file */
  uri?: string;
}

/**
 * File content part
 */
export interface FilePart {
  type: 'file';
  file: FileContent;
  metadata?: Record<string, unknown>;
}

/**
 * Structured data part
 */
export interface DataPart {
  type: 'data';
  data: Record<string, unknown> | unknown[];
  metadata?: Record<string, unknown>;
}

/**
 * Union type for message parts
 */
export type Part = TextPart | FilePart | DataPart;

/**
 * Message role - either user or agent
 */
export type MessageRole = 'user' | 'agent';

/**
 * A message in the conversation
 */
export interface Message {
  /** Message identifier */
  messageId?: string;
  /** Role of the message sender */
  role: MessageRole;
  /** Content parts of the message */
  parts: Part[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Task status containing current state and optional message
 */
export interface TaskStatus {
  /** Current task state */
  state: TaskState;
  /** Optional status message */
  message?: Message;
  /** ISO 8601 timestamp */
  timestamp?: string;
}

/**
 * An artifact produced by the agent
 */
export interface Artifact {
  /** Artifact identifier */
  artifactId?: string;
  /** Artifact name */
  name?: string;
  /** Description of the artifact */
  description?: string;
  /** Content parts */
  parts: Part[];
  /** Index for ordering multiple artifacts */
  index?: number;
  /** Whether this is an append to existing content (streaming) */
  append?: boolean;
  /** Whether this is the last chunk (streaming) */
  lastChunk?: boolean;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A task representing a unit of work
 */
export interface Task {
  /** Task identifier (UUID) */
  id: string;
  /** Context/session identifier */
  contextId?: string;
  /** Deprecated: use contextId */
  sessionId?: string;
  /** Current task status */
  status: TaskStatus;
  /** Artifacts produced by the task */
  artifacts?: Artifact[];
  /** Conversation history */
  history?: Message[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Type guard for TextPart
 */
export function isTextPart(part: Part): part is TextPart {
  return part.type === 'text';
}

/**
 * Type guard for FilePart
 */
export function isFilePart(part: Part): part is FilePart {
  return part.type === 'file';
}

/**
 * Type guard for DataPart
 */
export function isDataPart(part: Part): part is DataPart {
  return part.type === 'data';
}

/**
 * Check if a task is in a terminal state
 */
export function isTerminalState(state: TaskState): boolean {
  return ['completed', 'canceled', 'failed'].includes(state);
}
