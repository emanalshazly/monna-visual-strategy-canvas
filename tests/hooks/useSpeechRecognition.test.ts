import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

class Recognition {
  static current: Recognition;
  onend?: () => void;
  start = vi.fn();
  stop = vi.fn();
  constructor() { Recognition.current = this; }
}

beforeEach(() => { vi.stubGlobal('SpeechRecognition', Recognition); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('continuous speech restart', () => {
  it('turns a failed automatic restart into a recoverable recording state', () => {
    const { result } = renderHook(useSpeechRecognition);
    act(() => result.current.startListening('ko-KR'));
    const recognition = Recognition.current;
    recognition.start.mockImplementationOnce(() => { throw new DOMException('Fixture restart rejection', 'InvalidStateError'); });
    act(() => { recognition.onend?.(); });
    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toMatch(/Could not restart/);
    act(() => result.current.startListening('ko-KR'));
    expect(result.current.isListening).toBe(true);
    expect(result.current.error).toBe('');
    expect(recognition.start).toHaveBeenCalledTimes(3);
  });

  it('still restarts after an ordinary service end', () => {
    const { result } = renderHook(useSpeechRecognition);
    act(() => result.current.startListening('en-US'));
    act(() => { Recognition.current.onend?.(); });
    expect(Recognition.current.start).toHaveBeenCalledTimes(2);
    expect(result.current.isListening).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('does not restart after the user stops', () => {
    const { result } = renderHook(useSpeechRecognition);
    act(() => result.current.startListening('en-US'));
    act(() => result.current.stopListening());
    act(() => { Recognition.current.onend?.(); });
    expect(Recognition.current.start).toHaveBeenCalledOnce();
    expect(result.current.isListening).toBe(false);
  });
});
