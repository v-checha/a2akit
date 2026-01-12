/**
 * Streaming Handler
 * Handles streaming skill execution with SSE
 */

import type { Message, TextPart, Artifact } from '../types/protocol.js';
import { TaskManager } from '../task/manager.js';
import { SkillInvoker } from './invoker.js';
import { SSEWriter } from './sse.js';
import type { SendParams } from './handlers.js';

/**
 * Handle a streaming skill request
 */
export async function handleStreamingRequest(
  params: SendParams,
  taskManager: TaskManager,
  invoker: SkillInvoker,
  sse: SSEWriter,
  requestId?: string | number
): Promise<void> {
  const { id, contextId, message, metadata } = params;

  // Validate required params
  if (!id) {
    sse.writeError(-32602, 'Missing required parameter: id', { field: 'id' }, requestId);
    sse.end();
    return;
  }

  if (!message) {
    sse.writeError(-32602, 'Missing required parameter: message', { field: 'message' }, requestId);
    sse.end();
    return;
  }

  const skillId = metadata?.skillId;
  if (!skillId) {
    sse.writeError(
      -32602,
      'Missing required metadata.skillId',
      { field: 'metadata.skillId' },
      requestId
    );
    sse.end();
    return;
  }

  if (!invoker.hasSkill(skillId)) {
    sse.writeError(-32602, `Unknown skill: ${skillId}`, { skillId }, requestId);
    sse.end();
    return;
  }

  // Create or get task
  let task = taskManager.get(id);
  if (!task) {
    task = taskManager.create({ id, contextId, metadata });
  }

  // Store user message
  taskManager.appendHistory(id, message);

  // Transition to working
  taskManager.setWorking(id);

  // Send initial status
  sse.writeTaskStatus(id, task.status, { requestId });

  try {
    // Invoke skill
    const result = await invoker.invoke(skillId, message, task);

    if (typeof result === 'string') {
      // Non-streaming result - send as single artifact
      const artifact: Artifact = {
        parts: [{ type: 'text', text: result } as TextPart],
        index: 0,
        lastChunk: true,
      };

      sse.writeArtifact(id, artifact, requestId);
      taskManager.addArtifact(id, artifact);
    } else {
      // Streaming result - send chunks as artifacts
      let chunkIndex = 0;
      const collectedText: string[] = [];

      for await (const chunk of result) {
        if (!sse.isOpen()) break;

        collectedText.push(chunk);

        const artifact: Artifact = {
          parts: [{ type: 'text', text: chunk } as TextPart],
          index: 0,
          append: chunkIndex > 0,
          lastChunk: false,
        };

        sse.writeArtifact(id, artifact, requestId);
        chunkIndex++;
      }

      // Send final chunk marker
      const finalArtifact: Artifact = {
        parts: [{ type: 'text', text: '' } as TextPart],
        index: 0,
        append: true,
        lastChunk: true,
      };

      sse.writeArtifact(id, finalArtifact, requestId);

      // Store complete artifact
      taskManager.addArtifact(id, {
        parts: [{ type: 'text', text: collectedText.join('') } as TextPart],
        index: 0,
        lastChunk: true,
      });
    }

    // Create response message from collected artifacts
    const responseMessage: Message = {
      role: 'agent',
      parts: task.artifacts?.[0]?.parts ?? [{ type: 'text', text: '' } as TextPart],
    };

    // Complete task
    taskManager.setCompleted(id, responseMessage);
    taskManager.appendHistory(id, responseMessage);

    // Send final status
    sse.writeTaskStatus(id, taskManager.getOrThrow(id).status, {
      final: true,
      requestId,
    });
  } catch (error) {
    // Mark task as failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    const failureMessage: Message = {
      role: 'agent',
      parts: [{ type: 'text', text: `Error: ${errorMessage}` } as TextPart],
    };

    taskManager.setFailed(id, failureMessage);

    // Send error status
    sse.writeTaskStatus(id, taskManager.getOrThrow(id).status, {
      final: true,
      requestId,
    });
  } finally {
    sse.end();
  }
}
