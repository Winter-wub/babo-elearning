-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientIp" TEXT,
ADD COLUMN     "clientUserAgent" TEXT,
ADD COLUMN     "fbBrowserId" TEXT,
ADD COLUMN     "fbClickId" TEXT,
ADD COLUMN     "metaEventId" TEXT;
