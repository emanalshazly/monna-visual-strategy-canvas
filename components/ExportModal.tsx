import React, { useState } from 'react';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasName: string;
}

type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, canvasRef, canvasName }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
    const [exportError, setExportError] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleExport = async (format: ExportFormat) => {
        if (!canvasRef.current) return;

        setIsExporting(true);
        setExportFormat(format);
        setExportError('');

        try {
            const element = canvasRef.current;
            await document.fonts?.ready;
            const fileName = canvasName.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

            switch (format) {
                case 'png':
                    await exportAsPNG(element, fileName);
                    break;
                case 'jpeg':
                    await exportAsJPEG(element, fileName);
                    break;
                case 'svg':
                    await exportAsSVG(element, fileName);
                    break;
                case 'pdf':
                    await exportAsPDF(element, fileName);
                    break;
            }

            onClose();
        } catch (err) {
            console.error(`Export as ${format} failed:`, err);
            setExportError(`Failed to export as ${format.toUpperCase()}. Please try again.`);
        } finally {
            setIsExporting(false);
            setExportFormat(null);
        }
    };

    const exportAsPNG = async (element: HTMLElement, fileName: string) => {
        const dataUrl = await toPng(element, {
            backgroundColor: '#f8fafc',
            quality: 1.0,
            pixelRatio: 2, // Higher resolution
        });
        downloadImage(dataUrl, `${fileName}.png`);
    };

    const exportAsJPEG = async (element: HTMLElement, fileName: string) => {
        const dataUrl = await toJpeg(element, {
            backgroundColor: '#f8fafc',
            quality: 0.95,
            pixelRatio: 2,
        });
        downloadImage(dataUrl, `${fileName}.jpeg`);
    };

    const exportAsSVG = async (element: HTMLElement, fileName: string) => {
        const dataUrl = await toSvg(element, {
            backgroundColor: '#f8fafc',
        });
        downloadImage(dataUrl, `${fileName}.svg`);
    };

    const exportAsPDF = async (element: HTMLElement, fileName: string) => {
        // Convert to high-quality PNG first
        const dataUrl = await toPng(element, {
            backgroundColor: '#ffffff',
            quality: 1.0,
            pixelRatio: 3,
        });

        // Get element dimensions
        const width = element.offsetWidth;
        const height = element.offsetHeight;

        // Calculate PDF dimensions (A4 landscape if wide, portrait if tall)
        const isLandscape = width > height;
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'px',
            format: [width, height],
        });

        // Add image to PDF
        pdf.addImage(dataUrl, 'PNG', 0, 0, width, height, undefined, 'FAST');

        // Save PDF
        pdf.save(`${fileName}.pdf`);
    };

    const downloadImage = (dataUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Export Canvas
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Choose your desired format to download the canvas. High-resolution exports are optimized for professional use.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {/* PNG Export */}
                        <button
                            onClick={() => handleExport('png')}
                            disabled={isExporting}
                            className={`group relative bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold py-4 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 ${
                                isExporting && exportFormat !== 'png' ? 'opacity-50 cursor-not-allowed' : ''
                            } ${isExporting && exportFormat === 'png' ? 'animate-pulse' : ''}`}
                        >
                            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm">PNG</span>
                            <span className="text-xs opacity-80 mt-1">Best quality</span>
                            {isExporting && exportFormat === 'png' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-blue-600 bg-opacity-80 rounded-lg">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                            )}
                        </button>

                        {/* JPEG Export */}
                        <button
                            onClick={() => handleExport('jpeg')}
                            disabled={isExporting}
                            className={`group relative bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold py-4 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 ${
                                isExporting && exportFormat !== 'jpeg' ? 'opacity-50 cursor-not-allowed' : ''
                            } ${isExporting && exportFormat === 'jpeg' ? 'animate-pulse' : ''}`}
                        >
                            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm">JPEG</span>
                            <span className="text-xs opacity-80 mt-1">Smaller size</span>
                            {isExporting && exportFormat === 'jpeg' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-600 bg-opacity-80 rounded-lg">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                            )}
                        </button>

                        {/* SVG Export */}
                        <button
                            onClick={() => handleExport('svg')}
                            disabled={isExporting}
                            className={`group relative bg-gradient-to-br from-purple-500 to-purple-600 text-white font-semibold py-4 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 ${
                                isExporting && exportFormat !== 'svg' ? 'opacity-50 cursor-not-allowed' : ''
                            } ${isExporting && exportFormat === 'svg' ? 'animate-pulse' : ''}`}
                        >
                            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                            </svg>
                            <span className="text-sm">SVG</span>
                            <span className="text-xs opacity-80 mt-1">Scalable</span>
                            {isExporting && exportFormat === 'svg' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-purple-600 bg-opacity-80 rounded-lg">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                            )}
                        </button>

                        {/* PDF Export */}
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={isExporting}
                            className={`group relative bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold py-4 px-4 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 flex flex-col items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 ${
                                isExporting && exportFormat !== 'pdf' ? 'opacity-50 cursor-not-allowed' : ''
                            } ${isExporting && exportFormat === 'pdf' ? 'animate-pulse' : ''}`}
                        >
                            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm">PDF</span>
                            <span className="text-xs opacity-80 mt-1">Print ready</span>
                            {isExporting && exportFormat === 'pdf' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-600 bg-opacity-80 rounded-lg">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                </div>
                            )}
                        </button>
                    </div>

                    {exportError && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{exportError}</p>}

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                <p className="font-semibold mb-1">Export Tips:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li><strong>PNG:</strong> Best for high-quality images with transparency</li>
                                    <li><strong>JPEG:</strong> Smaller file size, good for sharing online</li>
                                    <li><strong>SVG:</strong> Vector format, perfect for editing and scaling</li>
                                    <li><strong>PDF:</strong> Print-ready format, ideal for presentations</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-700 px-6 py-4 flex justify-end rounded-b-lg">
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="px-6 py-2.5 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? 'Exporting...' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
