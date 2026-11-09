// Student time preferences: hard rules (never broken) and soft wishes (cost points).
//
// Grid columns: 0 = 8:00-10:00, 1 = 10:00-12:00, 2 = 1:00-3:00, 3 = 3:00-5:00.

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEIGHTS = { low: 5, medium: 15, high: 40 };

// Every soft preference costs weight x violations; one credit is worth 100 points.
export const POINTS_PER_CREDIT = 100;

const EARLY = 0;
const LATE = 3;
const short = (day) => day.slice(0, 3);

export const DEFAULT_PREFERENCES = {
  avoidEarly: { on: false, hard: false, weight: "medium" },
  avoidLate: { on: false, hard: false, weight: "medium" },
  freeDays: { on: false, hard: false, weight: "medium", days: [] },
  fewerGaps: { on: false, weight: "low" }, // soft only
  maxPerDay: { on: false, hard: false, weight: "medium", max: 3 },
};

const bool = (v) => v === true;
const weight = (v, fallback) => (Object.hasOwn(WEIGHTS, v) ? v : fallback);

// Fills in defaults and drops anything unexpected, so stored and incoming
// preferences always have the same shape.
export const normalizePreferences = (input) => {
  const p = input && typeof input === "object" ? input : {};
  const d = DEFAULT_PREFERENCES;
  const pick = (key) => (p[key] && typeof p[key] === "object" ? p[key] : {});

  const max = Number(pick("maxPerDay").max);
  const days = Array.isArray(pick("freeDays").days) ? pick("freeDays").days : [];

  return {
    avoidEarly: {
      on: bool(pick("avoidEarly").on),
      hard: bool(pick("avoidEarly").hard),
      weight: weight(pick("avoidEarly").weight, d.avoidEarly.weight),
    },
    avoidLate: {
      on: bool(pick("avoidLate").on),
      hard: bool(pick("avoidLate").hard),
      weight: weight(pick("avoidLate").weight, d.avoidLate.weight),
    },
    freeDays: {
      on: bool(pick("freeDays").on),
      hard: bool(pick("freeDays").hard),
      weight: weight(pick("freeDays").weight, d.freeDays.weight),
      days: DAYS.filter((day) => days.includes(day)),
    },
    fewerGaps: {
      on: bool(pick("fewerGaps").on),
      weight: weight(pick("fewerGaps").weight, d.fewerGaps.weight),
    },
    maxPerDay: {
      on: bool(pick("maxPerDay").on),
      hard: bool(pick("maxPerDay").hard),
      weight: weight(pick("maxPerDay").weight, d.maxPerDay.weight),
      max: Number.isInteger(max) && max >= 1 && max <= 4 ? max : d.maxPerDay.max,
    },
  };
};

const filledCount = (row) => row.filter(Array.isArray).length;

/**
 * Hard-rule check for placing `cells` on `grid`.
 * Returns null when allowed, or the name of the rule that blocks it.
 */
export const hardRuleBlocking = (prefs, grid, cells) => {
  const { avoidEarly, avoidLate, freeDays, maxPerDay } = prefs;

  for (const { day, index } of cells) {
    if (avoidEarly.on && avoidEarly.hard && index === EARLY) return "No 8:00 classes";
    if (avoidLate.on && avoidLate.hard && index === LATE) return "No 3:00–5:00 classes";
    if (freeDays.on && freeDays.hard && freeDays.days.includes(day)) return `${day} free`;
  }

  if (maxPerDay.on && maxPerDay.hard) {
    for (const day of new Set(cells.map((c) => c.day))) {
      const adding = cells.filter((c) => c.day === day).length;
      if (filledCount(grid[day] || []) + adding > maxPerDay.max) return `At most ${maxPerDay.max} class${maxPerDay.max === 1 ? "" : "es"} a day`;
    }
  }
  return null;
};

// Empty blocks between the first and last class of a day.
const gapsIn = (row) => {
  const filled = row.map((c, i) => (Array.isArray(c) ? i : -1)).filter((i) => i >= 0);
  if (filled.length < 2) return 0;
  return filled.at(-1) - filled[0] + 1 - filled.length;
};

/**
 * Soft-rule cost of a finished timetable, plus a short note per broken preference.
 * Hard rules are already enforced during the search, so only soft ones are counted.
 * `gaps: false` leaves out "fewer gaps", the one cost that can drop when a class is added;
 * the rest only grow, which makes that total a safe lower bound while searching.
 */
export const softPenalty = (prefs, grid, { gaps = true } = {}) => {
  let penalty = 0;
  const broken = [];

  const daysWhere = (test) => DAYS.filter((day) => test(grid[day] || []));
  // e.g. "2 classes at 8:00 (Mon, Thu)"
  const note = (count, one, many, days) => `${count} ${count === 1 ? one : many} (${days.map(short).join(", ")})`;

  const { avoidEarly, avoidLate, freeDays, fewerGaps, maxPerDay } = prefs;

  if (avoidEarly.on && !avoidEarly.hard) {
    const days = daysWhere((row) => Array.isArray(row[EARLY]));
    if (days.length) {
      penalty += WEIGHTS[avoidEarly.weight] * days.length;
      broken.push(note(days.length, "class at 8:00", "classes at 8:00", days));
    }
  }

  if (avoidLate.on && !avoidLate.hard) {
    const days = daysWhere((row) => Array.isArray(row[LATE]));
    if (days.length) {
      penalty += WEIGHTS[avoidLate.weight] * days.length;
      broken.push(note(days.length, "class at 3:00–5:00", "classes at 3:00–5:00", days));
    }
  }

  if (freeDays.on && !freeDays.hard) {
    for (const day of freeDays.days) {
      const count = filledCount(grid[day] || []);
      if (count) {
        penalty += WEIGHTS[freeDays.weight] * count;
        broken.push(`${count} class${count === 1 ? "" : "es"} on ${day}`);
      }
    }
  }

  if (gaps && fewerGaps.on) {
    const days = daysWhere((row) => gapsIn(row) > 0);
    const total = days.reduce((sum, day) => sum + gapsIn(grid[day]), 0);
    if (total) {
      penalty += WEIGHTS[fewerGaps.weight] * total;
      broken.push(note(total, "gap between classes", "gaps between classes", days));
    }
  }

  if (maxPerDay.on && !maxPerDay.hard) {
    for (const day of DAYS) {
      const over = filledCount(grid[day] || []) - maxPerDay.max;
      if (over > 0) {
        penalty += WEIGHTS[maxPerDay.weight] * over;
        broken.push(`${day} has ${maxPerDay.max + over} classes (max ${maxPerDay.max})`);
      }
    }
  }

  return { penalty, broken };
};
