import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AiChatShell } from "@/components/admin/ai-chat/ai-chat-shell";
import { getConversations } from "@/actions/chat.actions";

export const metadata: Metadata = {
  title: "AI Chat (Beta)",
};

export default async function AiChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  if (process.env.NEXT_PUBLIC_AI_CHAT_ENABLED !== "true") {
    redirect("/admin/dashboard");
  }

  const result = await getConversations();
  const conversations = result.success ? result.data : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Chat</h1>
        <p className="text-sm text-muted-foreground">
          ผู้ช่วย AI สำหรับดูข้อมูลและวิเคราะห์แพลตฟอร์ม
        </p>
      </div>

      <AiChatShell initialConversations={conversations} />
    </div>
  );
}
