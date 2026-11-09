import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizePreferences, hardRuleBlocking, softPenalty, POINTS_PER_CREDIT } from "./preferences.js";

const dataPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "simplified.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// College rule: a student can take at most 30 credits per semester.
export const MAX_CREDITS = 30;

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Start time of each 2-hour block -> its column in a day's row.
export const SLOT_INDEX = { "08:00": 0, "10:00": 1, "13:00": 2, "15:00": 3 };

const EMPTY = "empty";

export const emptyGrid = () =>
  Object.fromEntries(DAYS.map((day) => [day, [EMPTY, EMPTY, EMPTY, EMPTY]]));

// The student's picks, joined with the college data and filtered to their preferred faculty.
// Unknown codes are dropped.
export const buildCandidates = (input, subjectData) =>
  input
    .map((pick) => {
      const subject = subjectData.find((s) => s.code === pick.code);
      if (!subject) return null;
      return {
        code: subject.code,
        subject: subject.subject,
        credits: subject.credits,
        mustInclude: pick.mustInclude === true,
        schedules: subject.schedules.filter((sch) => pick.staff.includes(sch.staff)),
      };
    })
    .filter(Boolean);

// Which 2-hour block an hour falls in: 8-9 -> 0, 10-11 -> 1, 1-2 pm -> 2, 3-4 pm -> 3.
// Anything else (lunch at 12:00, before 8, after 5) has no block.
const HOUR_BLOCK = { 8: 0, 9: 0, 10: 1, 11: 1, 13: 2, 14: 2, 15: 3, 16: 3 };
export const blockOf = (from) => (/^\d{2}:00$/.test(String(from)) ? HOUR_BLOCK[Number(String(from).slice(0, 2))] : undefined);

// The grid cells one schedule fills, with the value each cell gets.
// Every listed hour is put in the block it falls in, so a 9:00-11:00 class takes both
// blocks it overlaps (never a hidden clash). A cell's hours = distinct hours in that block.
// Hours outside the grid give a cell with no index, which is never free (see isSafe).
export const cellsFor = (subject, schedule) => {
  const blocks = new Map(); // "day|index" -> { day, index, hours: Set }
  for (const t of schedule.times || []) {
    if (!t?.day || !t.from) continue; // an entry with no time adds nothing
    const index = blockOf(t.from);
    const key = `${t.day}|${index}`;
    if (!blocks.has(key)) blocks.set(key, { day: t.day, index, hours: new Set() });
    blocks.get(key).hours.add(t.from);
  }
  if (blocks.size === 0) return [{ day: undefined, index: undefined, value: null }]; // no times: can't place

  return [...blocks.values()].map(({ day, index, hours }) => ({
    day,
    index,
    value: [schedule.slot, subject.code, subject.subject, hours.size],
  }));
};

// True when every cell is free. A start time outside SLOT_INDEX never counts as free.
export const isSafe = (grid, cells) => cells.every(({ day, index }) => grid[day]?.[index] === EMPTY);

const place = (grid, cells) => cells.forEach(({ day, index, value }) => (grid[day][index] = value));
const remove = (grid, cells) => cells.forEach(({ day, index }) => (grid[day][index] = EMPTY));

// Same timetable -> same key, whatever order it was built in. Used to spot duplicates.
export const timetableKey = (grid) => {
  const pairs = new Set();
  Object.values(grid).forEach((row) =>
    row.forEach((cell) => Array.isArray(cell) && pairs.add(`${cell[1]}:${cell[0]}`))
  );
  return [...pairs].sort().join("|");
};

// How good a timetable is: 100 points per credit, minus the cost of broken soft preferences.
// Without a grid it is an upper bound (no penalties), which the search uses to prune.
export const scoreTimetable = ({ credits, grid, prefs }) =>
  POINTS_PER_CREDIT * credits - (grid && prefs ? softPenalty(prefs, grid).penalty : 0);

const codesIn = (grid) => {
  const codes = new Set();
  Object.values(grid).forEach((row) => row.forEach((cell) => Array.isArray(cell) && cell[1] && codes.add(cell[1])));
  return codes;
};

export const MAX_VARIANTS = 5;
export const TIME_BUDGET_MS = 2000;

// Bad input the student can fix (e.g. two locks on the same slot). The API returns it as a 400.
export class TimetableInputError extends Error {}

const SLOT_LABEL = ["8:00", "10:00", "1:00", "3:00"];
const where = ({ day, index }) => `${day} ${SLOT_LABEL[index]}`;

/**
 * Finds up to `maxVariants` distinct clash-free timetables, best first.
 *
 * - Never goes over `maxCredits`.
 * - Skips a timetable that leaves out a subject which would still fit in a free slot
 *   (otherwise options 2-5 would just be option 1 with a subject dropped).
 * - Stops after `budgetMs` and returns what it has, with `partial: true`.
 * - Hard preferences are never broken; soft ones lower the score (see preferences.js).
 * - `locks` ([{ code, slot }]) pin a subject to one slot in every variant.
 * - Picks with `mustInclude: true` are never skipped. If they can't all fit, the search
 *   runs again without that rule and `warnings` says so.
 *
 * Throws TimetableInputError when the locks can't work (clash, broken hard rule, over the cap).
 * subjectData defaults to the college offerings; tests pass in their own.
 */
export const generateTimetable = async (
  input,
  subjectData = data,
  {
    maxCredits = MAX_CREDITS,
    maxVariants = MAX_VARIANTS,
    budgetMs = TIME_BUDGET_MS,
    checkEvery = 1024,
    preferences,
    locks = [],
  } = {}
) => {
  const prefs = normalizePreferences(preferences);
  const subjects = buildCandidates(input, subjectData);
  const grid = emptyGrid();
  const fits = (cells) => isSafe(grid, cells) && !hardRuleBlocking(prefs, grid, cells);

  // Try each subject's sections cheapest-first (soft preferences they'd break on their own),
  // so good timetables turn up early and pruning cuts more. The sort is stable: with no
  // preferences every section costs 0 and the order is unchanged.
  const ownCost = (subject, schedule) => {
    const cells = cellsFor(subject, schedule);
    if (cells.some((c) => c.index === undefined)) return 0;
    const alone = emptyGrid();
    place(alone, cells);
    return softPenalty(prefs, alone, { gaps: false }).penalty;
  };
  // Per subject: its sections with their grid cells and own cost, cheapest first.
  const options = subjects.map((s) =>
    s.schedules
      .filter((sch) => Array.isArray(sch?.times))
      .map((sch) => ({ sch, cells: cellsFor(s, sch), cost: ownCost(s, sch) }))
      .sort((a, b) => a.cost - b.cost)
  );
  const taken = subjects.map(() => false);
  const locked = subjects.map(() => false);

  // 1. Place the locked slots first, checking each one.
  let lockedCredits = 0;
  for (const lock of locks) {
    const i = subjects.findIndex((s) => s.code === lock.code);
    if (i === -1) throw new TimetableInputError(`${lock.code} is locked but not selected`);
    if (locked[i]) throw new TimetableInputError(`${lock.code} is locked to more than one slot`);

    const subject = subjects[i];
    // A slot lock wins over the faculty filter: look the slot up in all of the subject's schedules.
    const schedule = subjectData
      .find((s) => s.code === lock.code)
      .schedules.find((sch) => sch.slot === lock.slot);
    if (!schedule) throw new TimetableInputError(`${lock.code} has no slot ${lock.slot}`);

    const cells = cellsFor(subject, schedule);
    const clash = cells.find((c) => !isSafe(grid, [c]));
    if (clash) {
      const other = grid[clash.day]?.[clash.index];
      throw new TimetableInputError(
        Array.isArray(other)
          ? `${other[1]} and ${lock.code} are both locked to ${where(clash)}`
          : `${lock.code} slot ${lock.slot} is not at a valid time`
      );
    }
    const rule = hardRuleBlocking(prefs, grid, cells);
    if (rule) throw new TimetableInputError(`${lock.code} is locked to a slot that breaks your preference: ${rule}`);
    if (lockedCredits + subject.credits > maxCredits)
      throw new TimetableInputError(`Your locked subjects add up to more than ${maxCredits} credits`);

    place(grid, cells);
    locked[i] = taken[i] = true;
    lockedCredits += subject.credits;
  }

  const startedAt = Date.now();
  let steps = 0;
  let timedOut = false;
  let top = []; // { score, credits, key, timetable }, best first
  let keys = new Set();

  const isFull = () => top.length >= maxVariants;
  const worstKept = () => top[top.length - 1].score;

  // True when some left-out subject could still be added without a clash or going over the cap.
  const couldAddMore = (credits) =>
    subjects.some(
      (s, i) =>
        !taken[i] &&
        credits + s.credits <= maxCredits &&
        s.schedules.some((sch) => Array.isArray(sch?.times) && fits(cellsFor(s, sch)))
    );

  const keep = (credits) => {
    const score = scoreTimetable({ credits, grid, prefs });
    if (isFull() && score <= worstKept()) return;

    const key = timetableKey(grid);
    if (keys.has(key)) return;

    // Insert after any equal scores, so earlier finds stay ahead.
    let at = top.findIndex((v) => v.score < score);
    if (at === -1) at = top.length;
    top.splice(at, 0, { score, credits, key, timetable: structuredClone(grid) });
    keys.add(key);

    if (top.length > maxVariants) keys.delete(top.pop().key);
  };

  // Upper bound on the score of any timetable this branch can still reach:
  // - penalties already earned only grow as classes are added (gaps aside), so they count;
  // - a remaining subject only counts if one of its sections still fits (the grid only fills up),
  //   and adding it costs at least its cheapest fitting section's own penalty;
  // - and never more credits than the cap allows.
  const bestPossible = (i, credits) => {
    let extra = 0;
    for (let j = i; j < subjects.length; j++) {
      if (locked[j] || credits + subjects[j].credits > maxCredits) continue;
      let cheapest = Infinity;
      for (const o of options[j]) if (o.cost < cheapest && fits(o.cells)) cheapest = o.cost;
      if (cheapest !== Infinity) extra += Math.max(0, POINTS_PER_CREDIT * subjects[j].credits - cheapest);
    }
    extra = Math.min(extra, POINTS_PER_CREDIT * (maxCredits - credits));
    return POINTS_PER_CREDIT * credits - softPenalty(prefs, grid, { gaps: false }).penalty + extra;
  };

  // 2. Backtracking over the unlocked subjects. `strict` = must-include subjects can't be skipped.
  const search = (i, credits, strict) => {
    if (timedOut) return;
    if (++steps % checkEvery === 0 && Date.now() - startedAt > budgetMs) {
      timedOut = true;
      return;
    }

    if (i >= subjects.length) {
      if (!couldAddMore(credits)) keep(credits);
      return;
    }

    if (locked[i]) return search(i + 1, credits, strict); // already on the grid

    // Prune: stop when this branch can't beat the worst kept variant (see bestPossible).
    if (isFull() && bestPossible(i, credits) <= worstKept()) return;

    const subject = subjects[i];

    // Over the credit cap: only the "skip this subject" branch remains.
    if (credits + subject.credits <= maxCredits) {
      for (const { cells } of options[i]) {
        if (!fits(cells)) continue;

        place(grid, cells);
        taken[i] = true;
        search(i + 1, credits + subject.credits, strict);
        taken[i] = false;
        remove(grid, cells);
        if (timedOut) return;
      }
    }

    // Skip this subject, unless it must be included.
    if (!(strict && subject.mustInclude)) search(i + 1, credits, strict);
  };

  search(0, lockedCredits, true);

  // Must-include subjects that can't all fit: search again without that rule, and say so.
  const warnings = [];
  if (top.length === 0 && subjects.some((s) => s.mustInclude) && !timedOut) {
    top = [];
    keys = new Set();
    search(0, lockedCredits, false);
  }

  // Why a subject is not in a timetable, in words the student can act on.
  const missedReason = (s, timetable, credits) => {
    if (credits + s.credits > maxCredits) return `Over the ${maxCredits}-credit limit`;
    if (s.schedules.length === 0) return "None of your chosen faculty teach it";

    // Sections with a class outside the 8:00-5:00 blocks (e.g. at 12:00) can't go on the grid.
    const onGrid = s.schedules.filter((sch) => cellsFor(s, sch).every((c) => c.index !== undefined));
    if (onGrid.length === 0) {
      const odd = (s.schedules[0].times || []).find((t) => t?.from && blockOf(t.from) === undefined);
      return `Its class times don't fit the timetable grid${odd ? ` (${odd.day} ${odd.from})` : ""}`;
    }

    for (const sch of onGrid) {
      const cells = cellsFor(s, sch);
      if (!isSafe(timetable, cells)) continue;
      const rule = hardRuleBlocking(prefs, timetable, cells);
      if (rule) return `Blocked by your preference: ${rule}`;
    }
    return "Clashes with your other subjects";
  };

  const variants = top.map(({ timetable, score, credits }) => {
    const used = codesIn(timetable);
    return {
      timetable,
      score,
      credits,
      brokenPreferences: softPenalty(prefs, timetable).broken,
      missedSubjects: subjects
        .filter((s) => !used.has(s.code))
        .map((s) => ({
          subject: s.subject,
          code: s.code,
          reason: missedReason(s, timetable, credits),
          ...(s.mustInclude ? { mustInclude: true } : {}),
        })),
    };
  });

  // Name the must-include subjects the best option still had to leave out.
  const mustMissed = (variants[0]?.missedSubjects || []).filter((m) => m.mustInclude).map((m) => m.code);
  if (mustMissed.length)
    warnings.push(`Couldn't fit must-include subject${mustMissed.length === 1 ? "" : "s"} ${mustMissed.join(", ")}. See why below.`);

  return { variants, partial: timedOut, warnings };
};
