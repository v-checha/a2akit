/**
 * Input Validation
 * Validates A2A protocol data structures
 */

import type { Message, Part, TaskState } from '../types/protocol.js';
import { InvalidParamsError } from '../errors/index.js';

const VALID_TASK_STATES: TaskState[] = [
  'submitted',
  'working',
  'input-required',
  'completed',
  'canceled',
  'failed',
  'unknown',
];

/**
 * Validate a message object
 */
export function validateMessage(value: unknown): asserts value is Message {
  if (!value || typeof value !== 'object') {
    throw new InvalidParamsError('Message must be an object', 'message');
  }

  const msg = value as Record<string, unknown>;

  if (!['user', 'agent'].includes(msg.role as string)) {
    throw new InvalidParamsError(
      'Message role must be "user" or "agent"',
      'message.role'
    );
  }

  if (!Array.isArray(msg.parts) || msg.parts.length === 0) {
    throw new InvalidParamsError(
      'Message must have at least one part',
      'message.parts'
    );
  }

  for (let i = 0; i < msg.parts.length; i++) {
    validatePart(msg.parts[i], `message.parts[${i}]`);
  }
}

/**
 * Validate a part object
 */
export function validatePart(value: unknown, path = 'part'): asserts value is Part {
  if (!value || typeof value !== 'object') {
    throw new InvalidParamsError('Part must be an object', path);
  }

  const part = value as Record<string, unknown>;

  if (!['text', 'file', 'data'].includes(part.type as string)) {
    throw new InvalidParamsError(
      'Part type must be "text", "file", or "data"',
      `${path}.type`
    );
  }

  switch (part.type) {
    case 'text':
      if (typeof part.text !== 'string') {
        throw new InvalidParamsError(
          'TextPart must have a text string',
          `${path}.text`
        );
      }
      break;

    case 'file':
      if (!part.file || typeof part.file !== 'object') {
        throw new InvalidParamsError(
          'FilePart must have a file object',
          `${path}.file`
        );
      }
      validateFileContent(part.file, `${path}.file`);
      break;

    case 'data':
      if (part.data === undefined || part.data === null) {
        throw new InvalidParamsError(
          'DataPart must have data',
          `${path}.data`
        );
      }
      if (
        typeof part.data !== 'object' &&
        !Array.isArray(part.data)
      ) {
        throw new InvalidParamsError(
          'DataPart data must be an object or array',
          `${path}.data`
        );
      }
      break;
  }
}

/**
 * Validate file content object
 */
export function validateFileContent(
  value: unknown,
  path = 'file'
): void {
  if (!value || typeof value !== 'object') {
    throw new InvalidParamsError('FileContent must be an object', path);
  }

  const file = value as Record<string, unknown>;

  // Must have either bytes or uri, but not both
  const hasBytes = typeof file.bytes === 'string';
  const hasUri = typeof file.uri === 'string';

  if (!hasBytes && !hasUri) {
    throw new InvalidParamsError(
      'FileContent must have either bytes or uri',
      path
    );
  }

  if (hasBytes && hasUri) {
    throw new InvalidParamsError(
      'FileContent cannot have both bytes and uri',
      path
    );
  }
}

/**
 * Validate a task state
 */
export function validateTaskState(value: unknown): asserts value is TaskState {
  if (!VALID_TASK_STATES.includes(value as TaskState)) {
    throw new InvalidParamsError(
      `Invalid task state: ${value}. Must be one of: ${VALID_TASK_STATES.join(', ')}`,
      'state'
    );
  }
}

/**
 * Validate a task ID
 */
export function validateTaskId(value: unknown, field = 'id'): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidParamsError('Task ID must be a non-empty string', field);
  }
}

/**
 * Check if a value is a valid message (non-throwing)
 */
export function isValidMessage(value: unknown): value is Message {
  try {
    validateMessage(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a value is a valid part (non-throwing)
 */
export function isValidPart(value: unknown): value is Part {
  try {
    validatePart(value);
    return true;
  } catch {
    return false;
  }
}
