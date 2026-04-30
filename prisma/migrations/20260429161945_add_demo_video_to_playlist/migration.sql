-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "demoVideoId" TEXT;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_demoVideoId_fkey" FOREIGN KEY ("demoVideoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
