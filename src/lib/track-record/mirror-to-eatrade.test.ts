import { describe, it, expect, vi, beforeEach } from "vitest";
import { mirrorTradeEventToEATrade } from "./mirror-to-eatrade";

const mockUpsert = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockCreate = vi.fn().mockResolvedValue(undefined);
const mockFindUnique = vi.fn();

const fakePrisma = {
  eATrade: {
    upsert: (...args: unknown[]) => mockUpsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    findUnique: (...args: unknown[]) => mockFindUnique(...args),
  },
} as unknown as Parameters<typeof mirrorTradeEventToEATrade>[0];

const INSTANCE_ID = "inst_abc";
const TIMESTAMP = 1_700_000_000;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mirrorTradeEventToEATrade", () => {
  describe("TRADE_OPEN", () => {
    it("upserts a new row with all payload fields", async () => {
      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_OPEN",
        timestamp: TIMESTAMP,
        payload: {
          ticket: 12345,
          symbol: "eurusd",
          direction: "SELL",
          lots: 0.5,
          openPrice: 1.0825,
          magicNumber: 77,
        },
      });

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const args = mockUpsert.mock.calls[0][0];
      expect(args.where).toEqual({
        instanceId_ticket: { instanceId: INSTANCE_ID, ticket: "12345" },
      });
      expect(args.create).toMatchObject({
        instanceId: INSTANCE_ID,
        ticket: "12345",
        symbol: "EURUSD",
        type: "SELL",
        openPrice: 1.0825,
        lots: 0.5,
        profit: 0,
        magicNumber: 77,
      });
      expect(args.create.openTime).toEqual(new Date(TIMESTAMP * 1000));
      // Update branch must be a no-op so that any close already persisted wins.
      expect(args.update).toEqual({});
    });

    it("skips when ticket is missing", async () => {
      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_OPEN",
        timestamp: TIMESTAMP,
        payload: { symbol: "EURUSD" },
      });
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips when symbol is missing", async () => {
      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_OPEN",
        timestamp: TIMESTAMP,
        payload: { ticket: "123" },
      });
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("defaults direction to BUY when absent", async () => {
      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_OPEN",
        timestamp: TIMESTAMP,
        payload: { ticket: "1", symbol: "XAUUSD" },
      });
      expect(mockUpsert.mock.calls[0][0].create.type).toBe("BUY");
    });
  });

  describe("TRADE_CLOSE", () => {
    it("updates an existing row with close fields", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "trade_1" });

      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_CLOSE",
        timestamp: TIMESTAMP,
        payload: { ticket: "42", closePrice: 1.1, profit: 25.5 },
      });

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockCreate).not.toHaveBeenCalled();
      const args = mockUpdate.mock.calls[0][0];
      expect(args.where).toEqual({
        instanceId_ticket: { instanceId: INSTANCE_ID, ticket: "42" },
      });
      expect(args.data).toMatchObject({
        closePrice: 1.1,
        profit: 25.5,
      });
      expect(args.data.closeTime).toEqual(new Date(TIMESTAMP * 1000));
    });

    it("writes an __ORPHAN__ placeholder when no matching TRADE_OPEN was seen", async () => {
      // audit-1 P1-6: previously the mirror skipped orphan TRADE_CLOSE
      // events silently, which cost edge-score its data. Now we persist
      // a placeholder row with a sentinel symbol so aggregates include
      // the P&L while per-symbol UI surfaces filter the row out.
      mockFindUnique.mockResolvedValueOnce(null);

      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_CLOSE",
        timestamp: TIMESTAMP,
        payload: { ticket: "99", closePrice: 1.0, profit: -10 },
      });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            instanceId: INSTANCE_ID,
            ticket: "99",
            symbol: "__ORPHAN__",
            profit: -10,
            closePrice: 1.0,
          }),
        })
      );
    });

    it("skips when ticket is missing", async () => {
      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_CLOSE",
        timestamp: TIMESTAMP,
        payload: { profit: 10 },
      });
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("coerces numeric tickets to trimmed strings", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "trade_1", openPrice: 1.2 });

      await mirrorTradeEventToEATrade(fakePrisma, {
        instanceId: INSTANCE_ID,
        eventType: "TRADE_CLOSE",
        timestamp: TIMESTAMP,
        payload: { ticket: 7, closePrice: 2, profit: 3 },
      });

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { instanceId_ticket: { instanceId: INSTANCE_ID, ticket: "7" } },
        // audit-1 P0-A1: select now includes openPrice for the
        // closePrice=null fallback path.
        select: { id: true, openPrice: true },
      });
    });
  });
});
