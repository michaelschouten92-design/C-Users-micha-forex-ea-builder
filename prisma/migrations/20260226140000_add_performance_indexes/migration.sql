-- Add index for trade performance queries (closeTime filtering in groupBy)
CREATE INDEX "EATrade_instanceId_closeTime_idx" ON "EATrade"("instanceId", "closeTime");

-- Add composite index for health snapshot lookups by instance + status
CREATE INDEX "HealthSnapshot_instanceId_status_idx" ON "HealthSnapshot"("instanceId", "status");

-- Add index for grace-period key lookups in telemetry auth
CREATE INDEX "LiveEAInstance_apiKeyHashPrev_keyGracePeriodEnd_idx" ON "LiveEAInstance"("apiKeyHashPrev", "keyGracePeriodEnd");
