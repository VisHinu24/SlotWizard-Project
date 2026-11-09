import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { generateTimetable } from "../src/services/timetableService.js";
import { normalizePreferences, DEFAULT_PREFERENCES } from "../src/services/preferences.js";

const data = JSON.parse(fs.readFileSync(new URL("../src/services/simplified.json", import.meta.url), "utf-8"));
const pickAll = (subjects) =>
  subjects.map((s) => ({ code: s.code, staff: [...new Set(s.schedules.map((x) => x.staff))] }));
const real13 = pickAll(data.slice(0, 13));

// Made-up data: one 2-hour block per schedule.
const block = (slot, staff, day, from) => ({ slot, staff, times: [{ day, from, to: "" }, { day, from: "", to: "" }] });
const subject = (code, credits, ...schedules) => ({ subject: `Subject ${code}`, code, credits, schedules });
const run = (subjects, preferences) => generateTimetable(pickAll(subjects), subjects, { preferences });

const filled = (grid, test) =>
  Object.entries(grid).flatMap(([day, row]) => row.map((c, i) => [day, i, c])).filter(([d, i, c]) => Array.isArray(c) && test(d, i));

// --- normalizePreferences ---

test("normalizePreferences fills defaults for missing or junk input", () => {
  assert.deepEqual(normalizePreferences(undefined), DEFAULT_PREFERENCES);
  assert.deepEqual(normalizePreferences("nope"), DEFAULT_PREFERENCES);
});

test("normalizePreferences drops bad values", () => {
  const p = normalizePreferences({
    avoidEarly: { on: "yes", hard: true, weight: "extreme" },
    freeDays: { on: true, days: ["Saturday", "Sunday", "Monday"] },
    maxPerDay: { on: true, max: 9 },
    somethingElse: { on: true },
  });
  assert.deepEqual(p.avoidEarly, { on: false, hard: true, weight: "medium" });
  assert.deepEqual(p.freeDays.days, ["Monday", "Saturday"]);
  assert.equal(p.maxPerDay.max, 3);
  assert.equal("somethingElse" in p, false);
});

// --- hard rules ---

test("hard 'Saturday free': no option has a Saturday class, and missed subjects say why", async () => {
  const { variants } = await generateTimetable(real13, data, {
    preferences: { freeDays: { on: true, hard: true, days: ["Saturday"] } },
  });
  assert.ok(variants.length > 0);
  for (const v of variants) {
    assert.deepEqual(filled(v.timetable, (d) => d === "Saturday"), []);
    assert.deepEqual(v.brokenPreferences, []);
  }
  assert.ok(variants[0].missedSubjects.some((m) => m.reason === "Blocked by your preference: Saturday free"));
});

test("hard 'no 8:00': no option uses the first slot", async () => {
  const { variants } = await generateTimetable(real13, data, { preferences: { avoidEarly: { on: true, hard: true } } });
  for (const v of variants) assert.deepEqual(filled(v.timetable, (d, i) => i === 0), []);
});

test("hard 'max classes per day' is never exceeded", async () => {
  const subjects = [
    subject("A", 3, block("A-1", "X", "Monday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Monday", "10:00")),
  ];
  const { variants } = await run(subjects, { maxPerDay: { on: true, hard: true, max: 1 } });

  for (const v of variants) assert.ok(filled(v.timetable, (d) => d === "Monday").length <= 1);
  assert.equal(variants[0].missedSubjects[0].reason, "Blocked by your preference: At most 1 class a day");
});

// --- soft rules ---

test("soft 'no 8:00' prefers the later slot when credits are equal", async () => {
  const subjects = [subject("A", 3, block("A-1", "X", "Monday", "08:00"), block("A-2", "Y", "Monday", "10:00"))];

  const plain = await run(subjects, {});
  assert.equal(plain.variants[0].timetable.Monday[0][0], "A-1"); // first found wins without preferences

  const { variants } = await run(subjects, { avoidEarly: { on: true, weight: "high" } });
  assert.equal(variants[0].timetable.Monday[1][0], "A-2");
  assert.deepEqual(variants[0].brokenPreferences, []);
  assert.deepEqual(variants[1].brokenPreferences, ["1 class at 8:00 (Mon)"]);
});

test("score = 100 x credits - weight x violations", async () => {
  const subjects = [
    subject("A", 3, block("A-1", "X", "Tuesday", "08:00")),
    subject("B", 1, block("B-1", "Y", "Wednesday", "08:00")),
  ];
  const { variants } = await run(subjects, { avoidEarly: { on: true, weight: "high" } });

  assert.equal(variants[0].credits, 4);
  assert.equal(variants[0].score, 400 - 2 * 40);
  assert.deepEqual(variants[0].brokenPreferences, ["2 classes at 8:00 (Tue, Wed)"]);
});

test("soft preferences never cost a subject that fits", async () => {
  // B only runs on Saturday; a soft 'Saturday free' still keeps it, just with a lower score.
  const subjects = [
    subject("A", 3, block("A-1", "X", "Monday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Saturday", "10:00")),
  ];
  const { variants } = await run(subjects, { freeDays: { on: true, weight: "high", days: ["Saturday"] } });

  assert.equal(variants[0].credits, 6);
  assert.deepEqual(variants[0].brokenPreferences, ["1 class on Saturday"]);
});

test("soft 'fewer gaps' prefers back-to-back classes", async () => {
  const subjects = [
    subject("A", 3, block("A-1", "X", "Monday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Monday", "13:00"), block("B-2", "Z", "Monday", "10:00")),
  ];
  const { variants } = await run(subjects, { fewerGaps: { on: true, weight: "medium" } });

  assert.equal(variants[0].timetable.Monday[1][0], "B-2");
  assert.deepEqual(variants[1].brokenPreferences, ["1 gap between classes (Mon)"]);
});

test("soft 'max per day' counts classes over the limit", async () => {
  const subjects = [
    subject("A", 3, block("A-1", "X", "Monday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Monday", "10:00")),
  ];
  const { variants } = await run(subjects, { maxPerDay: { on: true, weight: "low", max: 1 } });

  assert.equal(variants[0].credits, 6);
  assert.equal(variants[0].score, 600 - 5);
  assert.deepEqual(variants[0].brokenPreferences, ["Monday has 2 classes (max 1)"]);
});
