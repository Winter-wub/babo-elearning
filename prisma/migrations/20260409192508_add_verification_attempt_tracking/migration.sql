-- CreateTable
CREATE TABLE "VerificationAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationAttempt_userId_idx" ON "VerificationAttempt"("userId");

-- CreateIndex
CREATE INDEX "VerificationAttempt_createdAt_idx" ON "VerificationAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "VerificationAttempt_userId_success_createdAt_idx" ON "VerificationAttempt"("userId", "success", "createdAt");

-- AddForeignKey
ALTER TABLE "VerificationAttempt" ADD CONSTRAINT "VerificationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
