-- Table for storing AI conversation sessions
CREATE TABLE public.ai_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_request_id uuid REFERENCES public.content_requests(id) ON DELETE SET NULL,
    title text NOT NULL,
    document_name text,
    document_content text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for storing individual messages within conversations
CREATE TABLE public.ai_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_content_request_id ON public.ai_conversations(content_request_id);
CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_conversations
CREATE POLICY "Users can view own conversations or admins view all"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id OR is_admin_user());

CREATE POLICY "Users can create own conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
    ON public.ai_conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for ai_messages
CREATE POLICY "Users can view messages in their conversations"
    ON public.ai_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND (ai_conversations.user_id = auth.uid() OR is_admin_user())
        )
    );

CREATE POLICY "Users can create messages in their conversations"
    ON public.ai_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();