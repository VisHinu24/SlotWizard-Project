// Records the scheduler output for 40 fixed pseudo-random inputs (npm run snapshots).
// The snapshot test compares against these, so re-run this only when results change on purpose.
import fs from "fs";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";
const backend = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { generateTimetable } = await import(pathToFileURL(path.join(backend, "src/services/timetableService.js")));
const data = JSON.parse(fs.readFileSync(path.join(backend, "src/services/simplified.json"), "utf-8"));

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const cases = [];
for (let i = 0; i < 40; i++) {
  const n = 3 + Math.floor(rand() * 11); // 3..13 subjects
  const pool = [...data];
  const input = [];
  for (let k = 0; k < n; k++) {
    const s = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const staff = [...new Set(s.schedules.map((x) => x.staff))].filter(() => rand() < 0.8);
    input.push({ code: s.code, staff: staff.length ? staff : [s.schedules[0].staff] });
  }
  const t0 = Date.now();
  const { timetable, credits, missedSubjects } = (await generateTimetable(input)).variants[0];
  const output = { timetable, score: credits, missedSubjects: missedSubjects.map(({ subject, code }) => ({ subject, code })) };
  cases.push({ input, output });
  if (Date.now() - t0 > 2000) console.error("slow case", i, Date.now() - t0);
}
fs.writeFileSync(path.join(backend, "test/fixtures/scheduler-snapshots.json"), JSON.stringify(cases));
console.log("cases", cases.length, "scores", cases.map((c) => c.output.score).join(","));
