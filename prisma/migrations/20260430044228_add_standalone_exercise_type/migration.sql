-- AlterEnum
ALTER TYPE "ExerciseType" ADD VALUE 'STANDALONE';

-- AlterTable
ALTER TABLE "Exercise" ALTER COLUMN "videoId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Exercise_type_idx" ON "Exercise"("type");
