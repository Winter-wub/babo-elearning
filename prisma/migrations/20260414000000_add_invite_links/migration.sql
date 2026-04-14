-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "videoIds" TEXT[],
    "timeMode" TEXT NOT NULL,
    "durationDays" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "currentRedemptions" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteLinkRedemption" (
    "id" TEXT NOT NULL,
    "inviteLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteLinkRedemption_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PendingRegistration" ADD COLUMN "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_code_key" ON "InviteLink"("code");

-- CreateIndex
CREATE INDEX "InviteLink_code_idx" ON "InviteLink"("code");

-- CreateIndex
CREATE INDEX "InviteLink_createdBy_idx" ON "InviteLink"("createdBy");

-- CreateIndex
CREATE INDEX "InviteLink_expiresAt_idx" ON "InviteLink"("expiresAt");

-- CreateIndex
CREATE INDEX "InviteLinkRedemption_inviteLinkId_idx" ON "InviteLinkRedemption"("inviteLinkId");

-- CreateIndex
CREATE INDEX "InviteLinkRedemption_userId_idx" ON "InviteLinkRedemption"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteLinkRedemption_inviteLinkId_userId_key" ON "InviteLinkRedemption"("inviteLinkId", "userId");

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLinkRedemption" ADD CONSTRAINT "InviteLinkRedemption_inviteLinkId_fkey" FOREIGN KEY ("inviteLinkId") REFERENCES "InviteLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLinkRedemption" ADD CONSTRAINT "InviteLinkRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
