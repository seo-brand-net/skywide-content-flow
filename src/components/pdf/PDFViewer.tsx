'use client';

import { useState, useEffect } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFViewerProps {
    url: string;
    className?: string;
}

export function PDFViewer({ url, className = '' }: PDFViewerProps) {
    const [isClient, setIsClient] = useState(false);
    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <div className={`flex items-center justify-center bg-zinc-900/50 rounded-lg ${className}`}>
                <div className="text-center space-y-3 p-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-zinc-400">Loading PDF viewer...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`pdf-viewer-container ${className}`}>
            <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
                <div className="h-full w-full" style={{ minHeight: '600px' }}>
                    <Viewer
                        fileUrl={url}
                        plugins={[defaultLayoutPluginInstance]}
                        theme={{
                            theme: 'dark',
                        }}
                    />
                </div>
            </Worker>
            <style jsx global>{`
                .pdf-viewer-container {
                    --rpv-default-layout__container-background-color: #18181b;
                    --rpv-default-layout__body-background-color: #18181b;
                    --rpv-default-layout__toolbar-background-color: #27272a;
                    --rpv-default-layout__sidebar-background-color: #27272a;
                }
                .pdf-viewer-container .rpv-core__viewer {
                    background-color: #18181b;
                }
                .pdf-viewer-container .rpv-default-layout__toolbar {
                    background-color: #27272a;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .pdf-viewer-container .rpv-default-layout__sidebar {
                    background-color: #27272a;
                    border-right: 1px solid rgba(255, 255, 255, 0.1);
                }
                .pdf-viewer-container .rpv-core__text-layer {
                    opacity: 0.3;
                }
            `}</style>
        </div>
    );
}

// Fallback simple viewer using iframe
export function SimplePDFViewer({ url, className = '' }: PDFViewerProps) {
    return (
        <iframe
            src={url}
            className={`w-full border-0 rounded-lg bg-zinc-900 ${className}`}
            style={{ minHeight: '600px' }}
            title="PDF Document"
        />
    );
}

export default PDFViewer;
