-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "thumbnailAlt" TEXT,
ADD COLUMN     "thumbnailKey" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "thumbnailAlt" TEXT,
ADD COLUMN     "thumbnailKey" TEXT;
