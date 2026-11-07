import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceInputModal from '@/components/VoiceInputModal';

const speech = vi.hoisted(() => ({
  isListening: true, isSupported: true, error: '', confidence: 1,
  transcript: { interim: '', final: '' },
  startListening: vi.fn(), stopListening: vi.fn(), clearTranscript: vi.fn(),
}));
const visualizer = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
vi.mock('@/hooks/useSpeechRecognition', () => ({ useSpeechRecognition: () => speech }));
vi.mock('@/hooks/useAudioVisualizer', () => ({ useAudioVisualizer: () => visualizer }));

beforeEach(() => { speech.transcript = { interim: '', final: '' }; vi.clearAllMocks(); });

describe('whole-utterance voice commands', () => {
  for (const phrase of ['We produce clear text reports for fictional shops.', 'We help studios stop recording duplicate interviews.']) {
    it(`retains ordinary speech: ${phrase}`, async () => {
      const save = vi.fn();
      const props = { isOpen: true, onClose: vi.fn(), onSave: save, initialTranscript: 'Existing brief' };
      const view = render(<VoiceInputModal {...props} />);
      act(() => { speech.transcript = { interim: '', final: phrase }; });
      view.rerender(<VoiceInputModal {...props} />);
      expect(screen.getByPlaceholderText('Your transcribed text will appear here...')).toHaveValue(`Existing brief ${phrase}`);
      expect(speech.stopListening).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole('button', { name: 'Save & Close' }));
      expect(save).toHaveBeenCalledWith(`Existing brief ${phrase}`);
    });
  }

  it('still clears on a standalone command with terminal punctuation', () => {
    const props = { isOpen: true, onClose: vi.fn(), onSave: vi.fn(), initialTranscript: 'Existing brief' };
    const view = render(<VoiceInputModal {...props} />);
    speech.transcript = { interim: '', final: '  Clear text.  ' };
    view.rerender(<VoiceInputModal {...props} />);
    expect(screen.getByPlaceholderText('Your transcribed text will appear here...')).toHaveValue('');
  });

  it('still stops on a standalone command', () => {
    const props = { isOpen: true, onClose: vi.fn(), onSave: vi.fn(), initialTranscript: 'Existing brief' };
    const view = render(<VoiceInputModal {...props} />);
    speech.transcript = { interim: '', final: ' STOP RECORDING! ' };
    view.rerender(<VoiceInputModal {...props} />);
    expect(speech.stopListening).toHaveBeenCalledOnce();
    expect(visualizer.stop).toHaveBeenCalledOnce();
  });
});
