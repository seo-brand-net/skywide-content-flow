"use client";

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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';


export default function AIRewriter() {
    const { user } = useAuth();
    const { toast } = useToast();
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
            toast({
                title: "Error",
                description: "Failed to load conversations.",
                variant: "destructive",
            });
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
            toast({
                title: "Error",
                description: "Failed to load messages.",
                variant: "destructive",
            });
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
            toast({
                title: "Error",
                description: "Failed to create conversation.",
                variant: "destructive",
            });
            return;
        }

        if (data) {
            setConversations([data, ...conversations]);
            setCurrentConversationId(data.id);
            setMessages([]);
            setShowFileUpload(true);
            toast({
                title: "Success",
                description: "New conversation created.",
            });
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
            toast({
                title: "Error",
                description: "Failed to delete conversation.",
                variant: "destructive",
            });
            return;
        }

        setConversations(conversations.filter((c) => c.id !== id));
        if (currentConversationId === id) {
            setCurrentConversationId(null);
            setMessages([]);
        }
        toast({
            title: "Success",
            description: "Conversation deleted.",
        });
    };

    const handleFileUpload = async (file: File) => {
        if (!currentConversationId) return;

        // We can't use sonner toast directly if not installed, adapting to use-toast. 
        // Assuming use-toast is standard. 
        // The original code used toast.loading which use-toast doesn't support directly, 
        // so we'll just show a loading state or simple message.

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
                toast({
                    title: "Success",
                    description: `Document "${result.fileName}" loaded successfully.`,
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : 'Failed to upload document',
                variant: "destructive",
            });
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
                toast({
                    title: "Error",
                    description: error,
                    variant: "destructive",
                });
            }
        );
    };

    const currentConversation = conversations.find((c) => c.id === currentConversationId);

    return (
        <div className="flex h-[calc(100vh-64px)]"> {/* Adjusted height to account for layout/navbar if any */}
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
