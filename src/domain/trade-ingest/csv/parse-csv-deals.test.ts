import { describe, it, expect } from "vitest";
import { parseCsvDeals, CsvParseError } from "./parse-csv-deals";

const VALID_CSV = `ticket,openTime,type,volume,price,profit
1001,2025-01-15T10:30:00.000Z,buy,0.1,1.1234,50.25
1002,2025-01-15T11:00:00.000Z,sell,0.2,1.1200,-30.50`;

describe("parseCsvDeals", () => {
  describe("happy path", () => {
    it("parses valid CSV with required columns", () => {
      const deals = parseCsvDeals(VALID_CSV);

      expect(deals).toHaveLength(2);
      expect(deals[0]).toEqual({
        ticket: 1001,
        openTime: "2025-01-15T10:30:00.000Z",
        type: "buy",
        volume: 0.1,
        price: 1.1234,
        profit: 50.25,
      });
      expect(deals[1]).toEqual({
        ticket: 1002,
        openTime: "2025-01-15T11:00:00.000Z",
        type: "sell",
        volume: 0.2,
        price: 1.12,
        profit: -30.5,
      });
    });

    it("parses CSV with optional columns", () => {
      const csv = `ticket,openTime,type,volume,price,profit,sl,tp,symbol,comment
1001,2025-01-15T10:30:00Z,buy,0.1,1.1234,50.25,1.1100,1.1400,EURUSD,TP hit`;

      const deals = parseCsvDeals(csv);

      expect(deals).toHaveLength(1);
      expect(deals[0].sl).toBe(1.11);
      expect(deals[0].tp).toBe(1.14);
      expect(deals[0].symbol).toBe("EURUSD");
      expect(deals[0].comment).toBe("TP hit");
    });

    it("handles headers in different order", () => {
      const csv = `profit,type,ticket,price,volume,openTime
100,buy,999,1.5,0.3,2025-06-01T12:00:00Z`;

      const deals = parseCsvDeals(csv);

      expect(deals).toHaveLength(1);
      expect(deals[0].ticket).toBe(999);
      expect(deals[0].profit).toBe(100);
    });

    it("is case-insensitive for headers", () => {
      const csv = `Ticket,OpenTime,Type,Volume,Price,Profit
1001,2025-01-15T10:30:00Z,buy,0.1,1.12,50`;

      const deals = parseCsvDeals(csv);
      expect(deals).toHaveLength(1);
      expect(deals[0].ticket).toBe(1001);
    });

    it("handles YYYY-MM-DD HH:mm:ss timestamps", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,2025-01-15 10:30:00,buy,0.1,1.12,50`;

      const deals = parseCsvDeals(csv);
      expect(deals).toHaveLength(1);
      // Date constructor parses this format
      const d = new Date(deals[0].openTime);
      expect(d.getTime()).not.toBeNaN();
    });

    it("handles balance-type rows (passed through for downstream filtering)", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,2025-01-15T10:30:00Z,balance,0,0,10000`;

      const deals = parseCsvDeals(csv);
      expect(deals).toHaveLength(1);
      expect(deals[0].type).toBe("balance");
    });

    it("trims whitespace from values", () => {
      const csv = `ticket,openTime,type,volume,price,profit
  1001 , 2025-01-15T10:30:00Z ,  buy  , 0.1 , 1.12 , 50 `;

      const deals = parseCsvDeals(csv);
      expect(deals).toHaveLength(1);
      expect(deals[0].ticket).toBe(1001);
      expect(deals[0].type).toBe("buy");
    });

    it("handles empty optional columns", () => {
      const csv = `ticket,openTime,type,volume,price,profit,sl,tp,symbol,comment
1001,2025-01-15T10:30:00Z,buy,0.1,1.12,50,,,,`;

      const deals = parseCsvDeals(csv);
      expect(deals).toHaveLength(1);
      expect(deals[0].sl).toBeUndefined();
      expect(deals[0].tp).toBeUndefined();
      expect(deals[0].symbol).toBeUndefined();
      expect(deals[0].comment).toBeUndefined();
    });

    it("handles Windows line endings (CRLF)", () => {
      const csv =
        "ticket,openTime,type,volume,price,profit\r\n1001,2025-01-15T10:30:00Z,buy,0.1,1.12,50\r\n";
      const deals = parseCsvDeals(csv);
      expect(deals).toHaveLength(1);
    });

    it("handles quoted fields with commas", () => {
      const csv = `ticket,openTime,type,volume,price,profit,comment
1001,2025-01-15T10:30:00Z,buy,0.1,1.12,50,"TP hit, partial close"`;

      const deals = parseCsvDeals(csv);
      expect(deals).toHaveLength(1);
      expect(deals[0].comment).toBe("TP hit, partial close");
    });

    it("produces deterministic output for same input", () => {
      const deals1 = parseCsvDeals(VALID_CSV);
      const deals2 = parseCsvDeals(VALID_CSV);
      expect(deals1).toEqual(deals2);
    });
  });

  describe("fail-closed: header errors", () => {
    it("rejects empty CSV", () => {
      expect(() => parseCsvDeals("")).toThrow(CsvParseError);
      expect(() => parseCsvDeals("  \n  \n  ")).toThrow(CsvParseError);
    });

    it("rejects missing required columns", () => {
      const csv = `ticket,openTime,type
1001,2025-01-15T10:30:00Z,buy`;

      try {
        parseCsvDeals(csv);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CsvParseError);
        const e = err as CsvParseError;
        expect(e.details.some((d) => d.includes("volume"))).toBe(true);
        expect(e.details.some((d) => d.includes("price"))).toBe(true);
        expect(e.details.some((d) => d.includes("profit"))).toBe(true);
      }
    });

    it("rejects unknown/extra columns", () => {
      const csv = `ticket,openTime,type,volume,price,profit,unknownCol
1001,2025-01-15T10:30:00Z,buy,0.1,1.12,50,extra`;

      try {
        parseCsvDeals(csv);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CsvParseError);
        const e = err as CsvParseError;
        expect(e.details.some((d) => d.includes("unknowncol"))).toBe(true);
      }
    });

    it("rejects duplicate headers", () => {
      const csv = `ticket,openTime,type,volume,price,profit,ticket
1001,2025-01-15T10:30:00Z,buy,0.1,1.12,50,1001`;

      expect(() => parseCsvDeals(csv)).toThrow(CsvParseError);
    });

    it("rejects header-only CSV (no data rows)", () => {
      const csv = `ticket,openTime,type,volume,price,profit`;

      expect(() => parseCsvDeals(csv)).toThrow(CsvParseError);
    });
  });

  describe("fail-closed: data errors", () => {
    it("rejects invalid numbers", () => {
      const csv = `ticket,openTime,type,volume,price,profit
abc,2025-01-15T10:30:00Z,buy,0.1,1.12,50`;

      try {
        parseCsvDeals(csv);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CsvParseError);
        const e = err as CsvParseError;
        expect(e.details.some((d) => d.includes("ticket"))).toBe(true);
      }
    });

    it("rejects NaN values", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,2025-01-15T10:30:00Z,buy,NaN,1.12,50`;

      expect(() => parseCsvDeals(csv)).toThrow(CsvParseError);
    });

    it("rejects Infinity values", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,2025-01-15T10:30:00Z,buy,0.1,Infinity,50`;

      expect(() => parseCsvDeals(csv)).toThrow(CsvParseError);
    });

    it("rejects invalid date formats", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,not-a-date,buy,0.1,1.12,50`;

      expect(() => parseCsvDeals(csv)).toThrow(CsvParseError);
    });

    it("rejects empty required cells", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,2025-01-15T10:30:00Z,buy,,1.12,50`;

      try {
        parseCsvDeals(csv);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CsvParseError);
        const e = err as CsvParseError;
        expect(e.details.some((d) => d.includes("volume"))).toBe(true);
      }
    });

    it("rejects empty type", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,2025-01-15T10:30:00Z,,0.1,1.12,50`;

      expect(() => parseCsvDeals(csv)).toThrow(CsvParseError);
    });

    it("rejects wrong column count in data row", () => {
      const csv = `ticket,openTime,type,volume,price,profit
1001,2025-01-15T10:30:00Z,buy,0.1`;

      expect(() => parseCsvDeals(csv)).toThrow(CsvParseError);
    });

    it("collects all errors from multiple bad rows", () => {
      const csv = `ticket,openTime,type,volume,price,profit
abc,2025-01-15T10:30:00Z,buy,0.1,1.12,50
1002,not-a-date,sell,0.2,1.12,30`;

      try {
        parseCsvDeals(csv);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CsvParseError);
        const e = err as CsvParseError;
        expect(e.details.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
