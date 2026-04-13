-- AlterTable
ALTER TABLE "EmailVerificationToken" ADD COLUMN     "pendingRegId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VerificationAttempt" ADD COLUMN     "pendingRegId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");

-- CreateIndex
CREATE INDEX "PendingRegistration_email_idx" ON "PendingRegistration"("email");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_pendingRegId_idx" ON "EmailVerificationToken"("pendingRegId");

-- CreateIndex
CREATE INDEX "VerificationAttempt_pendingRegId_idx" ON "VerificationAttempt"("pendingRegId");

-- CreateIndex
CREATE INDEX "VerificationAttempt_pendingRegId_success_createdAt_idx" ON "VerificationAttempt"("pendingRegId", "success", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_pendingRegId_fkey" FOREIGN KEY ("pendingRegId") REFERENCES "PendingRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAttempt" ADD CONSTRAINT "VerificationAttempt_pendingRegId_fkey" FOREIGN KEY ("pendingRegId") REFERENCES "PendingRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
