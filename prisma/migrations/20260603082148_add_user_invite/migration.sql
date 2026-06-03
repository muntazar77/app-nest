-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserInvite_orgId_email_idx" ON "UserInvite"("orgId", "email");

-- CreateIndex
CREATE INDEX "UserInvite_orgId_expiresAt_idx" ON "UserInvite"("orgId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_orgId_email_usedAt_key" ON "UserInvite"("orgId", "email", "usedAt");

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
