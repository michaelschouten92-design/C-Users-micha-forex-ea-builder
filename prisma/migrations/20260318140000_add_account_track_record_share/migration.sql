-- CreateTable
CREATE TABLE "AccountTrackRecordShare" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "baseInstanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountTrackRecordShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountTrackRecordShare_token_key" ON "AccountTrackRecordShare"("token");

-- CreateIndex
CREATE INDEX "AccountTrackRecordShare_baseInstanceId_idx" ON "AccountTrackRecordShare"("baseInstanceId");

-- AddForeignKey
ALTER TABLE "AccountTrackRecordShare" ADD CONSTRAINT "AccountTrackRecordShare_baseInstanceId_fkey" FOREIGN KEY ("baseInstanceId") REFERENCES "LiveEAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTrackRecordShare" ADD CONSTRAINT "AccountTrackRecordShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
