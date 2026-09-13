import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasType } from '@/types';

describe('useCanvas', () => {
  it('initializes and clears canvas data', () => {
    const { result } = renderHook(() => useCanvas(CanvasType.BUSINESS_MODEL_CANVAS));
    expect(result.current.canvasData).toEqual({});
    act(() => result.current.setCanvasData({ keyPartners: 'Partners' }));
    expect(result.current.canvasData).toEqual({ keyPartners: 'Partners' });
    act(() => result.current.clearCanvas());
    expect(result.current.canvasData).toEqual({});
  });

  it('edits and saves a block through the public contract', () => {
    const { result } = renderHook(() => useCanvas(CanvasType.SWOT_ANALYSIS));
    act(() => result.current.handleEditBlock('strengths', 'Strengths', 'Trust'));
    expect(result.current.editingBlock).toEqual({ id: 'strengths', title: 'Strengths', content: 'Trust' });
    act(() => result.current.handleSaveEdit('Local trust'));
    expect(result.current.canvasData.strengths).toBe('Local trust');
    expect(result.current.editingBlock).toBeNull();
  });
});
