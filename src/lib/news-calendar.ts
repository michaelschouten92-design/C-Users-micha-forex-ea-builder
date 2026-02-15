// Embedded News Calendar — generates economic event data for MQL5 backtesting

type NthWeekdaySchedule = {
  type: "nthWeekday";
  nth: number;
  weekday: number; // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number;
  minute: number;
};

type DayOfMonthSchedule = {
  type: "dayOfMonth";
  day: number;
  hour: number;
  minute: number;
};

type NthWeekdayInMonthsSchedule = {
  type: "nthWeekdayInMonths";
  nth: number;
  weekday: number;
  months: number[]; // 1-12
  hour: number;
  minute: number;
};

type EventSchedule = NthWeekdaySchedule | DayOfMonthSchedule | NthWeekdayInMonthsSchedule;

interface EventDefinition {
  currency: string;
  importance: number; // 2=medium, 3=high
  name: string;
  schedule: EventSchedule;
}

// --- Event definitions ---

const EVENT_DEFINITIONS: EventDefinition[] = [
  // USD High Impact
  {
    currency: "USD",
    importance: 3,
    name: "Non-Farm Payrolls",
    schedule: { type: "nthWeekday", nth: 1, weekday: 5, hour: 13, minute: 30 },
  },
  {
    currency: "USD",
    importance: 3,
    name: "FOMC Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 3,
      weekday: 3,
      months: [1, 3, 5, 6, 7, 9, 11, 12],
      hour: 19,
      minute: 0,
    },
  },
  {
    currency: "USD",
    importance: 3,
    name: "CPI",
    schedule: { type: "dayOfMonth", day: 13, hour: 13, minute: 30 },
  },
  {
    currency: "USD",
    importance: 3,
    name: "GDP Advance",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 4,
      weekday: 4,
      months: [1, 4, 7, 10],
      hour: 13,
      minute: 30,
    },
  },

  // USD Medium Impact
  {
    currency: "USD",
    importance: 2,
    name: "Retail Sales",
    schedule: { type: "dayOfMonth", day: 15, hour: 13, minute: 30 },
  },
  {
    currency: "USD",
    importance: 2,
    name: "ISM Manufacturing PMI",
    schedule: { type: "nthWeekday", nth: 1, weekday: 1, hour: 15, minute: 0 },
  },

  // EUR High Impact
  {
    currency: "EUR",
    importance: 3,
    name: "ECB Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 1,
      weekday: 4,
      months: [1, 3, 4, 6, 7, 9, 10, 12],
      hour: 13,
      minute: 15,
    },
  },
  {
    currency: "EUR",
    importance: 3,
    name: "CPI Flash",
    schedule: { type: "nthWeekday", nth: 1, weekday: 1, hour: 10, minute: 0 },
  },

  // EUR Medium Impact
  {
    currency: "EUR",
    importance: 2,
    name: "GDP Flash",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 2,
      weekday: 3,
      months: [2, 5, 8, 11],
      hour: 10,
      minute: 0,
    },
  },
  {
    currency: "EUR",
    importance: 2,
    name: "PMI Manufacturing",
    schedule: { type: "nthWeekday", nth: 1, weekday: 1, hour: 9, minute: 0 },
  },

  // GBP High Impact
  {
    currency: "GBP",
    importance: 3,
    name: "BOE Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 1,
      weekday: 4,
      months: [2, 3, 5, 6, 8, 9, 11, 12],
      hour: 12,
      minute: 0,
    },
  },
  {
    currency: "GBP",
    importance: 3,
    name: "CPI",
    schedule: { type: "dayOfMonth", day: 15, hour: 7, minute: 0 },
  },

  // GBP Medium Impact
  {
    currency: "GBP",
    importance: 2,
    name: "GDP",
    schedule: { type: "dayOfMonth", day: 10, hour: 7, minute: 0 },
  },
  {
    currency: "GBP",
    importance: 2,
    name: "Employment",
    schedule: { type: "dayOfMonth", day: 15, hour: 7, minute: 0 },
  },

  // JPY High Impact
  {
    currency: "JPY",
    importance: 3,
    name: "BOJ Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 3,
      weekday: 4,
      months: [1, 3, 4, 6, 7, 9, 10, 12],
      hour: 3,
      minute: 0,
    },
  },
  {
    currency: "JPY",
    importance: 3,
    name: "CPI National",
    schedule: { type: "dayOfMonth", day: 20, hour: 23, minute: 30 },
  },

  // AUD High Impact
  {
    currency: "AUD",
    importance: 3,
    name: "RBA Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 1,
      weekday: 2,
      months: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      hour: 3,
      minute: 30,
    },
  },
  {
    currency: "AUD",
    importance: 3,
    name: "Employment Change",
    schedule: { type: "dayOfMonth", day: 15, hour: 0, minute: 30 },
  },

  // NZD High Impact
  {
    currency: "NZD",
    importance: 3,
    name: "RBNZ Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 3,
      weekday: 3,
      months: [2, 4, 5, 7, 8, 10, 11],
      hour: 2,
      minute: 0,
    },
  },

  // CAD High Impact
  {
    currency: "CAD",
    importance: 3,
    name: "BOC Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 2,
      weekday: 3,
      months: [1, 3, 4, 6, 7, 9, 10, 12],
      hour: 15,
      minute: 0,
    },
  },
  {
    currency: "CAD",
    importance: 3,
    name: "Employment Change",
    schedule: { type: "dayOfMonth", day: 10, hour: 13, minute: 30 },
  },

  // CHF High Impact
  {
    currency: "CHF",
    importance: 3,
    name: "SNB Rate Decision",
    schedule: {
      type: "nthWeekdayInMonths",
      nth: 3,
      weekday: 4,
      months: [3, 6, 9, 12],
      hour: 8,
      minute: 30,
    },
  },
];

// --- Date helpers ---

/**
 * Find the nth occurrence of a weekday in a given month/year.
 * Returns null if it doesn't exist (e.g. 5th Monday in February).
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number, // 1-12
  weekday: number, // 0=Sun..6=Sat
  nth: number
): Date | null {
  let count = 0;
  // Iterate through the month to find the nth weekday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCDay() === weekday) {
      count++;
      if (count === nth) return d;
    }
  }
  return null;
}

/**
 * Adjust a day-of-month to the nearest weekday (Mon-Fri).
 * If the day falls on Saturday, move to Friday.
 * If it falls on Sunday, move to Monday.
 */
function adjustToWeekday(date: Date): Date {
  const dow = date.getUTCDay();
  if (dow === 0) {
    // Sunday -> Monday
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  }
  if (dow === 6) {
    // Saturday -> Friday
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1));
  }
  return date;
}

/**
 * Format a date for MQL5: "YYYY.MM.DD HH:MM"
 */
function formatMQL5Date(d: Date, hour: number, minute: number): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${y}.${m}.${day} ${h}:${min}`;
}

/**
 * Generate all event dates for a single event definition across the year range.
 */
function generateEventsForDefinition(
  def: EventDefinition,
  startYear: number,
  endYear: number
): string[] {
  const results: string[] = [];
  const schedule = def.schedule;

  for (let year = startYear; year <= endYear; year++) {
    switch (schedule.type) {
      case "nthWeekday": {
        // Every month: nth weekday
        for (let month = 1; month <= 12; month++) {
          const d = getNthWeekdayOfMonth(year, month, schedule.weekday, schedule.nth);
          if (d) {
            results.push(
              `${formatMQL5Date(d, schedule.hour, schedule.minute)},${def.importance},${def.currency}`
            );
          }
        }
        break;
      }
      case "dayOfMonth": {
        // Every month: approximate day of month, adjusted to weekday
        for (let month = 1; month <= 12; month++) {
          const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
          const clampedDay = Math.min(schedule.day, daysInMonth);
          const raw = new Date(Date.UTC(year, month - 1, clampedDay));
          const d = adjustToWeekday(raw);
          results.push(
            `${formatMQL5Date(d, schedule.hour, schedule.minute)},${def.importance},${def.currency}`
          );
        }
        break;
      }
      case "nthWeekdayInMonths": {
        // Specific months: nth weekday
        for (const month of schedule.months) {
          const d = getNthWeekdayOfMonth(year, month, schedule.weekday, schedule.nth);
          if (d) {
            results.push(
              `${formatMQL5Date(d, schedule.hour, schedule.minute)},${def.importance},${def.currency}`
            );
          }
        }
        break;
      }
    }
  }

  return results;
}

/**
 * Generate all embedded news data for the given year range.
 * Returns an array of strings in the format: "YYYY.MM.DD HH:MM,importance,CURRENCY"
 * Sorted by date ascending.
 */
export function generateEmbeddedNewsData(startYear: number, endYear: number): string[] {
  const allEvents: string[] = [];

  for (const def of EVENT_DEFINITIONS) {
    allEvents.push(...generateEventsForDefinition(def, startYear, endYear));
  }

  // Sort by date string (format YYYY.MM.DD HH:MM sorts correctly lexicographically)
  allEvents.sort();

  return allEvents;
}
