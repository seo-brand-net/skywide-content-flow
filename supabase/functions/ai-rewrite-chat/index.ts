import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, model = 'gpt-5-2025-08-07' } = await req.json();
    
    console.log('AI Rewrite Chat function called:', { conversationId, model, messageLength: message?.length });
    
    if (!conversationId || !message) {
      console.error('Missing required parameters:', { conversationId: !!conversationId, message: !!message });
      return new Response(JSON.stringify({ error: 'Missing conversationId or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch conversation and messages in parallel
    const [conversationResult, messagesResult] = await Promise.all([
      supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
    ]);

    const { data: conversation, error: convError } = conversationResult;
    const { data: messages, error: msgError } = messagesResult;

    console.log('Conversation fetched:', { 
      found: !!conversation, 
      hasDocument: !!conversation?.document_content,
      documentName: conversation?.document_name,
      messageCount: messages?.length || 0
    });

    if (convError || !conversation) {
      console.error('Conversation fetch error:', convError);
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (msgError) {
      console.error('Messages fetch error:', msgError);
      return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build messages array for OpenAI
    const openAIMessages: any[] = [];

    // Add system message with document context if available
    if (conversation.document_content) {
      openAIMessages.push({
        role: 'system',
        content: `You are a helpful AI writing assistant. The user has uploaded a document titled "${conversation.document_name}". Here is the document content:\n\n${conversation.document_content}\n\nHelp the user rewrite, improve, or work with this content based on their requests.`
      });
    } else {
      openAIMessages.push({
        role: 'system',
        content: 'You are a helpful AI writing assistant. Help users rewrite and improve their content.'
      });
    }

    // Add conversation history
    messages?.forEach(msg => {
      if (msg.role !== 'system') {
        openAIMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Add new user message
    openAIMessages.push({
      role: 'user',
      content: message
    });

    // Save user message to database
    const { error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      });

    if (userMsgError) {
      console.error('Failed to save user message:', userMsgError);
    } else {
      console.log('User message saved to database');
    }

    console.log('Calling OpenAI API:', { model, messageCount: openAIMessages.length });

    // Call OpenAI API with streaming
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: openAIMessages,
        stream: true,
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add funds to your OpenAI account.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'OpenAI API error', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting stream to client');

    // Pass OpenAI stream directly to client with background message saving
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          console.error('No reader available');
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Pass through directly to client
            controller.enqueue(value);

            // Collect response for database saving
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) fullResponse += content;
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }

          // Send [DONE] signal before closing
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          console.log('Stream completed, response length:', fullResponse.length);

          // Save assistant response in background (non-blocking)
          if (fullResponse) {
            supabase
              .from('ai_messages')
              .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: fullResponse
              })
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to save assistant message:', error);
                } else {
                  console.log('Assistant message saved to database');
                }
              });
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in ai-rewrite-chat:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
