-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('PRE_TEST', 'POST_TEST');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SHORT_ANSWER', 'PARAGRAPH', 'MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN', 'LINEAR_SCALE', 'MATCHING', 'TRUE_FALSE', 'FILL_IN_BLANK');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseQuestion" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAttempt" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER,
    "totalPoints" INTEGER,
    "earnedPoints" INTEGER,
    "passed" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_videoId_idx" ON "Exercise"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_videoId_type_key" ON "Exercise"("videoId", "type");

-- CreateIndex
CREATE INDEX "ExerciseQuestion_exerciseId_sortOrder_idx" ON "ExerciseQuestion"("exerciseId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_exerciseId_idx" ON "ExerciseAttempt"("exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_userId_idx" ON "ExerciseAttempt"("userId");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_userId_exerciseId_idx" ON "ExerciseAttempt"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "StudentAnswer_attemptId_idx" ON "StudentAnswer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_attemptId_questionId_key" ON "StudentAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseQuestion" ADD CONSTRAINT "ExerciseQuestion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExerciseAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExerciseQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
