-- CreateTable
CREATE TABLE "AdminChatConversation" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminChatConversation_adminId_idx" ON "AdminChatConversation"("adminId");

-- CreateIndex
CREATE INDEX "AdminChatMessage_conversationId_idx" ON "AdminChatMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "AdminChatConversation" ADD CONSTRAINT "AdminChatConversation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatMessage" ADD CONSTRAINT "AdminChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AdminChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
