-- AlterTable
ALTER TABLE "Video" ADD COLUMN "playCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Video_isFeatured_idx" ON "Video"("isFeatured");

-- CreateIndex
CREATE INDEX "Video_playCount_idx" ON "Video"("playCount");
