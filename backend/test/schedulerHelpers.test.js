import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import {
  generateTimetable,
  emptyGrid,
  isSafe,
  cellsFor,
  timetableKey,
} from "../src/services/timetableService.js";

// Best timetable for 40 real-data inputs. First recorded before the Phase 1 refactor;
// re-recorded in Phase 5 when long and off-block sections started taking all their blocks.
// If a later phase changes the best result on purpose (e.g. preferences), re-record with `npm run snapshots`.
// The parts of a result the snapshots record (score was plain credits when they were made).
const snapshotOf = ({ timetable, credits, missedSubjects }) => ({
  timetable,
  score: credits,
  missedSubjects: missedSubjects.map(({ subject, code }) => ({ subject, code })),
});

const snapshots = JSON.parse(
  fs.readFileSync(new URL("./fixtures/scheduler-snapshots.json", import.meta.url), "utf-8")
);

test("with no preferences, option 1 matches the recorded best timetable (40 real-data cases)", async () => {
  for (const [i, { input, output }] of snapshots.entries()) {
    const best = (await generateTimetable(input)).variants[0];
    assert.deepEqual(snapshotOf(best), output, `case ${i}`);
  }
});

const subject = { code: "A", subject: "Subject A" };
const hours = (...entries) => entries.map(([day, from]) => ({ day, from, to: "" }));

test("cellsFor: a 2-hour schedule fills one block", () => {
  const cells = cellsFor(subject, { slot: "A-1", times: hours(["Monday", "08:00"], ["Monday", "09:00"]) });
  assert.deepEqual(cells, [{ day: "Monday", index: 0, value: ["A-1", "A", "Subject A", 2] }]);
});

test("cellsFor: a 4-hour schedule fills two blocks", () => {
  const cells = cellsFor(subject, {
    slot: "A-1",
    times: hours(["Thursday", "08:00"], ["Thursday", "09:00"], ["Friday", "13:00"], ["Friday", "14:00"]),
  });
  assert.deepEqual(cells.map((c) => [c.day, c.index, c.value[3]]), [["Thursday", 0, 2], ["Friday", 2, 2]]);
});

test("cellsFor: a 3-hour schedule marks the second block as 1 hour", () => {
  const cells = cellsFor(subject, {
    slot: "A-1",
    times: hours(["Tuesday", "10:00"], ["Tuesday", "11:00"], ["Wednesday", "15:00"]),
  });
  assert.deepEqual(cells.map((c) => [c.day, c.index, c.value[3]]), [["Tuesday", 1, 2], ["Wednesday", 3, 1]]);
});

test("isSafe: free cells are safe, taken cells are not", () => {
  const grid = emptyGrid();
  const cells = [{ day: "Monday", index: 0 }, { day: "Friday", index: 3 }];
  assert.equal(isSafe(grid, cells), true);

  grid.Friday[3] = ["B-1", "B", "Subject B", 2];
  assert.equal(isSafe(grid, cells), false);
});

test("isSafe: unknown start times and days are never safe", () => {
  const grid = emptyGrid();
  assert.equal(isSafe(grid, [{ day: "Monday", index: undefined }]), false);
  assert.equal(isSafe(grid, [{ day: "Sunday", index: 0 }]), false);
});

test("timetableKey: same timetable gives the same key, a different one does not", () => {
  const a = emptyGrid();
  a.Monday[0] = ["A-1", "A", "Subject A", 2];
  a.Friday[2] = ["A-1", "A", "Subject A", 2];
  a.Tuesday[1] = ["B-2", "B", "Subject B", 2];

  const sameOtherOrder = emptyGrid();
  sameOtherOrder.Tuesday[1] = ["B-2", "B", "Subject B", 2];
  sameOtherOrder.Friday[2] = ["A-1", "A", "Subject A", 2];
  sameOtherOrder.Monday[0] = ["A-1", "A", "Subject A", 2];

  const otherSlot = emptyGrid();
  otherSlot.Monday[0] = ["A-1", "A", "Subject A", 2];
  otherSlot.Friday[2] = ["A-1", "A", "Subject A", 2];
  otherSlot.Wednesday[1] = ["B-3", "B", "Subject B", 2];

  assert.equal(timetableKey(a), "A:A-1|B:B-2");
  assert.equal(timetableKey(a), timetableKey(sameOtherOrder));
  assert.notEqual(timetableKey(a), timetableKey(otherSlot));
});

test("cellsFor: a 6-hour section fills all three of its blocks", () => {
  const cells = cellsFor(subject, {
    slot: "A-1",
    times: hours(["Monday", "13:00"], ["Monday", "14:00"], ["Thursday", "15:00"], ["Thursday", "16:00"], ["Saturday", "10:00"], ["Saturday", "11:00"]),
  });
  assert.deepEqual(cells.map((c) => [c.day, c.index, c.value[3]]), [["Monday", 2, 2], ["Thursday", 3, 2], ["Saturday", 1, 2]]);
});

test("cellsFor: off-block hours go in the block they fall in", () => {
  // 9:00-11:00 overlaps the 8:00 and 10:00 blocks; 11:00 alone sits in the 10:00 block.
  const cells = cellsFor(subject, {
    slot: "A-1",
    times: hours(["Wednesday", "09:00"], ["Wednesday", "10:00"], ["Friday", "11:00"]),
  });
  assert.deepEqual(cells.map((c) => [c.day, c.index, c.value[3]]), [["Wednesday", 0, 1], ["Wednesday", 1, 1], ["Friday", 1, 1]]);
});

test("cellsFor: duplicate hours count once", () => {
  const cells = cellsFor(subject, {
    slot: "BLENDED",
    times: hours(["Saturday", "10:00"], ["Saturday", "10:00"], ["Saturday", "11:00"], ["Saturday", "11:00"]),
  });
  assert.deepEqual(cells.map((c) => [c.day, c.index, c.value[3]]), [["Saturday", 1, 2]]);
});

test("cellsFor: lunch-hour classes have no block, so they never fit", () => {
  const cells = cellsFor(subject, { slot: "A-1", times: hours(["Monday", "12:00"]) });
  assert.equal(isSafe(emptyGrid(), cells), false);
});
