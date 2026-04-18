-- CreateIndex
CREATE INDEX "AuditLog_createdAt_action_entityType_idx" ON "AuditLog"("createdAt", "action", "entityType");
