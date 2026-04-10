-- Drop BacktestUpload.originalHtml — write-only storage with zero read paths
--
-- The column was originally intended for "re-parsing" but no re-parse feature
-- was ever built. The only write site is /api/backtest/upload (stores the full
-- sanitized HTML) and there are no read sites anywhere in the codebase. With
-- a 5 MB max upload size, 1000 uploads = 5 GB of dead storage. Dedup uses the
-- separate contentHash column (SHA-256) so dropping originalHtml has no
-- functional impact. If re-parsing is ever needed, users can re-upload.
ALTER TABLE "BacktestUpload" DROP COLUMN "originalHtml";
