"use client";

import { useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./chat-message";
import { ChatInputBar } from "./chat-input-bar";
import { ChatEmptyState } from "./chat-empty-state";
import { TypingIndicator } from "./typing-indicator";
import { BetaDisclaimerBanner } from "./beta-disclaimer-banner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPaneProps {
  messages: Message[];
  streamingContent: string | null;
  isLoading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onRetry: () => void;
}

export function ChatPane({
  messages,
  streamingContent,
  isLoading,
  error,
  onSend,
  onRetry,
}: ChatPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <Badge
          variant="outline"
          className="border-amber-600/40 bg-amber-50 text-xs text-amber-600 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-400"
        >
          Beta
        </Badge>
      </div>

      {/* Disclaimer */}
      <div className="px-6 pt-3">
        <BetaDisclaimerBanner />
      </div>

      {/* Messages */}
      {isEmpty ? (
        <ChatEmptyState onSuggestionClick={onSend} />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4"
          role="log"
          aria-live="polite"
          aria-label="การสนทนา"
        >
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
              />
            ))}
            {streamingContent !== null && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                isStreaming
              />
            )}
            {isLoading && streamingContent === null && <TypingIndicator />}
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p>{error}</p>
                <button
                  onClick={onRetry}
                  className="mt-2 text-sm font-medium underline underline-offset-2"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInputBar onSend={onSend} disabled={isLoading} />
    </div>
  );
}
