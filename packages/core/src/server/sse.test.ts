import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEWriter, createSSEHeaders } from './sse.js';
import type { ServerResponse } from 'node:http';

describe('SSEWriter', () => {
  let mockResponse: ServerResponse;
  let writtenData: string[];
  let closeCallback: (() => void) | null;

  beforeEach(() => {
    writtenData = [];
    closeCallback = null;

    mockResponse = {
      writeHead: vi.fn(),
      write: vi.fn((data: string) => {
        writtenData.push(data);
        return true;
      }),
      end: vi.fn(),
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'close') {
          closeCallback = callback;
        }
        return mockResponse;
      }),
      writableEnded: false,
    } as unknown as ServerResponse;
  });

  describe('constructor', () => {
    it('should set SSE headers', () => {
      new SSEWriter(mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
    });

    it('should register close handler', () => {
      new SSEWriter(mockResponse);

      expect(mockResponse.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('isOpen', () => {
    it('should return true when connection is open', () => {
      const writer = new SSEWriter(mockResponse);

      expect(writer.isOpen()).toBe(true);
    });

    it('should return false after client disconnect', () => {
      const writer = new SSEWriter(mockResponse);

      closeCallback?.();

      expect(writer.isOpen()).toBe(false);
    });

    it('should return false when writable ended', () => {
      (mockResponse as any).writableEnded = true;
      const writer = new SSEWriter(mockResponse);

      expect(writer.isOpen()).toBe(false);
    });
  });

  describe('write', () => {
    it('should write JSON-RPC response format', () => {
      const writer = new SSEWriter(mockResponse);

      writer.write({ data: 'test' }, '1');

      const written = writtenData.join('');
      expect(written).toContain('id: sse-evt-1');
      expect(written).toContain('event: message');
      expect(written).toContain('data: {"jsonrpc":"2.0","id":"1","result":{"data":"test"}}');
    });

    it('should use null id when not provided', () => {
      const writer = new SSEWriter(mockResponse);

      writer.write({ data: 'test' });

      const written = writtenData.join('');
      expect(written).toContain('"id":null');
    });

    it('should not write when connection closed', () => {
      const writer = new SSEWriter(mockResponse);
      closeCallback?.();

      writer.write({ data: 'test' });

      expect(mockResponse.write).toHaveBeenCalledTimes(0);
    });

    it('should increment event ID', () => {
      const writer = new SSEWriter(mockResponse);

      writer.write({ data: 'first' });
      writer.write({ data: 'second' });

      const written = writtenData.join('');
      expect(written).toContain('id: sse-evt-1');
      expect(written).toContain('id: sse-evt-2');
    });
  });

  describe('writeTaskStatus', () => {
    it('should write task status event', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeTaskStatus('task-1', { state: 'working', timestamp: '2024-01-01' });

      const written = writtenData.join('');
      expect(written).toContain('"id":"task-1"');
      expect(written).toContain('"status":{"state":"working","timestamp":"2024-01-01"}');
    });

    it('should include final flag', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeTaskStatus('task-1', { state: 'completed' }, { final: true });

      const written = writtenData.join('');
      expect(written).toContain('"final":true');
    });

    it('should include request ID', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeTaskStatus('task-1', { state: 'working' }, { requestId: 'req-1' });

      const written = writtenData.join('');
      expect(written).toContain('"id":"req-1"');
    });
  });

  describe('writeArtifact', () => {
    it('should write artifact event', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeArtifact('task-1', {
        name: 'result',
        parts: [{ type: 'text', text: 'Hello' }],
      });

      const written = writtenData.join('');
      expect(written).toContain('"id":"task-1"');
      expect(written).toContain('"artifact":');
      expect(written).toContain('"name":"result"');
    });

    it('should include request ID', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeArtifact(
        'task-1',
        { parts: [{ type: 'text', text: 'test' }] },
        'req-1'
      );

      const written = writtenData.join('');
      expect(written).toContain('"id":"req-1"');
    });
  });

  describe('writeError', () => {
    it('should write error event', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeError(-32001, 'Task not found');

      const written = writtenData.join('');
      expect(written).toContain('"error":{"code":-32001,"message":"Task not found"}');
    });

    it('should include error data', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeError(-32001, 'Task not found', { taskId: 'task-1' });

      const written = writtenData.join('');
      expect(written).toContain('"data":{"taskId":"task-1"}');
    });

    it('should include request ID', () => {
      const writer = new SSEWriter(mockResponse);

      writer.writeError(-32001, 'Error', undefined, 'req-1');

      const written = writtenData.join('');
      expect(written).toContain('"id":"req-1"');
    });
  });

  describe('end', () => {
    it('should end the response', () => {
      const writer = new SSEWriter(mockResponse);

      writer.end();

      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should not end if already closed', () => {
      const writer = new SSEWriter(mockResponse);
      closeCallback?.();

      writer.end();

      expect(mockResponse.end).not.toHaveBeenCalled();
    });

    it('should mark as closed after end', () => {
      const writer = new SSEWriter(mockResponse);

      writer.end();

      expect(writer.isOpen()).toBe(false);
    });
  });
});

describe('createSSEHeaders', () => {
  it('should return SSE headers object', () => {
    const headers = createSSEHeaders();

    expect(headers).toEqual({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
  });
});
