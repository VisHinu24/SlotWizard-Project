import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import {
  generateTimetable,
  timetableKey,
  isSafe,
  cellsFor,
  emptyGrid,
  MAX_CREDITS,
} from "../src/services/timetableService.js";

const data = JSON.parse(fs.readFileSync(new URL("../src/services/simplified.json", import.meta.url), "utf-8"));
const allStaff = (s) => [...new Set(s.schedules.map((x) => x.staff))];
const pick = (subjects) => subjects.map((s) => ({ code: s.code, staff: allStaff(s) }));

// Small made-up data: one 2-hour block per schedule.
const block = (slot, staff, day, from) => ({
  slot,
  staff,
  times: [{ day, from, to: "" }, { day, from: "", to: "" }],
});
const subject = (code, credits, ...schedules) => ({ subject: `Subject ${code}`, code, credits, schedules });

const placedCodes = (grid) => {
  const codes = new Set();
  Object.values(grid).forEach((row) => row.forEach((c) => Array.isArray(c) && codes.add(c[1])));
  return codes;
};

test("returns 5 distinct variants, best first, all within the credit cap", async () => {
  const { variants, partial } = await generateTimetable(pick(data.slice(0, 13)));

  assert.equal(partial, false);
  assert.equal(variants.length, 5);
  assert.equal(new Set(variants.map((v) => timetableKey(v.timetable))).size, 5);
  for (let i = 1; i < variants.length; i++) assert.ok(variants[i - 1].score >= variants[i].score);
  for (const v of variants) {
    assert.ok(v.credits <= MAX_CREDITS);
    assert.equal(v.score, 100 * v.credits); // no preferences: 100 points per credit
  }
});

test("each variant's credits and missed subjects match its grid", async () => {
  const subjects = data.slice(0, 13);
  const { variants } = await generateTimetable(pick(subjects));

  for (const v of variants) {
    const placed = placedCodes(v.timetable);
    const credits = subjects.filter((s) => placed.has(s.code)).reduce((a, s) => a + s.credits, 0);
    assert.equal(v.credits, credits);
    assert.deepEqual(
      v.missedSubjects.map((m) => m.code).sort(),
      subjects.filter((s) => !placed.has(s.code)).map((s) => s.code).sort()
    );
  }
});

test("no variant leaves out a subject that would still fit", async () => {
  const subjects = data.slice(0, 13);
  const { variants } = await generateTimetable(pick(subjects));

  for (const v of variants) {
    for (const m of v.missedSubjects) {
      const s = subjects.find((x) => x.code === m.code);
      if (v.credits + s.credits > MAX_CREDITS) continue; // left out because of the cap
      const fits = s.schedules.some((sch) => isSafe(v.timetable, cellsFor(s, sch)));
      assert.equal(fits, false, `${s.code} would fit in option with ${v.credits} credits`);
    }
  }
});

test("returns fewer than 5 when fewer timetables exist", async () => {
  const subjects = [
    subject("A", 3, block("A-1", "X", "Monday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Monday", "08:00"), block("B-2", "Z", "Tuesday", "08:00")),
  ];
  const { variants } = await generateTimetable(pick(subjects), subjects);

  // Either A + B on Tuesday (6 credits), or B on Monday, which blocks A (3 credits).
  assert.equal(variants.length, 2);
  assert.deepEqual(variants.map((v) => v.credits), [6, 3]);
});

test("clashing subjects give one variant per choice", async () => {
  const subjects = [
    subject("A", 4, block("A-1", "X", "Monday", "08:00")),
    subject("B", 4, block("B-1", "Y", "Monday", "08:00")),
  ];
  const { variants } = await generateTimetable(pick(subjects), subjects);

  assert.deepEqual(variants.map((v) => [...placedCodes(v.timetable)]), [["A"], ["B"]]);
});

test("when nothing fits, returns an empty grid with every subject missed", async () => {
  const subjects = [subject("A", 3, block("A-1", "X", "Monday", "08:00"))];
  const { variants } = await generateTimetable([{ code: "A", staff: ["Nobody"] }], subjects);

  assert.equal(variants.length, 1);
  assert.deepEqual(variants[0].timetable, emptyGrid());
  assert.equal(variants[0].credits, 0);
  assert.deepEqual(variants[0].missedSubjects.map((m) => m.code), ["A"]);
});

test("stops at the time budget and says the result is partial", async () => {
  const started = Date.now();
  // A negative budget is always exceeded; checking every 50 steps stops it early.
  const { variants, partial } = await generateTimetable(pick(data.slice(0, 40)), data, { budgetMs: -1, checkEvery: 50 });

  assert.equal(partial, true);
  assert.ok(Date.now() - started < 1000);
  assert.ok(variants.length >= 1);
});

test("40 subjects finish within the default 2 s budget", async () => {
  const started = Date.now();
  const { variants } = await generateTimetable(pick(data.slice(0, 40)));
  assert.ok(Date.now() - started < 3000);
  assert.equal(variants.length, 5);
});

test("no two subjects in any option share a real class hour (real data, many inputs)", async () => {
  let seed = 11;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  for (let run = 0; run < 25; run++) {
    const pool = [...data];
    const picked = Array.from({ length: 13 }, () => pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    const { variants } = await generateTimetable(pick(picked));

    for (const v of variants) {
      // Every placed section, by "code:slot", then every hour it really meets.
      const sections = new Set();
      Object.values(v.timetable).forEach((row) => row.forEach((c) => Array.isArray(c) && sections.add(`${c[1]}|${c[0]}`)));
      const owner = new Map();
      for (const key of sections) {
        const [code, slot] = key.split("|");
        const sch = data.find((s) => s.code === code).schedules.find((x) => x.slot === slot);
        for (const t of new Set(sch.times.map((t) => `${t.day} ${t.from}`))) {
          assert.ok(!owner.has(t) || owner.get(t) === code, `run ${run}: ${owner.get(t)} and ${code} both meet ${t}`);
          owner.set(t, code);
        }
      }
    }
  }
});
