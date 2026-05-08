-- CreateEnum
CREATE TYPE "EventProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRIED');

-- AlterTable
ALTER TABLE "ConversationEvent"
ADD COLUMN "processingStatus" "EventProcessingStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "errorMessage" TEXT;

-- CreateIndex
CREATE INDEX "ConversationEvent_direction_createdAt_idx" ON "ConversationEvent"("direction", "createdAt");
CREATE INDEX "ConversationEvent_userId_createdAt_idx" ON "ConversationEvent"("userId", "createdAt");
CREATE INDEX "Payment_groupId_paidAt_idx" ON "Payment"("groupId", "paidAt");
CREATE INDEX "Payment_memberUserId_paidAt_idx" ON "Payment"("memberUserId", "paidAt");
CREATE INDEX "User_whatsappNumber_idx" ON "User"("whatsappNumber");
