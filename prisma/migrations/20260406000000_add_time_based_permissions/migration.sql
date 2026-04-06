-- AlterTable: Add time-based access control fields to VideoPermission
ALTER TABLE "VideoPermission" ADD COLUMN "validFrom" TIMESTAMP(3);
ALTER TABLE "VideoPermission" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "VideoPermission" ADD COLUMN "durationDays" INTEGER;

-- CreateIndex
CREATE INDEX "VideoPermission_validUntil_idx" ON "VideoPermission"("validUntil");
