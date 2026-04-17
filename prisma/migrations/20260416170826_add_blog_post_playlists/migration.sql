-- CreateTable
CREATE TABLE "BlogPostPlaylist" (
    "postId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BlogPostPlaylist_pkey" PRIMARY KEY ("postId","playlistId")
);

-- CreateIndex
CREATE INDEX "BlogPostPlaylist_postId_idx" ON "BlogPostPlaylist"("postId");

-- CreateIndex
CREATE INDEX "BlogPostPlaylist_playlistId_idx" ON "BlogPostPlaylist"("playlistId");

-- AddForeignKey
ALTER TABLE "BlogPostPlaylist" ADD CONSTRAINT "BlogPostPlaylist_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostPlaylist" ADD CONSTRAINT "BlogPostPlaylist_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
