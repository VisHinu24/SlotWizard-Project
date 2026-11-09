# Scheduler v2 — Build Phases

How to deliver [PRD-scheduler-v2.md](PRD-scheduler-v2.md) in small, shippable steps. Each phase ends with a working app, so you can merge to `dev` after every phase.

| Phase | Goal | Depends on |
| --- | --- | --- |
| 0 | Groundwork: tests, 30-credit cap, wire up profile routes | — |
| 1 | Refactor the scheduler so it can hold many results | 0 |
| 2 | Top 5 variants (backend + UI) | 1 |
| 3 | Time preferences | 2 |
| 4 | Locks and "Regenerate around locks" | 2, 3 |
| 5 | Polish, docs and release | 4 |

---

## Phase 0 — Groundwork ✅

**Goal:** a safety net before touching the scheduler, plus the 30-credit rule.

The cap applies to the **generated timetable**, not to selection. Students select up to 13 subjects (often over 30 credits) so that if some clash, the scheduler can still fill 30 credits from the rest.

**Backend**
- [x] Add a test runner (e.g. `vitest` or `node --test`) to `backend/package.json` with an `npm test` script.
- [x] Write tests for the current `generateTimetable` in `timetableService.js` with a small fixed subject list:
    - no two subjects share a day/slot cell
    - a subject that can't fit appears in `missedSubjects`
    - the highest-credit combination wins
- [x] Let `generateTimetable` take the subject data as a parameter (default: `simplified.json`) so tests can pass in their own data.
- [x] Enforce a 30-credit cap: never place a subject that takes the total over 30.
- [x] Route `editProfile` and `changePassword` (`PUT /profile`, `PUT /password`) and export them from the controller.

**Frontend**
- [x] Credit counter on the enrollment page: "39 credits selected · timetable fits up to 30" (information only, no block).

**Done when**
- `npm test` passes in `backend/`.
- Students can select over 30 credits, and the server never returns a timetable over 30.

---

## Phase 1 — Scheduler refactor (no visible change) ✅

**Goal:** restructure `generateTimetable` so the later phases are small additions.

- [x] Keep all search state inside `generateTimetable` (the `best` result and the `grid`), nothing left over between requests.
- [x] Split into helpers: `buildCandidates`, `cellsFor`, `isSafe`, `place` / `remove`, `scoreTimetable`, `emptyGrid`.
- [x] Add `timetableKey(grid)`: the sorted `code:slot` pairs joined into one string.
- [x] Keep the API response exactly the same as today.
- [x] Phase 0 tests still pass; add tests for `isSafe`, `cellsFor` and `timetableKey`.
- [x] Snapshot test: 40 real-data inputs recorded before the refactor (`backend/test/fixtures/scheduler-snapshots.json`) must give identical output. Re-record them when a later phase changes results on purpose.

**Done when**
- The app behaves the same as before, and all tests pass.

---

## Phase 2 — Top 5 timetable variants ✅

**Goal:** one Generate gives up to 5 ranked, distinct timetables.

**Backend**
- [x] Replace the single best result with a `top` list (max 5) sorted by score; insert a finished timetable only if it beats the 5th entry.
- [x] Skip duplicates using `timetableKey`.
- [x] Skip "lazy" timetables that leave out a subject which would still fit (otherwise options 2-5 are option 1 minus a subject).
- [x] Prune: stop a branch when `score + 100 × remainingCredits` can't beat the 5th entry.
- [x] Time budget: check `Date.now()` every 1,000 calls; stop at 2 s and return `partial: true`.
- [x] `POST /timetables` returns `{ variants: [{ timetable, score, credits, missedSubjects }], partial }` and **does not save**.
- [x] New `POST /timetables/save` saves one chosen variant to `user.tables` (keep the 10-entry limit). Also fixed: trimming to 10 used to delete the newest entry instead of the oldest.
- [x] `POST /timetables` rejects malformed picks and more than 13 subjects (`400`).
- [x] Add `credits` to the table schema in `user.js`.
- [x] When nothing can be placed, return an empty grid instead of `timetable: {}` (current behaviour, kept in Phase 1).
- [x] Snapshots: instead of re-recording, the test now checks that **option 1** still equals the old best timetable for all 40 cases.
- [x] Tests: 5 distinct variants, sorted by score, all ≤ 30 credits; fewer than 5 when fewer exist.

**Frontend**
- [x] After Generate, show variant tabs: Option 1 … Option 5, each with credits and score.
- [x] "Only N possible timetables" message when fewer than 5 come back; a note when `partial` is true.
- [x] Compare toggle: highlight cells that differ from Option 1.
- [x] "Save this one" button calls `/timetables/save`.
- [x] Move the current Previous/Next history into a "Saved timetables" list.
- [x] `transformTimetable.js` needed no change: each variant uses the same grid shape.

**Notes**
- With pruning, even 40–80 subjects finish in a few milliseconds, so the 2 s budget is a safety net.
- Options often differ by only one section swap (same times, different faculty). See the PRD open question about requiring 2+ differences.

**Done when**
- PRD Feature 1 acceptance criteria all pass.
- Generating with 13 subjects takes under 2 s.

---

## Phase 3 — Time preferences ✅

**Goal:** students rank timetables by when they want to study.

**Backend**
- [x] Add `preferences` to the user schema: `avoidEarly`, `avoidLate`, `freeDays`, `fewerGaps`, `maxPerDay`, each `{ on, hard, weight }` (+ `days` / `max` where needed).
- [x] `GET /preferences` and `PUT /preferences` (protected routes).
- [x] `POST /timetables` accepts `preferences` in the body (falls back to the saved ones).
- [x] Hard rules: checked alongside `isSafe` during the search (`hardRuleBlocking` in `services/preferences.js`), so slots that break them are never tried.
- [x] Soft rules: `score = 100 × credits − Σ weight × violations` with Low = 5, Medium = 15, High = 40.
- [x] Each variant returns `brokenPreferences`, e.g. `"1 class at 8:00 on Wednesday"`.
- [x] Every missed subject gets a `reason`: blocked by a preference, over the credit limit, no chosen faculty, or clashes.
- [x] Tests: hard "Saturday free" → no Saturday classes; soft "avoid 8:00" changes the ranking when credits tie.

**Frontend**
- [x] Collapsible Preferences panel above Generate on the enrollment page.
- [x] Each row: on/off toggle, Hard/Soft switch, Low/Medium/High weight (soft only).
- [x] Load saved preferences on page open; save on change.
- [x] Show `brokenPreferences` under each variant, and reasons under missed subjects.

**Also done**
- [x] Hard 13-subject lock on the enrollment page: counter badge, greyed-out list once full, and Edit never loads more than 13.
- [x] Saved timetables keep their `brokenPreferences` and missed-subject reasons.

**Notes**
- With every soft preference on, generation takes under 0.5 s for 13 real subjects.
- With no preferences, option 1 is still identical to the old scheduler (snapshot test).

**Done when**
- PRD Feature 2 acceptance criteria all pass, including preferences surviving logout and login.

---

## Phase 4 — Locks ✅

**Goal:** keep what you like, regenerate the rest.

**Backend**
- [x] `POST /timetables` accepts `locks: [{ code, slot }]` and `mustInclude` per subject; faculty lock = the subject's `staff` list with one name.
- [x] Validate first: clashing locks, a lock breaking a hard preference, or locks over 30 credits → `400` with a clear message (e.g. `"19AI553 and 19ME533 both lock Thursday 8:00"`).
- [x] Place locked slots on the empty grid, then backtrack over the remaining subjects only.
- [x] Must-include subjects have no "skip" branch; if one can't fit, return why.
- [x] Save `locks` with each entry in `user.tables`.
- [x] Tests: locked slot is in every variant; clashing locks return 400; must-include never missing silently.

**Frontend**
- [x] Lock icon on each filled timetable cell; locked cells get a padlock and thicker border.
- [x] "Lock faculty" and "Must include" on each subject card in the enrollment panel.
- [x] "Regenerate around locks" and "Clear all locks" buttons on the timetable page.
- [x] Check for clashing locks before sending the request.
- [x] Edit restores saved locks (extend `selectedSub.js` / the `selectedSubjectsEdit` localStorage data).

**Also done**
- [x] Locks win over the faculty filter: a locked slot is used even if that teacher is deselected.
- [x] Must-include subjects that can't all fit: the search runs again without that rule, and a warning names them (e.g. "Couldn't fit must-include subject 19CE521. See why below.").
- [x] New missed reason for sections whose class times are off the grid (e.g. "Its class times don't fit the timetable grid (Wednesday 11:00)").
- [x] Saved timetables store the full selection (faculty, must-include, locks), so Edit restores all of it. Older saved timetables fall back to the old Edit.

**Notes**
- 44 backend tests pass (10 new for locks and must-include).

**Done when**
- PRD Feature 3 acceptance criteria all pass.

---

## Phase 5 — Polish and release (done except merge)

- [x] Check generation time with the largest real subject list; tune the budget if needed. Tighter pruning (only subjects that still fit, cheapest penalty each) took the median with all preferences from 193 ms to 16 ms; the 2 s budget stays.
- [x] Mobile check for variant tabs, preferences panel and lock icons. Fixed: the whole app was hidden below 640 px wide (`hidden sm:block` around the router); the enrollment page now stacks and the navbar fits.
- [x] Empty and error states: no subjects selected, no valid timetable, server timeout. Requests time out after 20 s; "can't reach the server" no longer shows as a login error; Generate shows "Generating…".
- [x] Update `README.md`: "What's new" and "Running locally" sections; new screenshots in `docs/images/` (the `Output_Images/` folder the README links to is not in the repo).
- [x] Tick off the PRD acceptance criteria and answer its open questions.
- [x] Class times outside the blocks: every class hour now goes in the block it falls in. This also fixed a bigger bug: 6- and 8-hour sections were only placed in 2 of their blocks, which let the old scheduler produce real clashes (3 of 25 random tests). A new test checks every option hour by hour.
- [x] Login, sign-up and logout clear the in-browser selection (`Lib/plannerStorage.js`), so one student's picks and locks never carry over to the next login on the same browser.
- [x] "Must include" is explained on the enrollment page and in its tooltip.
- [ ] Merge `dev` → `main`.

---

## Suggested branches

| Phase | Branch |
| --- | --- |
| 0 | `feat/groundwork-credit-cap` |
| 1 | `refactor/scheduler` |
| 2 | `feat/top5-variants` |
| 3 | `feat/time-preferences` |
| 4 | `feat/locks` |
| 5 | `chore/release-v2` |
