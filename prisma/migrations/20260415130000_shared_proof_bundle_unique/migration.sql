-- Enforce one SharedProofBundle per (instanceId, userId). The share endpoint's
-- "find existing or create" flow was racy; two concurrent POSTs could both
-- skip the check and create duplicates. The DELETE handler already treats
-- them as 1:1 (deleteMany by (instanceId, userId)), so the unique constraint
-- matches intended semantics.

-- Collapse any existing duplicates before the constraint is enforced.
-- Keep the OLDEST row (lowest createdAt) per (instanceId, userId): older
-- tokens are more likely to already be in use (URLs shared, embedded in
-- emails, indexed). Discarding them would 404 active share links.
DELETE FROM "SharedProofBundle" a
USING "SharedProofBundle" b
WHERE a."instanceId" = b."instanceId"
  AND a."userId"     = b."userId"
  AND a."createdAt"  > b."createdAt";

CREATE UNIQUE INDEX "SharedProofBundle_instanceId_userId_key"
  ON "SharedProofBundle"("instanceId", "userId");
