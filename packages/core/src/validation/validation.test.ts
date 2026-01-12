import { describe, it, expect } from 'vitest';
import {
  validateMessage,
  validatePart,
  validateFileContent,
  validateTaskState,
  validateTaskId,
  isValidMessage,
  isValidPart,
} from './index.js';
import { InvalidParamsError } from '../errors/index.js';

describe('validateMessage', () => {
  it('should accept valid message with text part', () => {
    const message = {
      role: 'user',
      parts: [{ type: 'text', text: 'Hello' }],
    };

    expect(() => validateMessage(message)).not.toThrow();
  });

  it('should accept valid message with agent role', () => {
    const message = {
      role: 'agent',
      parts: [{ type: 'text', text: 'Hi!' }],
    };

    expect(() => validateMessage(message)).not.toThrow();
  });

  it('should accept message with multiple parts', () => {
    const message = {
      role: 'user',
      parts: [
        { type: 'text', text: 'Hello' },
        { type: 'data', data: { key: 'value' } },
      ],
    };

    expect(() => validateMessage(message)).not.toThrow();
  });

  it('should reject non-object message', () => {
    expect(() => validateMessage(null)).toThrow(InvalidParamsError);
    expect(() => validateMessage(undefined)).toThrow(InvalidParamsError);
    expect(() => validateMessage('string')).toThrow(InvalidParamsError);
    expect(() => validateMessage(42)).toThrow(InvalidParamsError);
  });

  it('should reject message with invalid role', () => {
    const message = {
      role: 'invalid',
      parts: [{ type: 'text', text: 'Hello' }],
    };

    expect(() => validateMessage(message)).toThrow(InvalidParamsError);
    expect(() => validateMessage(message)).toThrow('Message role must be "user" or "agent"');
  });

  it('should reject message without parts', () => {
    const message = { role: 'user' };

    expect(() => validateMessage(message)).toThrow(InvalidParamsError);
    expect(() => validateMessage(message)).toThrow('Message must have at least one part');
  });

  it('should reject message with empty parts array', () => {
    const message = { role: 'user', parts: [] };

    expect(() => validateMessage(message)).toThrow(InvalidParamsError);
    expect(() => validateMessage(message)).toThrow('Message must have at least one part');
  });

  it('should reject message with invalid part', () => {
    const message = {
      role: 'user',
      parts: [{ type: 'invalid' }],
    };

    expect(() => validateMessage(message)).toThrow(InvalidParamsError);
  });
});

describe('validatePart', () => {
  describe('text part', () => {
    it('should accept valid text part', () => {
      const part = { type: 'text', text: 'Hello' };

      expect(() => validatePart(part)).not.toThrow();
    });

    it('should reject text part without text', () => {
      const part = { type: 'text' };

      expect(() => validatePart(part)).toThrow(InvalidParamsError);
      expect(() => validatePart(part)).toThrow('TextPart must have a text string');
    });

    it('should reject text part with non-string text', () => {
      const part = { type: 'text', text: 42 };

      expect(() => validatePart(part)).toThrow(InvalidParamsError);
    });
  });

  describe('file part', () => {
    it('should accept valid file part with uri', () => {
      const part = {
        type: 'file',
        file: { uri: 'https://example.com/file.txt' },
      };

      expect(() => validatePart(part)).not.toThrow();
    });

    it('should accept valid file part with bytes', () => {
      const part = {
        type: 'file',
        file: { bytes: 'SGVsbG8=', mimeType: 'text/plain' },
      };

      expect(() => validatePart(part)).not.toThrow();
    });

    it('should reject file part without file object', () => {
      const part = { type: 'file' };

      expect(() => validatePart(part)).toThrow(InvalidParamsError);
      expect(() => validatePart(part)).toThrow('FilePart must have a file object');
    });

    it('should reject file part with non-object file', () => {
      const part = { type: 'file', file: 'string' };

      expect(() => validatePart(part)).toThrow(InvalidParamsError);
    });
  });

  describe('data part', () => {
    it('should accept valid data part with object', () => {
      const part = { type: 'data', data: { key: 'value' } };

      expect(() => validatePart(part)).not.toThrow();
    });

    it('should accept valid data part with array', () => {
      const part = { type: 'data', data: [1, 2, 3] };

      expect(() => validatePart(part)).not.toThrow();
    });

    it('should reject data part without data', () => {
      const part = { type: 'data' };

      expect(() => validatePart(part)).toThrow(InvalidParamsError);
      expect(() => validatePart(part)).toThrow('DataPart must have data');
    });

    it('should reject data part with null data', () => {
      const part = { type: 'data', data: null };

      expect(() => validatePart(part)).toThrow(InvalidParamsError);
    });

    it('should reject data part with non-object data', () => {
      const part = { type: 'data', data: 'string' };

      expect(() => validatePart(part)).toThrow(InvalidParamsError);
      expect(() => validatePart(part)).toThrow('DataPart data must be an object or array');
    });
  });

  it('should reject non-object part', () => {
    expect(() => validatePart(null)).toThrow(InvalidParamsError);
    expect(() => validatePart(undefined)).toThrow(InvalidParamsError);
    expect(() => validatePart('string')).toThrow(InvalidParamsError);
  });

  it('should reject part with invalid type', () => {
    const part = { type: 'invalid' };

    expect(() => validatePart(part)).toThrow(InvalidParamsError);
    expect(() => validatePart(part)).toThrow('Part type must be "text", "file", or "data"');
  });

  it('should use custom path in error', () => {
    const part = { type: 'invalid' };

    try {
      validatePart(part, 'message.parts[0]');
    } catch (error) {
      expect((error as InvalidParamsError).data).toEqual({ field: 'message.parts[0].type' });
    }
  });
});

describe('validateFileContent', () => {
  it('should accept file with uri', () => {
    const file = { uri: 'https://example.com/file.txt' };

    expect(() => validateFileContent(file)).not.toThrow();
  });

  it('should accept file with bytes', () => {
    const file = { bytes: 'SGVsbG8=' };

    expect(() => validateFileContent(file)).not.toThrow();
  });

  it('should reject file without uri or bytes', () => {
    const file = { name: 'file.txt' };

    expect(() => validateFileContent(file)).toThrow(InvalidParamsError);
    expect(() => validateFileContent(file)).toThrow('FileContent must have either bytes or uri');
  });

  it('should reject file with both uri and bytes', () => {
    const file = { uri: 'https://example.com', bytes: 'SGVsbG8=' };

    expect(() => validateFileContent(file)).toThrow(InvalidParamsError);
    expect(() => validateFileContent(file)).toThrow('FileContent cannot have both bytes and uri');
  });

  it('should reject non-object file', () => {
    expect(() => validateFileContent(null)).toThrow(InvalidParamsError);
    expect(() => validateFileContent('string')).toThrow(InvalidParamsError);
  });
});

describe('validateTaskState', () => {
  const validStates = [
    'submitted',
    'working',
    'input-required',
    'completed',
    'canceled',
    'failed',
    'unknown',
  ];

  it.each(validStates)('should accept valid state: %s', (state) => {
    expect(() => validateTaskState(state)).not.toThrow();
  });

  it('should reject invalid state', () => {
    expect(() => validateTaskState('invalid')).toThrow(InvalidParamsError);
    expect(() => validateTaskState('invalid')).toThrow('Invalid task state: invalid');
  });

  it('should reject non-string state', () => {
    expect(() => validateTaskState(42)).toThrow(InvalidParamsError);
    expect(() => validateTaskState(null)).toThrow(InvalidParamsError);
  });
});

describe('validateTaskId', () => {
  it('should accept valid task ID', () => {
    expect(() => validateTaskId('task-123')).not.toThrow();
    expect(() => validateTaskId('a')).not.toThrow();
  });

  it('should reject empty string', () => {
    expect(() => validateTaskId('')).toThrow(InvalidParamsError);
    expect(() => validateTaskId('')).toThrow('Task ID must be a non-empty string');
  });

  it('should reject non-string', () => {
    expect(() => validateTaskId(42)).toThrow(InvalidParamsError);
    expect(() => validateTaskId(null)).toThrow(InvalidParamsError);
    expect(() => validateTaskId(undefined)).toThrow(InvalidParamsError);
  });

  it('should use custom field name in error', () => {
    try {
      validateTaskId('', 'params.id');
    } catch (error) {
      expect((error as InvalidParamsError).data).toEqual({ field: 'params.id' });
    }
  });
});

describe('isValidMessage', () => {
  it('should return true for valid message', () => {
    const message = {
      role: 'user',
      parts: [{ type: 'text', text: 'Hello' }],
    };

    expect(isValidMessage(message)).toBe(true);
  });

  it('should return false for invalid message', () => {
    expect(isValidMessage(null)).toBe(false);
    expect(isValidMessage({ role: 'invalid', parts: [] })).toBe(false);
    expect(isValidMessage({ role: 'user' })).toBe(false);
  });
});

describe('isValidPart', () => {
  it('should return true for valid part', () => {
    expect(isValidPart({ type: 'text', text: 'Hello' })).toBe(true);
    expect(isValidPart({ type: 'file', file: { uri: 'https://example.com' } })).toBe(true);
    expect(isValidPart({ type: 'data', data: {} })).toBe(true);
  });

  it('should return false for invalid part', () => {
    expect(isValidPart(null)).toBe(false);
    expect(isValidPart({ type: 'invalid' })).toBe(false);
    expect(isValidPart({ type: 'text' })).toBe(false);
  });
});
