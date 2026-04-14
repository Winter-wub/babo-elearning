"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatHistoryPanel } from "./chat-history-panel";
import { ChatPane } from "./chat-pane";
import type { Message } from "./chat-pane";
import {
  getConversations,
  getConversation,
  deleteConversation,
} from "@/actions/chat.actions";
import type { ConversationSummary } from "@/actions/chat.actions";

interface AiChatShellProps {
  initialConversations: ConversationSummary[];
}

export function AiChatShell({ initialConversations }: AiChatShellProps) {
  const [conversations, setConversations] =
    useState<ConversationSummary[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastMessageRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const refreshConversations = useCallback(async () => {
    const result = await getConversations();
    if (result.success) {
      setConversations(result.data);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    const result = await getConversation(id);
    if (result.success) {
      setActiveConversationId(id);
      setMessages(
        result.data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      setError(null);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent(null);
    setError(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await deleteConversation(id);
      if (result.success) {
        if (activeConversationId === id) {
          handleNewChat();
        }
        await refreshConversations();
      }
    },
    [activeConversationId, handleNewChat, refreshConversations]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      lastMessageRef.current = text;

      // Optimistically add user message
      const tempId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: text },
      ]);

      try {
        const response = await fetch("/api/admin/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversationId,
            message: text,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error ?? `Error ${response.status}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";
        let conversationId = activeConversationId;

        setStreamingContent("");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.conversationId && !conversationId) {
                conversationId = parsed.conversationId;
                setActiveConversationId(conversationId);
              }

              if (parsed.text) {
                fullContent += parsed.text;
                setStreamingContent(fullContent);
              }

              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== data) throw e;
            }
          }
        }

        // Streaming complete — add the full message
        setStreamingContent(null);
        if (fullContent) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: fullContent,
            },
          ]);
        }

        await refreshConversations();
      } catch (err) {
        setStreamingContent(null);
        setError(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeConversationId, refreshConversations]
  );

  const handleRetry = useCallback(() => {
    if (lastMessageRef.current) {
      // Remove the failed user message
      setMessages((prev) => prev.slice(0, -1));
      setError(null);
      sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-lg border bg-background">
      <div className="hidden lg:block">
        <ChatHistoryPanel
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={loadConversation}
          onNew={handleNewChat}
          onDelete={handleDelete}
        />
      </div>
      <ChatPane
        messages={messages}
        streamingContent={streamingContent}
        isLoading={isLoading}
        error={error}
        onSend={sendMessage}
        onRetry={handleRetry}
      />
    </div>
  );
}
