/**
 * Parameter decorators for skill methods
 */

import 'reflect-metadata';
import { PARAM_METADATA, type ParamMetadata, type ParamType } from './metadata.js';

/**
 * Helper to create parameter decorators
 */
function createParamDecorator(type: ParamType, partIndex?: number): ParameterDecorator {
  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ): void {
    if (propertyKey === undefined) {
      throw new Error('Parameter decorators can only be used on method parameters');
    }

    // Get existing params or initialize empty array
    const existingParams: ParamMetadata[] =
      Reflect.getMetadata(PARAM_METADATA, target, propertyKey) || [];

    const paramMetadata: ParamMetadata = {
      index: parameterIndex,
      type,
      partIndex,
    };

    existingParams.push(paramMetadata);
    Reflect.defineMetadata(PARAM_METADATA, existingParams, target, propertyKey);
  };
}

/**
 * Extract text content from the first text part of the message
 *
 * @example
 * ```typescript
 * @Skill({ name: 'Echo', description: 'Echo text' })
 * async echo(@TextPart() text: string): Promise<string> {
 *   return text;
 * }
 * ```
 */
export function TextPart(partIndex?: number): ParameterDecorator {
  return createParamDecorator('text', partIndex);
}

/**
 * Extract file content from the first file part of the message
 *
 * @example
 * ```typescript
 * @Skill({ name: 'Process File', description: 'Process a file' })
 * async processFile(@FilePart() file: FileContent): Promise<string> {
 *   return `Processing ${file.name}`;
 * }
 * ```
 */
export function FilePart(partIndex?: number): ParameterDecorator {
  return createParamDecorator('file', partIndex);
}

/**
 * Extract data content from the first data part of the message
 *
 * @example
 * ```typescript
 * @Skill({ name: 'Process Data', description: 'Process structured data' })
 * async processData(@DataPart() data: Record<string, unknown>): Promise<string> {
 *   return JSON.stringify(data);
 * }
 * ```
 */
export function DataPart(partIndex?: number): ParameterDecorator {
  return createParamDecorator('data', partIndex);
}

/**
 * Get the full message object
 *
 * @example
 * ```typescript
 * @Skill({ name: 'Process', description: 'Process full message' })
 * async process(@Message() msg: Message): Promise<string> {
 *   return `Parts: ${msg.parts.length}`;
 * }
 * ```
 */
export function Message(): ParameterDecorator {
  return createParamDecorator('message');
}

/**
 * Get the full task context
 *
 * @example
 * ```typescript
 * @Skill({ name: 'Context', description: 'Access task context' })
 * async withContext(@TaskContext() task: Task): Promise<string> {
 *   return `Task ID: ${task.id}`;
 * }
 * ```
 */
export function TaskContext(): ParameterDecorator {
  return createParamDecorator('task');
}

/**
 * Get all message parts
 *
 * @example
 * ```typescript
 * @Skill({ name: 'All Parts', description: 'Access all parts' })
 * async allParts(@Parts() allParts: Part[]): Promise<string> {
 *   return `Parts: ${allParts.length}`;
 * }
 * ```
 */
export function Parts(): ParameterDecorator {
  return createParamDecorator('parts');
}
