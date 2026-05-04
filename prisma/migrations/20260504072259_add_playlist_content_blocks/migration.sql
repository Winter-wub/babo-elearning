-- CreateEnum
CREATE TYPE "ContentBlockType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'PDF');

-- CreateTable
CREATE TABLE "PlaylistContentBlock" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "type" "ContentBlockType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "s3Key" TEXT,
    "filename" TEXT,
    "contentType" TEXT,
    "fileSize" INTEGER,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaylistContentBlock_playlistId_sortOrder_idx" ON "PlaylistContentBlock"("playlistId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PlaylistContentBlock" ADD CONSTRAINT "PlaylistContentBlock_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
