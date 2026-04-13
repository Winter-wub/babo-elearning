-- AlterTable: Rebuild PendingRegistration for OTP-based verification
-- Drop relations from EmailVerificationToken and VerificationAttempt first

-- 1. Remove FK and indexes from EmailVerificationToken referencing PendingRegistration
ALTER TABLE "EmailVerificationToken" DROP CONSTRAINT IF EXISTS "EmailVerificationToken_pendingRegId_fkey";
DROP INDEX IF EXISTS "EmailVerificationToken_pendingRegId_idx";
ALTER TABLE "EmailVerificationToken" DROP COLUMN IF EXISTS "pendingRegId";

-- 2. Remove FK and indexes from VerificationAttempt referencing PendingRegistration
ALTER TABLE "VerificationAttempt" DROP CONSTRAINT IF EXISTS "VerificationAttempt_pendingRegId_fkey";
DROP INDEX IF EXISTS "VerificationAttempt_pendingRegId_idx";
DROP INDEX IF EXISTS "VerificationAttempt_pendingRegId_success_createdAt_idx";
ALTER TABLE "VerificationAttempt" DROP COLUMN IF EXISTS "pendingRegId";

-- 3. Drop and recreate PendingRegistration with new schema
DROP TABLE IF EXISTS "PendingRegistration";

CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "otpExpiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sessionToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");
CREATE UNIQUE INDEX "PendingRegistration_sessionToken_key" ON "PendingRegistration"("sessionToken");
CREATE INDEX "PendingRegistration_email_idx" ON "PendingRegistration"("email");
CREATE INDEX "PendingRegistration_sessionToken_idx" ON "PendingRegistration"("sessionToken");
