import { supabase } from "@/lib/supabase";

export interface Conversation {
  id: string;
  user_id: string;
  content_request_id: string | null;
  title: string;
  document_name: string | null;
  document_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export async function createConversation(
  title: string,
  documentName?: string,
  documentContent?: string,
  contentRequestId?: string
): Promise<{ data: Conversation | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: user.id,
      title,
      document_name: documentName,
      document_content: documentContent,
      content_request_id: contentRequestId,
    })
    .select()
    .single();

  return { data, error };
}

export async function getConversations(): Promise<{ data: Conversation[] | null; error: any }> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  return { data, error };
}

export async function getConversation(id: string): Promise<{ data: Conversation | null; error: any }> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

export async function getMessages(conversationId: string): Promise<{ data: Message[] | null; error: any }> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { data: data as Message[] | null, error };
}

export async function deleteConversation(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', id);

  return { error };
}

export async function updateConversationTitle(id: string, title: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ title })
    .eq('id', id);

  return { error };
}

export async function uploadDocument(file: File): Promise<{ text: string; fileName: string } | null> {
  const formData = new FormData();
  formData.append('file', file);

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/parse-document`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse document');
  }

  return await response.json();
}

export async function streamChat(
  conversationId: string,
  message: string,
  model: string,
  onToken: (token: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-rewrite-chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId, message, model }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      onError(error.error || 'Failed to send message');
      return;
    }

    if (!response.body) {
      onError('No response body');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          onComplete();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            onToken(content);
          }
        } catch (e) {
          // Incomplete JSON, put back in buffer
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    onComplete();
  } catch (error) {
    console.error('Stream error:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
}
