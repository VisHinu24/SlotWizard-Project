import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { generateTimetable, TimetableInputError } from "../src/services/timetableService.js";

const data = JSON.parse(fs.readFileSync(new URL("../src/services/simplified.json", import.meta.url), "utf-8"));
const allStaff = (s) => [...new Set(s.schedules.map((x) => x.staff))];
const pickAll = (subjects) => subjects.map((s) => ({ code: s.code, staff: allStaff(s) }));

// Made-up data: one 2-hour block per schedule.
const block = (slot, staff, day, from) => ({ slot, staff, times: [{ day, from, to: "" }, { day, from: "", to: "" }] });
const subject = (code, credits, ...schedules) => ({ subject: `Subject ${code}`, code, credits, schedules });

const slotOf = (grid, code) => {
  for (const row of Object.values(grid)) for (const c of row) if (Array.isArray(c) && c[1] === code) return c[0];
  return null;
};

// --- slot locks ---

test("a locked subject keeps its slot in every variant", async () => {
  const subjects = data.slice(0, 13);
  const plain = await generateTimetable(pickAll(subjects));
  // Lock a subject to a slot that option 1 did NOT use, if it has one.
  const target = subjects.find((s) => {
    const used = slotOf(plain.variants[0].timetable, s.code);
    return used && s.schedules.some((sch) => sch.slot !== used);
  });
  const slot = target.schedules.find((sch) => sch.slot !== slotOf(plain.variants[0].timetable, target.code)).slot;

  const { variants } = await generateTimetable(pickAll(subjects), data, { locks: [{ code: target.code, slot }] });

  assert.ok(variants.length > 0);
  for (const v of variants) assert.equal(slotOf(v.timetable, target.code), slot);
});

test("a slot lock works even if that faculty is not preferred", async () => {
  const subjects = [subject("A", 3, block("A-1", "X", "Monday", "08:00"), block("A-2", "Y", "Tuesday", "08:00"))];
  const { variants } = await generateTimetable([{ code: "A", staff: ["X"] }], subjects, {
    locks: [{ code: "A", slot: "A-2" }],
  });
  assert.equal(slotOf(variants[0].timetable, "A"), "A-2");
});

test("two locks on the same time are rejected with a clear message", async () => {
  const subjects = [
    subject("A", 3, block("A-1", "X", "Thursday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Thursday", "08:00")),
  ];
  await assert.rejects(
    generateTimetable(pickAll(subjects), subjects, { locks: [{ code: "A", slot: "A-1" }, { code: "B", slot: "B-1" }] }),
    (e) => e instanceof TimetableInputError && e.message === "A and B are both locked to Thursday 8:00"
  );
});

test("a lock that breaks a hard preference is rejected", async () => {
  const subjects = [subject("A", 3, block("A-1", "X", "Saturday", "10:00"))];
  await assert.rejects(
    generateTimetable(pickAll(subjects), subjects, {
      locks: [{ code: "A", slot: "A-1" }],
      preferences: { freeDays: { on: true, hard: true, days: ["Saturday"] } },
    }),
    /A is locked to a slot that breaks your preference: Saturday free/
  );
});

test("locks over the credit cap are rejected", async () => {
  const subjects = [
    subject("A", 4, block("A-1", "X", "Monday", "08:00")),
    subject("B", 4, block("B-1", "Y", "Tuesday", "08:00")),
  ];
  await assert.rejects(
    generateTimetable(pickAll(subjects), subjects, {
      maxCredits: 6,
      locks: [{ code: "A", slot: "A-1" }, { code: "B", slot: "B-1" }],
    }),
    /locked subjects add up to more than 6 credits/
  );
});

test("unknown lock subject or slot is rejected", async () => {
  const subjects = [subject("A", 3, block("A-1", "X", "Monday", "08:00"))];
  await assert.rejects(generateTimetable(pickAll(subjects), subjects, { locks: [{ code: "Z", slot: "Z-1" }] }), /Z is locked but not selected/);
  await assert.rejects(generateTimetable(pickAll(subjects), subjects, { locks: [{ code: "A", slot: "A-9" }] }), /A has no slot A-9/);
});

test("locked credits count toward the cap", async () => {
  const subjects = [
    subject("A", 4, block("A-1", "X", "Monday", "08:00")),
    subject("B", 4, block("B-1", "Y", "Tuesday", "08:00")),
  ];
  const { variants } = await generateTimetable(pickAll(subjects), subjects, {
    maxCredits: 6,
    locks: [{ code: "B", slot: "B-1" }],
  });
  assert.equal(variants[0].credits, 4);
  assert.equal(slotOf(variants[0].timetable, "B"), "B-1");
  assert.deepEqual(variants[0].missedSubjects.map((m) => [m.code, m.reason]), [["A", "Over the 6-credit limit"]]);
});

// --- must include ---

test("a must-include subject is in every variant, even if it costs credits", async () => {
  // A (4 cr) and B (3 cr) clash. Without must-include, A wins on credits.
  const subjects = [
    subject("A", 4, block("A-1", "X", "Monday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Monday", "08:00")),
  ];
  const plain = await generateTimetable(pickAll(subjects), subjects);
  assert.equal(slotOf(plain.variants[0].timetable, "A"), "A-1");

  const picks = pickAll(subjects).map((p) => (p.code === "B" ? { ...p, mustInclude: true } : p));
  const { variants, warnings } = await generateTimetable(picks, subjects);

  assert.deepEqual(warnings, []);
  assert.equal(variants.length, 1);
  assert.equal(slotOf(variants[0].timetable, "B"), "B-1");
});

test("must-include subjects that can't all fit are reported, not dropped silently", async () => {
  const subjects = [
    subject("A", 3, block("A-1", "X", "Monday", "08:00")),
    subject("B", 3, block("B-1", "Y", "Monday", "08:00")),
  ];
  const picks = pickAll(subjects).map((p) => ({ ...p, mustInclude: true }));
  const { variants, warnings } = await generateTimetable(picks, subjects);

  assert.equal(warnings.length, 1);
  assert.ok(variants.length > 0);
  const missed = variants[0].missedSubjects[0];
  assert.equal(missed.mustInclude, true);
  assert.equal(missed.reason, "Clashes with your other subjects");
});

test("a subject whose class times are off the grid gets a clear reason", async () => {
  const odd = subject("A", 3, {
    slot: "A-1",
    staff: "X",
    times: [{ day: "Monday", from: "10:00" }, { day: "Monday", from: "11:00" }, { day: "Wednesday", from: "12:00" }],
  });
  const { variants, warnings } = await generateTimetable([{ code: "A", staff: ["X"], mustInclude: true }], [odd]);

  assert.equal(variants[0].missedSubjects[0].reason, "Its class times don't fit the timetable grid (Wednesday 12:00)");
  assert.deepEqual(warnings, ["Couldn't fit must-include subject A. See why below."]);
});
