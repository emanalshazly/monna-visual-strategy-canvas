import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceInputModal from '@/components/VoiceInputModal';

const visualizer = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
vi.mock('@/hooks/useAudioVisualizer', () => ({ useAudioVisualizer: () => visualizer }));

class RecognitionFixture {
  static current: RecognitionFixture;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult?: (event: unknown) => void;
  onerror?: (event: { error: string }) => void;
  onend?: () => void;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    RecognitionFixture.current = this;
  }

  final(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript: text, confidence: 0.99 }], { isFinal: true })],
    });
  }
}

beforeEach(() => { vi.stubGlobal('SpeechRecognition', RecognitionFixture); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('voice input draft ownership', () => {
  it('retains finalized speech when recording stops and saves the retained text', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<VoiceInputModal isOpen onClose={vi.fn()} onSave={onSave} initialTranscript="" />);
    await user.click(screen.getByRole('button', { name: 'Start Recording' }));
    act(() => RecognitionFixture.current.final('A neighborhood repair cooperative'));
    const editor = screen.getByPlaceholderText('Your transcribed text will appear here...');
    expect(editor).toHaveValue('A neighborhood repair cooperative');

    await user.click(screen.getByRole('button', { name: 'Stop Recording' }));
    expect(editor).toHaveValue('A neighborhood repair cooperative');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('A neighborhood repair cooperative');
  });

  it('retains finalized speech when recognition reports an error', async () => {
    const user = userEvent.setup();
    render(<VoiceInputModal isOpen onClose={vi.fn()} onSave={vi.fn()} initialTranscript="" />);
    await user.click(screen.getByRole('button', { name: 'Start Recording' }));
    act(() => RecognitionFixture.current.final('Repair and reuse'));
    act(() => RecognitionFixture.current.onerror?.({ error: 'no-speech' }));
    expect(screen.getByPlaceholderText('Your transcribed text will appear here...')).toHaveValue('Repair and reuse');
    expect(screen.getByRole('button', { name: 'Start Recording' })).toBeEnabled();
  });

  it('still resets a cancelled draft when a new modal session opens', async () => {
    const user = userEvent.setup();
    const props = { onClose: vi.fn(), onSave: vi.fn(), initialTranscript: 'Original brief' };
    const { rerender } = render(<VoiceInputModal {...props} isOpen />);
    const editor = screen.getByPlaceholderText('Your transcribed text will appear here...');
    await user.clear(editor);
    await user.type(editor, 'Discard this draft');
    rerender(<VoiceInputModal {...props} isOpen={false} />);
    rerender(<VoiceInputModal {...props} isOpen />);
    expect(screen.getByPlaceholderText('Your transcribed text will appear here...')).toHaveValue('Original brief');
  });
});
