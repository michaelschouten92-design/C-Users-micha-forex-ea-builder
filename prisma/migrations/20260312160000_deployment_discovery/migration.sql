-- Add deployment discovery support (account-wide mode)

-- Source field on TerminalDeployment: PRECISE (symbol-only) vs DISCOVERED (account-wide)
ALTER TABLE "TerminalDeployment" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'PRECISE';

-- Unattributed trade count on TerminalConnection (trades with magic=0)
ALTER TABLE "TerminalConnection" ADD COLUMN "unattributedTradeCount" INTEGER NOT NULL DEFAULT 0;
