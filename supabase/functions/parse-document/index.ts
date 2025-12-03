import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileName = file.name.toLowerCase();
    let extractedText = '';

    // Handle text files
    if (fileName.endsWith('.txt')) {
      extractedText = await file.text();
    } 
    // Handle PDF files (basic extraction)
    else if (fileName.endsWith('.pdf')) {
      // For MVP, we'll extract text directly without external libraries
      // For production, consider using a PDF parsing library
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(bytes);
      
      // Very basic PDF text extraction (looks for readable text between PDF markers)
      const matches = text.match(/BT[\s\S]*?ET/g);
      if (matches) {
        extractedText = matches
          .map(match => {
            // Remove PDF commands and extract text
            return match
              .replace(/\/[A-Za-z]+\s+/g, '')
              .replace(/[<>()[\]]/g, '')
              .replace(/\d+(\.\d+)?\s+/g, ' ')
              .trim();
          })
          .filter(text => text.length > 0)
          .join('\n');
      } else {
        extractedText = 'PDF content could not be extracted. Please convert to .txt or .docx format.';
      }
    }
    // Handle DOCX files (basic extraction)
    else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // DOCX is a ZIP file containing XML
      // For MVP, we'll provide a message to convert to TXT
      // For production, consider using a DOCX parsing library
      extractedText = 'DOCX parsing requires conversion. Please save your document as .txt or .pdf for best results. Alternatively, copy and paste the content directly into the chat.';
    }
    else {
      return new Response(JSON.stringify({ error: 'Unsupported file format. Please upload .txt, .pdf, or .docx files.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      text: extractedText,
      fileName: file.name 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-document:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
