"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type ConversationSummary = {
  id: string;
  title: string | null;
  lastMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationDetail = {
  id: string;
  title: string | null;
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }[];
  createdAt: Date;
};

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

export async function getConversations(): Promise<
  ActionResult<ConversationSummary[]>
> {
  try {
    const session = await requireAdmin();

    const conversations = await db.adminChatConversation.findMany({
      where: { adminId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true },
        },
      },
    });

    return {
      success: true,
      data: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        lastMessage: c.messages[0]?.content?.slice(0, 100) ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  } catch {
    return { success: false, error: "ไม่สามารถโหลดการสนทนาได้" };
  }
}

export async function getConversation(
  conversationId: string
): Promise<ActionResult<ConversationDetail>> {
  try {
    const session = await requireAdmin();

    const conversation = await db.adminChatConversation.findUnique({
      where: { id: conversationId, adminId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    if (!conversation) {
      return { success: false, error: "ไม่พบการสนทนา" };
    }

    return {
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
      },
    };
  } catch {
    return { success: false, error: "ไม่สามารถโหลดการสนทนาได้" };
  }
}

export async function deleteConversation(
  conversationId: string
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    await db.adminChatConversation.delete({
      where: { id: conversationId, adminId: session.user.id },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "ไม่สามารถลบการสนทนาได้" };
  }
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    await db.adminChatConversation.update({
      where: { id: conversationId, adminId: session.user.id },
      data: { title: title.slice(0, 100) },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "ไม่สามารถแก้ไขชื่อได้" };
  }
}
