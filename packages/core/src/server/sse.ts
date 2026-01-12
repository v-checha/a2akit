/**
 * SSE (Server-Sent Events) Writer
 * Handles streaming responses for A2A protocol
 */

import type { ServerResponse } from 'node:http';
import type { TaskStatus, Artifact } from '../types/protocol.js';

/**
 * Task status update event
 */
export interface TaskStatusUpdateEvent {
  id: string;
  status: TaskStatus;
  final?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Task artifact update event
 */
export interface TaskArtifactUpdateEvent {
  id: string;
  artifact: Artifact;
  metadata?: Record<string, unknown>;
}

/**
 * SSE Writer for streaming A2A responses
 */
export class SSEWriter {
  private eventId = 0;
  private closed = false;

  constructor(private res: ServerResponse) {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Handle client disconnect
    res.on('close', () => {
      this.closed = true;
    });
  }

  /**
   * Check if the connection is still open
   */
  isOpen(): boolean {
    return !this.closed && !this.res.writableEnded;
  }

  /**
   * Write raw SSE event
   */
  private writeEvent(data: unknown): void {
    if (!this.isOpen()) return;

    this.eventId++;
    this.res.write(`id: sse-evt-${this.eventId}\n`);
    this.res.write(`event: message\n`);
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Write a JSON-RPC response wrapper
   */
  write(result: unknown, requestId?: string | number): void {
    this.writeEvent({
      jsonrpc: '2.0',
      id: requestId ?? null,
      result,
    });
  }

  /**
   * Write a task status update event
   */
  writeTaskStatus(
    taskId: string,
    status: TaskStatus,
    options: { final?: boolean; requestId?: string | number } = {}
  ): void {
    const event: TaskStatusUpdateEvent = {
      id: taskId,
      status,
      final: options.final,
    };

    this.write(event, options.requestId);
  }

  /**
   * Write a task artifact update event
   */
  writeArtifact(
    taskId: string,
    artifact: Artifact,
    requestId?: string | number
  ): void {
    const event: TaskArtifactUpdateEvent = {
      id: taskId,
      artifact,
    };

    this.write(event, requestId);
  }

  /**
   * Write an error event
   */
  writeError(
    code: number,
    message: string,
    data?: unknown,
    requestId?: string | number
  ): void {
    this.writeEvent({
      jsonrpc: '2.0',
      id: requestId ?? null,
      error: { code, message, data },
    });
  }

  /**
   * End the SSE stream
   */
  end(): void {
    if (this.isOpen()) {
      this.res.end();
    }
    this.closed = true;
  }
}

/**
 * Create SSE headers for a response
 */
export function createSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}
