import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlsPanel from '@/components/ControlsPanel';
import { CanvasType } from '@/types';

afterEach(() => cleanup());

const defaultProps = {
  canvasType: CanvasType.BUSINESS_MODEL_CANVAS,
  setCanvasType: vi.fn(),
  userInput: '',
  setUserInput: vi.fn(),
  fileContent: '',
  handleFileChange: vi.fn(),
  imagePreviewUrl: null,
  handleImageChange: vi.fn(),
  removeImage: vi.fn(),
  handleGenerate: vi.fn(),
  onCancel: vi.fn(),
  isLoading: false,
  isCanvasPopulated: false,
  onExport: vi.fn(),
  onOpenVoiceModal: vi.fn(),
  error: '',
};

describe('ControlsPanel', () => {
  it('keeps generation disabled until meaningful input exists', () => {
    render(<ControlsPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Generate Canvas/i })).toBeDisabled();
  });

  it('submits once and exposes cancellation while loading', async () => {
    const user = userEvent.setup();
    render(<ControlsPanel {...defaultProps} userInput="Repair service" />);
    await user.click(screen.getByRole('button', { name: /Generate Canvas/i }));
    expect(defaultProps.handleGenerate).toHaveBeenCalledTimes(1);

    cleanup();
    render(<ControlsPanel {...defaultProps} userInput="Repair service" isLoading />);
    expect(screen.getByRole('button', { name: /Generating Canvas/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Cancel generation/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('announces failures and reveals export only for populated canvases', () => {
    const { rerender } = render(<ControlsPanel {...defaultProps} error="Provider unavailable" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Provider unavailable');
    expect(screen.queryByRole('button', { name: /Export Canvas/i })).not.toBeInTheDocument();
    rerender(<ControlsPanel {...defaultProps} isCanvasPopulated />);
    expect(screen.getByRole('button', { name: /Export Canvas/i })).toBeInTheDocument();
  });
});
