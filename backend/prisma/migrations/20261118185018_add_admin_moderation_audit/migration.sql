-- CreateTable
CREATE TABLE "AdminModerationAction" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "targetEmailSnapshot" TEXT NOT NULL,
    "previousStatus" "UserStatus" NOT NULL,
    "nextStatus" "UserStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminModerationAction_targetUserId_createdAt_idx" ON "AdminModerationAction"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminModerationAction_adminId_createdAt_idx" ON "AdminModerationAction"("adminId", "createdAt");
