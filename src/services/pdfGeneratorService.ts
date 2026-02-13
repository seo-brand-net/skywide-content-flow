import { pdf } from '@react-pdf/renderer';
import { ArticlePDFDocument } from '@/components/pdf/ArticlePDFDocument';
import { supabase } from '@/lib/supabase';
import React from 'react';

export interface PDFGenerationResult {
    blob: Blob | null;
    url: string | null;
    storagePath: string | null;
    error: string | null;
}

/**
 * Generates a PDF from markdown content and uploads it to Supabase Storage
 * @param markdown - The markdown content to convert to PDF
 * @param title - The title of the article
 * @param requestId - Unique identifier for the test result
 * @param userId - The user's ID for storage path
 * @returns PDFGenerationResult with the blob, public URL, and storage path
 */
export async function generatePDFFromMarkdown(
    markdown: string,
    title: string,
    requestId: string,
    userId: string
): Promise<PDFGenerationResult> {
    try {
        // 1. Generate PDF blob from React component
        const pdfDoc = React.createElement(ArticlePDFDocument, {
            title,
            markdown,
            generatedDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
        });

        const blob = await pdf(pdfDoc).toBlob();

        // 2. Upload to Supabase Storage
        const storagePath = `${userId}/${requestId}.pdf`;

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('test-exports')
            .upload(storagePath, blob, {
                contentType: 'application/pdf',
                upsert: true, // Overwrite if exists
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return {
                blob,
                url: null,
                storagePath: null,
                error: `Upload failed: ${uploadError.message}`,
            };
        }

        // 3. Get public URL
        const { data: urlData } = supabase
            .storage
            .from('test-exports')
            .getPublicUrl(storagePath);

        const publicUrl = urlData?.publicUrl || null;

        // 4. Update test_results table with PDF info
        const { error: updateError } = await supabase
            .from('test_results')
            .update({
                pdf_url: publicUrl,
                pdf_storage_path: storagePath,
            })
            .eq('request_id', requestId);

        if (updateError) {
            console.error('Database update error:', updateError);
            // Don't fail the whole operation, PDF is still uploaded
        }

        return {
            blob,
            url: publicUrl,
            storagePath,
            error: null,
        };

    } catch (error: any) {
        console.error('PDF generation error:', error);
        return {
            blob: null,
            url: null,
            storagePath: null,
            error: error.message || 'Failed to generate PDF',
        };
    }
}

/**
 * Downloads a PDF blob directly to the user's device
 * @param blob - The PDF blob to download
 * @param filename - The filename for the download
 */
export function downloadPDFBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Generates a PDF and triggers immediate download without storage upload
 * Useful for quick downloads without persisting to storage
 */
export async function generateAndDownloadPDF(
    markdown: string,
    title: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const pdfDoc = React.createElement(ArticlePDFDocument, {
            title,
            markdown,
        });

        const blob = await pdf(pdfDoc).toBlob();
        downloadPDFBlob(blob, title);

        return { success: true };
    } catch (error: any) {
        console.error('PDF download error:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate PDF',
        };
    }
}

/**
 * Checks if a PDF already exists for a given request
 */
export async function checkExistingPDF(requestId: string): Promise<{
    exists: boolean;
    url: string | null;
}> {
    const { data, error } = await supabase
        .from('test_results')
        .select('pdf_url')
        .eq('request_id', requestId)
        .single();

    if (error || !data?.pdf_url) {
        return { exists: false, url: null };
    }

    return { exists: true, url: data.pdf_url };
}
