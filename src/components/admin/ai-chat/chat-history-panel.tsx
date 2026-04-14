"use client";

import { Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/actions/chat.actions";

interface ChatHistoryPanelProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return new Date(date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

export function ChatHistoryPanel({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ChatHistoryPanelProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          สนทนาใหม่
        </Button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2 pb-2"
        aria-label="ประวัติการสนทนา"
      >
        {conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีการสนทนา
          </p>
        )}
        {conversations.map((conv) => (
          <div key={conv.id} className="group relative">
            <button
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                activeId === conv.id && "bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate font-medium text-foreground">
                  {conv.title ?? "สนทนาใหม่"}
                </p>
              </div>
              <p className="mt-0.5 truncate pl-5.5 text-xs text-muted-foreground">
                {formatRelativeDate(conv.updatedAt)}
              </p>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              aria-label="ลบการสนทนา"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </nav>
    </div>
  );
}
