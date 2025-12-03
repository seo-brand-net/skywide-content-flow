import { useState, useEffect } from 'react';
import { ConversationSidebar } from '@/components/ai-rewriter/ConversationSidebar';
import { ChatInterface } from '@/components/ai-rewriter/ChatInterface';
import {
  createConversation,
  getConversations,
  getMessages,
  deleteConversation,
  uploadDocument,
  streamChat,
  Conversation,
  Message,
} from '@/services/aiRewriterService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function AIRewriter() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [documentJustLoaded, setDocumentJustLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    setLoading(true);
    const { data, error } = await getConversations();
    if (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } else if (data) {
      setConversations(data);
    }
    setLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    const { data, error } = await getMessages(conversationId);
    if (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } else if (data) {
      setMessages(data);
    }
    setMessagesLoading(false);
  };

  const handleNewConversation = async () => {
    const title = `New Conversation - ${new Date().toLocaleDateString()}`;
    const { data, error } = await createConversation(title);
    
    if (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
      return;
    }

    if (data) {
      setConversations([data, ...conversations]);
      setCurrentConversationId(data.id);
      setMessages([]);
      setShowFileUpload(true);
      toast.success('New conversation created');
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setShowFileUpload(false);
    setDocumentJustLoaded(false);
  };

  const handleDeleteConversation = async (id: string) => {
    const { error } = await deleteConversation(id);
    
    if (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
      return;
    }

    setConversations(conversations.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    toast.success('Conversation deleted');
  };

  const handleFileUpload = async (file: File) => {
    if (!currentConversationId) return;

    toast.loading('Parsing document...', { id: 'upload' });
    
    try {
      const result = await uploadDocument(file);
      
      if (result) {
        // Update database with document
        const { error: updateError } = await supabase
          .from('ai_conversations')
          .update({
            document_name: result.fileName,
            document_content: result.text
          })
          .eq('id', currentConversationId);

        if (updateError) {
          throw new Error('Failed to save document to database');
        }

        // Update local state
        const conversation = conversations.find((c) => c.id === currentConversationId);
        if (conversation) {
          conversation.document_name = result.fileName;
          conversation.document_content = result.text;
          setConversations([...conversations]);
        }

        setShowFileUpload(false);
        setDocumentJustLoaded(true);
        toast.success(`Document "${result.fileName}" loaded successfully. Now tell me what you'd like me to do with it.`, { id: 'upload' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document', { id: 'upload' });
    }
  };

  const handleSendMessage = async (message: string, model: string) => {
    if (!currentConversationId) return;

    setIsStreaming(true);
    setStreamingContent('');
    setDocumentJustLoaded(false);

    await streamChat(
      currentConversationId,
      message,
      model,
      (token) => {
        setStreamingContent((prev) => prev + token);
      },
      () => {
        setIsStreaming(false);
        setStreamingContent('');
        loadMessages(currentConversationId);
      },
      (error) => {
        setIsStreaming(false);
        setStreamingContent('');
        toast.error(error);
      }
    );
  };

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        loading={loading}
      />
      <ChatInterface
        conversationId={currentConversationId}
        conversationTitle={currentConversation?.title || 'Select a conversation'}
        documentName={currentConversation?.document_name || null}
        messages={messages}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        showFileUpload={showFileUpload}
        documentJustLoaded={documentJustLoaded}
        loading={messagesLoading}
      />
    </div>
  );
}
