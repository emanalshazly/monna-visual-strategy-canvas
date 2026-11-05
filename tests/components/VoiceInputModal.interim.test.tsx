import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceInputModal from '@/components/VoiceInputModal';

const visualizer = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
vi.mock('@/hooks/useAudioVisualizer', () => ({ useAudioVisualizer: () => visualizer }));

class RecognitionFixture {
  static current: RecognitionFixture;
  onresult?: (event: unknown) => void;
  onend?: () => void;
  history: unknown[] = [];
  start = vi.fn();
  stop = vi.fn();
  constructor() { RecognitionFixture.current = this; }
  result(text: string, isFinal = false) {
    const resultIndex = this.history.length;
    const result = Object.assign([{ transcript: text, confidence: 1 }], { isFinal });
    this.onresult?.({ resultIndex, results: [...this.history, result] });
    if (isFinal) this.history.push(result);
  }
  batch(results: Array<[string, boolean]>) {
    const resultIndex = this.history.length;
    const batch = results.map(([text, isFinal]) => Object.assign([{ transcript: text, confidence: 1 }], { isFinal }));
    this.onresult?.({ resultIndex, results: [...this.history, ...batch] });
    this.history.push(...batch.filter(result => result.isFinal));
  }
  end() {
    this.history = [];
    this.onend?.();
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
  it('retains unedited finals and interim text from one recognition event', async () => {
    const { user, editor, onSave } = await openRecording();
    act(() => RecognitionFixture.current.batch([['Repair cooperative', true], ['Serving shops', true], ['Open daily', false]]));
    expect(editor).toHaveValue('Repair cooperative Serving shops Open daily');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('Repair cooperative Serving shops Open daily');
  });

  it('does not replay a final when a later event includes the same result index', async () => {
    const { editor } = await openRecording();
    speech('Repair cooperative', true);
    act(() => RecognitionFixture.current.onresult?.({ resultIndex: 0, results: RecognitionFixture.current.history }));
    expect(editor).toHaveValue('Repair cooperative');
  });

  it('preserves queued finals on both sides of an automatic restart', async () => {
    const { user, editor } = await openRecording();
    speech('Repair cooperative');
    await user.type(editor, '.');
    act(() => {
      RecognitionFixture.current.batch([['Repair cooperative', true], ['Serving shops', true]]);
      RecognitionFixture.current.end();
      RecognitionFixture.current.result('Open daily', true);
    });
    expect(editor).toHaveValue('Repair cooperative. Serving shops Open daily');
  });

  it('preserves an unedited final after the edited result in one event', async () => {
    const { user, editor, onSave } = await openRecording();
    speech('Repair cooperative');
    await user.type(editor, '.');
    act(() => RecognitionFixture.current.batch([['Repair cooperative', true], ['Serving local shops', true]]));
    expect(editor).toHaveValue('Repair cooperative. Serving local shops');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('Repair cooperative. Serving local shops');
  });

  it('preserves the next interim result delivered with an edited final', async () => {
    const { user, editor, onSave } = await openRecording();
    speech('Repair cooperative');
    await user.type(editor, '.');
    act(() => RecognitionFixture.current.batch([['Repair cooperative', true], ['Serving shops', false]]));
    expect(editor).toHaveValue('Repair cooperative. Serving shops');
    speech('Serving local shops', true);
    expect(editor).toHaveValue('Repair cooperative. Serving local shops');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('Repair cooperative. Serving local shops');
  });

  it('accepts a new session result at the same index after an automatic restart', async () => {
    const { user, editor, onSave } = await openRecording();
    speech('Repair cooperative');
    await user.type(editor, '.');
    act(() => RecognitionFixture.current.end());
    expect(RecognitionFixture.current.start).toHaveBeenCalledTimes(2);
    expect(editor).toHaveValue('Repair cooperative.');
    speech('Serving shops');
    expect(editor).toHaveValue('Repair cooperative. Serving shops');
    speech('Serving local shops', true);
    expect(editor).toHaveValue('Repair cooperative. Serving local shops');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
    expect(onSave).toHaveBeenCalledWith('Repair cooperative. Serving local shops');
  });

  it('retains multiple final events delivered before React renders', async () => {
    const { user, editor } = await openRecording();
    speech('Repair cooperative');
    await user.type(editor, '.');
    act(() => {
      RecognitionFixture.current.result('Repair cooperative', true);
      RecognitionFixture.current.result('Serving shops', true);
    });
    expect(editor).toHaveValue('Repair cooperative. Serving shops');
  });

  it('suppresses only the interim result identities included in a manual edit', async () => {
    const { user, editor } = await openRecording();
    act(() => RecognitionFixture.current.batch([['Repair', false], ['cooperative', false]]));
    fireEvent.change(editor, { target: { value: 'Repair cooperative.' } });
    act(() => RecognitionFixture.current.batch([['Repair', true], ['cooperative', true], ['Serving shops', true]]));
    expect(editor).toHaveValue('Repair cooperative. Serving shops');
    await user.click(screen.getByRole('button', { name: 'Save & Close' }));
  });

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
