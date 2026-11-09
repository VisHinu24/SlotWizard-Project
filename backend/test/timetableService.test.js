import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTimetable as generate, MAX_CREDITS } from "../src/services/timetableService.js";

// These tests check the best timetable (option 1).
const generateTimetable = async (...args) => (await generate(...args)).variants[0];

// A 2-hour class block, e.g. hours("Monday", "08:00") -> two 1-hour entries.
const START = { "08:00": "09:00", "10:00": "11:00", "13:00": "14:00", "15:00": "16:00" };
const block = (day, from) => [
  { day, from, to: START[from] },
  { day, from: START[from], to: String(Number(START[from].slice(0, 2)) + 1).padStart(2, "0") + ":00" },
];

// A schedule with one 2-hour block, or two blocks on different days.
const schedule = (slot, staff, ...blocks) => ({
  slot,
  staff,
  times: blocks.flatMap(([day, from]) => block(day, from)),
});

const subject = (code, credits, ...schedules) => ({ subject: `Subject ${code}`, code, credits, schedules });

// Everything the student picks, with every faculty preferred.
const pickAll = (data) => data.map((s) => ({ code: s.code, staff: s.schedules.map((sch) => sch.staff) }));

// Subject codes placed in the result.
const placed = (timetable) => {
  const codes = new Set();
  Object.values(timetable).forEach((day) => day.forEach((cell) => Array.isArray(cell) && codes.add(cell[1])));
  return [...codes].sort();
};

test("two subjects in the same slot are never both placed", async () => {
  const data = [
    subject("A", 3, schedule("A-1", "X", ["Monday", "08:00"])),
    subject("B", 3, schedule("B-1", "Y", ["Monday", "08:00"])),
  ];
  const res = await generateTimetable(pickAll(data), data);

  assert.equal(placed(res.timetable).length, 1);
  assert.equal(res.missedSubjects.length, 1);
  assert.equal(res.credits, 3);
});

test("keeps the combination with the most credits", async () => {
  const data = [
    subject("A", 4, schedule("A-1", "X", ["Monday", "08:00"])),
    subject("B", 2, schedule("B-1", "Y", ["Monday", "08:00"])),
    subject("C", 3, schedule("C-1", "Z", ["Tuesday", "10:00"])),
  ];
  const res = await generateTimetable(pickAll(data), data);

  assert.deepEqual(placed(res.timetable), ["A", "C"]);
  assert.deepEqual(res.missedSubjects, [{ subject: "Subject B", code: "B", reason: "Clashes with your other subjects" }]);
  assert.equal(res.credits, 7);
});

test("uses another faculty's slot to avoid a clash", async () => {
  const data = [
    subject("A", 3, schedule("A-1", "X", ["Monday", "08:00"])),
    subject("B", 3, schedule("B-1", "Y", ["Monday", "08:00"]), schedule("B-2", "Z", ["Tuesday", "08:00"])),
  ];
  const res = await generateTimetable(pickAll(data), data);

  assert.deepEqual(placed(res.timetable), ["A", "B"]);
  assert.equal(res.timetable.Tuesday[0][0], "B-2");
});

test("only uses the faculty the student prefers", async () => {
  const data = [
    subject("A", 3, schedule("A-1", "X", ["Monday", "08:00"])),
    subject("B", 3, schedule("B-1", "Y", ["Monday", "08:00"]), schedule("B-2", "Z", ["Tuesday", "08:00"])),
  ];
  const input = [
    { code: "A", staff: ["X"] },
    { code: "B", staff: ["Y"] }, // Z not preferred, so B has nowhere to go
  ];
  const res = await generateTimetable(input, data);

  assert.deepEqual(placed(res.timetable), ["A"]);
  assert.deepEqual(res.missedSubjects.map((s) => s.code), ["B"]);
});

test("a two-day schedule fills both days", async () => {
  const data = [subject("A", 4, schedule("A-1", "X", ["Thursday", "08:00"], ["Friday", "13:00"]))];
  const res = await generateTimetable(pickAll(data), data);

  assert.equal(res.timetable.Thursday[0][1], "A");
  assert.equal(res.timetable.Friday[2][1], "A");
});

test(`never goes over ${MAX_CREDITS} credits`, async () => {
  // 8 subjects x 4 credits = 32, all in different slots
  const slots = [
    ["Monday", "08:00"], ["Monday", "10:00"], ["Tuesday", "08:00"], ["Tuesday", "10:00"],
    ["Wednesday", "08:00"], ["Wednesday", "10:00"], ["Thursday", "08:00"], ["Thursday", "10:00"],
  ];
  const data = slots.map((s, i) => subject(`S${i}`, 4, schedule(`S${i}-1`, "X", s)));
  const res = await generateTimetable(pickAll(data), data);

  assert.equal(res.credits, 28);
  assert.equal(placed(res.timetable).length, 7);
  assert.equal(res.missedSubjects.length, 1);
});

test("the credit cap can be changed", async () => {
  const data = [
    subject("A", 4, schedule("A-1", "X", ["Monday", "08:00"])),
    subject("B", 3, schedule("B-1", "Y", ["Tuesday", "08:00"])),
  ];
  const res = await generateTimetable(pickAll(data), data, { maxCredits: 5 });

  assert.deepEqual(placed(res.timetable), ["A"]);
  assert.equal(res.credits, 4);
});

test("unknown subject codes are ignored", async () => {
  const data = [subject("A", 3, schedule("A-1", "X", ["Monday", "08:00"]))];
  const res = await generateTimetable([...pickAll(data), { code: "NOPE", staff: ["X"] }], data);

  assert.deepEqual(placed(res.timetable), ["A"]);
  assert.deepEqual(res.missedSubjects, []);
});

test("works with the real college data", async () => {
  const res = await generateTimetable([{ code: "19ME533", staff: ["MUTHUKUMAR V"] }]);

  assert.deepEqual(placed(res.timetable), ["19ME533"]);
  assert.equal(res.credits, 4);
});
