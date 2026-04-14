import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "max-w-[70%] rounded-br-sm bg-primary text-primary-foreground"
            : "max-w-[75%] rounded-bl-sm bg-muted text-foreground"
        )}
      >
        <div className={cn(!isUser && "whitespace-pre-wrap")}>
          {content}
          {isStreaming && (
            <span className="ml-0.5 inline-block animate-pulse">&#9647;</span>
          )}
        </div>
      </div>
    </div>
  );
}
