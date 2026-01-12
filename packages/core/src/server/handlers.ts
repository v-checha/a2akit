/**
 * JSON-RPC Request Handlers for A2A methods
 */

import type { Message, Task, TextPart } from '../types/protocol.js';
import { TaskManager } from '../task/manager.js';
import { SkillInvoker } from './invoker.js';
import { InvalidParamsError } from '../errors/index.js';
import type { MethodHandler } from './router.js';

/**
 * Parameters for tasks/send method
 */
export interface SendParams {
  /** Task ID */
  id: string;
  /** Context/session ID */
  contextId?: string;
  /** Message to send */
  message: Message;
  /** Request metadata including skillId */
  metadata?: {
    /** Required: skill ID to invoke */
    skillId?: string;
    [key: string]: unknown;
  };
}

/**
 * Parameters for tasks/get method
 */
export interface GetParams {
  /** Task ID */
  id: string;
  /** Number of history items to include */
  historyLength?: number;
}

/**
 * Parameters for tasks/cancel method
 */
export interface CancelParams {
  /** Task ID */
  id: string;
}

/**
 * Create the tasks/send handler
 */
export function createSendHandler(
  taskManager: TaskManager,
  invoker: SkillInvoker
): MethodHandler<SendParams, Task> {
  return async (params: SendParams): Promise<Task> => {
    const { id, contextId, message, metadata } = params;

    // Validate required params
    if (!id) {
      throw new InvalidParamsError('Missing required parameter: id', 'id');
    }

    if (!message) {
      throw new InvalidParamsError('Missing required parameter: message', 'message');
    }

    // Extract skill ID (required for explicit routing)
    const skillId = metadata?.skillId;
    if (!skillId) {
      throw new InvalidParamsError(
        'Missing required metadata.skillId - explicit skill routing required',
        'metadata.skillId'
      );
    }

    // Validate skill exists
    if (!invoker.hasSkill(skillId)) {
      throw new InvalidParamsError(
        `Unknown skill: ${skillId}`,
        'metadata.skillId'
      );
    }

    // Create or get existing task
    let task = taskManager.get(id);
    if (!task) {
      task = taskManager.create({ id, contextId, metadata });
    }

    // Store user message in history
    taskManager.appendHistory(id, message);

    // Transition to working
    taskManager.setWorking(id);

    try {
      // Invoke the skill
      const result = await invoker.invoke(skillId, message, task);

      // Handle result
      let responseText: string;

      if (typeof result === 'string') {
        responseText = result;
      } else {
        // For streaming results in non-streaming context, collect all chunks
        const chunks: string[] = [];
        for await (const chunk of result) {
          chunks.push(chunk);
        }
        responseText = chunks.join('');
      }

      // Create agent response message
      const responseMessage: Message = {
        role: 'agent',
        parts: [{ type: 'text', text: responseText } as TextPart],
      };

      // Complete task and store response
      taskManager.setCompleted(id, responseMessage);
      taskManager.appendHistory(id, responseMessage);

      return taskManager.getOrThrow(id);
    } catch (error) {
      // Mark task as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      const failureMessage: Message = {
        role: 'agent',
        parts: [{ type: 'text', text: `Error: ${errorMessage}` } as TextPart],
      };

      taskManager.setFailed(id, failureMessage);
      throw error;
    }
  };
}

/**
 * Create the tasks/get handler
 */
export function createGetHandler(
  taskManager: TaskManager
): MethodHandler<GetParams, Task> {
  return async (params: GetParams): Promise<Task> => {
    const { id, historyLength } = params;

    if (!id) {
      throw new InvalidParamsError('Missing required parameter: id', 'id');
    }

    const task = taskManager.getOrThrow(id);

    // Optionally limit history
    if (historyLength !== undefined && task.history) {
      const fullTask = { ...task };
      fullTask.history = task.history.slice(-historyLength);
      return fullTask;
    }

    return task;
  };
}

/**
 * Create the tasks/cancel handler
 */
export function createCancelHandler(
  taskManager: TaskManager
): MethodHandler<CancelParams, Task> {
  return async (params: CancelParams): Promise<Task> => {
    const { id } = params;

    if (!id) {
      throw new InvalidParamsError('Missing required parameter: id', 'id');
    }

    // This will throw if task doesn't exist or can't be canceled
    return taskManager.setCanceled(id);
  };
}

/**
 * Context for creating handlers
 */
export interface HandlerContext {
  taskManager: TaskManager;
  invoker: SkillInvoker;
}

/**
 * Create all standard A2A handlers
 */
export function createHandlers(context: HandlerContext): Record<string, MethodHandler> {
  const { taskManager, invoker } = context;

  return {
    'tasks/send': createSendHandler(taskManager, invoker) as MethodHandler,
    'tasks/get': createGetHandler(taskManager) as MethodHandler,
    'tasks/cancel': createCancelHandler(taskManager) as MethodHandler,
  };
}
