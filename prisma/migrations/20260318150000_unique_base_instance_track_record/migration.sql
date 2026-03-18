-- DropIndex (replace non-unique index with unique constraint)
DROP INDEX "AccountTrackRecordShare_baseInstanceId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "AccountTrackRecordShare_baseInstanceId_key" ON "AccountTrackRecordShare"("baseInstanceId");
