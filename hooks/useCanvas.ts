import { useState, useCallback } from 'react';
import { CanvasType, CanvasData } from '../types';

export const useCanvas = (initialType: CanvasType) => {
    const [canvasType, setCanvasType] = useState<CanvasType>(initialType);
    const [canvasData, setCanvasData] = useState<CanvasData>({});
    const [editingBlock, setEditingBlock] = useState<{ id: string, title: string, content: string } | null>(null);

    const handleEditBlock = useCallback((id: string, title: string, content: string) => {
        setEditingBlock({ id, title, content });
    }, []);

    const handleSaveEdit = useCallback((newContent: string) => {
        if (editingBlock) {
            setCanvasData(prev => ({ ...prev, [editingBlock.id]: newContent }));
        }
        setEditingBlock(null);
    }, [editingBlock]);

    const handleCloseModal = useCallback(() => {
        setEditingBlock(null);
    }, []);

    const clearCanvas = useCallback(() => {
        setCanvasData({});
    }, []);

    return {
        canvasType,
        setCanvasType,
        canvasData,
        setCanvasData,
        editingBlock,
        handleEditBlock,
        handleSaveEdit,
        handleCloseModal,
        clearCanvas,
    };
};
