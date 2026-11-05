import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceInputModal from '@/components/VoiceInputModal';

const visualizer = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
vi.mock('@/hooks/useAudioVisualizer', () => ({ useAudioVisualizer: () => visualizer }));

class RecognitionFixture {
  static current: RecognitionFixture;
  onresult?: (event: unknown) => void;
  start = vi.fn();
  stop = vi.fn();
  constructor() { RecognitionFixture.current = this; }
  result(text: string, isFinal = false) {
    this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text, confidence: 1 }], { isFinal })] });
  }
}

beforeEach(() => { vi.stubGlobal('SpeechRecognition', RecognitionFixture); });
afterEach(() => { vi.unstubAllGlobals(); });

async function openRecording() {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const props = { isOpen: true, onClose: vi.fn(), onSave, initialTranscript: '' };
  const view = render(<VoiceInputModal {...props} />);
  await user.click(screen.getByRole('button', { name: 'Start Recording' }));
  return { user, onSave, props, view, editor: screen.getByRole('textbox') };
}

function speech(text: string, final = false) {
  act(() => RecognitionFixture.current.result(text, final));
}

describe('voice interim draft ownership', () => {
  it('keeps ordinary manual edits and accepts speech when no interim phrase was edited', async () => {
    const { user, editor, onSave } = await openRecording();
    await user.type(editor, 'Manual brief.');
    speech('New spoken detail', true);
    expect(editor).toHaveValue('Manual brief. New spoken detail');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('Manual brief. New spoken detail');
  });

  it('saves the visible interim phrase without requiring a final event', async () => {
    const { user, editor, onSave } = await openRecording();
    speech('A fictional repair cooperative');
    expect(editor).toHaveValue('A fictional repair cooperative');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('A fictional repair cooperative');
  });

  it('preserves punctuation edits through interim revisions and finalization, then accepts new speech', async () => {
    const { user, editor, onSave } = await openRecording();
    speech('A fictional repair cooperative');
    await user.type(editor, '.');
    expect(editor).toHaveValue('A fictional repair cooperative.');
    speech('A fictional repair cooperative revised');
    expect(editor).toHaveValue('A fictional repair cooperative.');
    speech('A fictional repair cooperative revised', true);
    expect(editor).toHaveValue('A fictional repair cooperative.');
    speech('Serving local shops');
    expect(editor).toHaveValue('A fictional repair cooperative. Serving local shops');
    speech('Serving local shops', true);
    expect(editor).toHaveValue('A fictional repair cooperative. Serving local shops');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('A fictional repair cooperative. Serving local shops');
  });

  it('does not restore an interim phrase the user deletes', async () => {
    const { user, editor, onSave } = await openRecording();
    speech('Remove this phrase');
    await user.clear(editor);
    expect(editor).toHaveValue('');
    speech('Remove this phrase', true);
    expect(editor).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('');
  });

  it('replaces unedited interim hypotheses and commits the final phrase once', async () => {
    const { user, editor, onSave } = await openRecording();
    speech('A fictional');
    speech('A fictional repair shop');
    expect(editor).toHaveValue('A fictional repair shop');
    speech('A fictional repair cooperative', true);
    expect(editor).toHaveValue('A fictional repair cooperative');
    speech('Serving shops');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('A fictional repair cooperative Serving shops');
  });

  it('resets interim edit ownership when the modal is reopened', async () => {
    const { editor, props, view } = await openRecording();
    speech('Old interim');
    fireEvent.change(editor, { target: { value: 'Manual replacement' } });
    view.rerender(<VoiceInputModal {...props} isOpen={false} />);
    view.rerender(<VoiceInputModal {...props} />);
    speech('New interim');
    expect(screen.getByRole('textbox')).toHaveValue('New interim');
  });
});
