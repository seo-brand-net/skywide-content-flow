import { Send, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { FileUploadZone } from './FileUploadZone';
import { ModelSelector } from './ModelSelector';
import { Message } from '@/services/aiRewriterService';

interface ChatInterfaceProps {
  conversationId: string | null;
  conversationTitle: string;
  documentName: string | null;
  messages: Message[];
  onSendMessage: (message: string, model: string) => void;
  onFileUpload: (file: File) => void;
  isStreaming: boolean;
  streamingContent: string;
  showFileUpload: boolean;
  documentJustLoaded: boolean;
  loading?: boolean;
}

export function ChatInterface({
  conversationId,
  conversationTitle,
  documentName,
  messages,
  onSendMessage,
  onFileUpload,
  isStreaming,
  streamingContent,
  showFileUpload,
  documentJustLoaded,
  loading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5-2025-08-07');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || !conversationId || isStreaming) return;
    onSendMessage(input, selectedModel);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-2 text-foreground">Welcome to AI Rewriter</h2>
          <p className="text-muted-foreground">
            Start a new conversation to begin rewriting and improving your content with AI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-foreground">{conversationTitle}</h2>
          {documentName && (
            <p className="text-sm text-muted-foreground">📄 {documentName}</p>
          )}
        </div>
        <ModelSelector value={selectedModel} onChange={setSelectedModel} disabled={isStreaming} />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {showFileUpload && messages.length === 0 && (
              <div className="mb-8">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Upload a document to get started, or start chatting directly
                </p>
                <FileUploadZone onFileSelect={onFileUpload} disabled={isStreaming} />
              </div>
            )}

            {messages.length === 0 && !showFileUpload && !documentJustLoaded && (
              <div className="text-center py-8 text-muted-foreground">
                Type a message to start the conversation
              </div>
            )}

            {documentJustLoaded && messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-3 rounded-lg mb-4">
                  <span className="text-lg">✓</span>
                  <span className="font-medium">Document loaded: {documentName}</span>
                </div>
                <p className="text-muted-foreground">
                  Now tell me what you'd like me to do with it. For example:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• "Make this more professional and concise"</li>
                  <li>• "Rewrite this in a casual tone"</li>
                  <li>• "Summarize the key points"</li>
                </ul>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.created_at}
              />
            ))}

            {isStreaming && streamingContent && (
              <MessageBubble
                role="assistant"
                content={streamingContent}
                timestamp={new Date().toISOString()}
              />
            )}
          </>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift + Enter for new line)"
            className="resize-none min-h-[60px] max-h-[200px]"
            disabled={isStreaming || !conversationId}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || !conversationId}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
