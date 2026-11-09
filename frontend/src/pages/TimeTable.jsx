import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../Lib/axios";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import transformBackendTimetable from "../utils/transformTimetable.js";
import transformData from "../Lib/selectedSub.js";
import subjectsData from "./simplified.json";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeSlots = ["8:00-10:00", "10:00-12:00", "1:00-3:00", "3:00-5:00"];
const MAX_VARIANTS = 5;

// What a backend grid cell holds, as one comparable string: "code:slot" or "empty".
const cellId = (cell) => (Array.isArray(cell) ? `${cell[1]}:${cell[0]}` : "empty");

const readGenerated = () => {
  try {
    return JSON.parse(sessionStorage.getItem("generatedVariants")) || null;
  } catch {
    return null;
  }
};

const SLOT_LABEL = ["8:00", "10:00", "1:00", "3:00"];
// Same as the backend: each class hour belongs to the 2-hour block it falls in.
const HOUR_BLOCK = { 8: 0, 9: 0, 10: 1, 11: 1, 13: 2, 14: 2, 15: 3, 16: 3 };

// First clash between locks, as a message, or null. Mirrors the server's check so a
// clashing set of locks never gets sent.
const findLockClash = (locks) => {
  const used = new Map(); // "Thursday|0" -> code
  for (const { code, slot } of locks) {
    const sch = subjectsData.find((s) => s.code === code)?.schedules.find((x) => x.slot === slot);
    if (!sch) continue;
    const blocks = new Set(sch.times.map((t) => `${t.day}|${HOUR_BLOCK[Number(t.from.slice(0, 2))]}`));
    for (const key of blocks) {
      if (used.has(key) && used.get(key) !== code) {
        const [day, index] = key.split("|");
        return `${used.get(key)} and ${code} are both locked to ${day} ${SLOT_LABEL[index]}`;
      }
      used.set(key, code);
    }
  }
  return null;
};

// Rebuilds what the enrollment page needs from a saved request: faculty choices and must-include.
const subjectsForEdit = (picks) =>
  picks.map(({ code, staff, mustInclude }) => {
    const all = [...new Set((subjectsData.find((s) => s.code === code)?.schedules || []).map((x) => x.staff))];
    return { code, mustInclude: mustInclude === true, preferredStaff: Object.fromEntries(all.map((n) => [n, staff.includes(n)])) };
  });

const tabClass = (active) =>
  `px-4 py-2 rounded-2xl border text-sm font-semibold transition-colors ${
    active
      ? "bg-blue-600 border-blue-700 text-white"
      : "bg-dark/10 dark:bg-white/10 border-dark/20 dark:border-white/20 dark:text-white hover:bg-dark/20 dark:hover:bg-white/20"
  }`;

const Timetable = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(null); // null while loading
  const [generated, setGenerated] = useState(readGenerated); // { variants, partial, warnings, request }
  const [view, setView] = useState(() => (readGenerated()?.variants?.length ? "options" : "saved"));
  const [optionIndex, setOptionIndex] = useState(0);
  const [savedIndex, setSavedIndex] = useState(0);
  const [compare, setCompare] = useState(false);
  const [savedOptions, setSavedOptions] = useState({}); // optionIndex -> true once saved
  const [saving, setSaving] = useState(false);
  const [locks, setLocks] = useState(() => readGenerated()?.request?.locks || []); // [{ code, slot }]
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    async function fetchSaved() {
      try {
        const response = await api.get("/timetables");
        setSaved(response.data.tables || []);
      } catch (error) {
        console.error(error);
        if (error.response?.status === 401 || error.response?.status === 404) {
          toast.error("Please log in again");
          navigate("/login");
        } else {
          toast.error(errorMessage(error, "Could not load your timetables"));
          setSaved([]); // still show this session's new options, if any
        }
      }
    }
    fetchSaved();
  }, [navigate]);

  if (saved === null) {
    return <div className="min-h-screen flex justify-center items-center dark:bg-dark dark:text-white">Loading...</div>;
  }

  const variants = generated?.variants || [];
  const inOptions = view === "options" && variants.length > 0;
  const current = inOptions ? variants[optionIndex] : saved[savedIndex];

  const handleNew = () => {
    localStorage.removeItem("selectedSubjectsEdit");
    localStorage.removeItem("selectedLocksEdit");
    navigate("/main");
  };

  if (!current) {
    return (
      <div className="min-h-screen dark:bg-dark">
        <Navbar login={true} profile={true} />
        <div className="flex flex-col items-center mt-16 gap-4 dark:text-white">
          <p className="text-lg">No timetables yet.</p>
          <button onClick={handleNew} className="btn bg-blue-700 text-white px-4 font-bold">
            Create one
          </button>
        </div>
      </div>
    );
  }

  const grid = transformBackendTimetable(current.timetable);
  const credits = current.credits ?? current.score ?? 0;
  const missedSubjects = current.missedSubjects || [];
  const brokenPreferences = current.brokenPreferences || [];

  // In Compare mode, cells that differ from Option 1 are highlighted.
  const showCompare = inOptions && compare && optionIndex > 0;
  const differsFromFirst = (day, i) =>
    showCompare && cellId(current.timetable[day]?.[i]) !== cellId(variants[0].timetable[day]?.[i]);

  // The request behind this timetable: from the last Generate, or saved with the timetable.
  const request = inOptions
    ? generated.request
    : current.selection && { timetable: current.selection.picks, locks: current.selection.locks || [] };

  const lockOf = (code) => locks.find((l) => l.code === code);
  const toggleLock = (code, slot) =>
    setLocks((prev) =>
      prev.some((l) => l.code === code && l.slot === slot)
        ? prev.filter((l) => l.code !== code)
        : [...prev.filter((l) => l.code !== code), { code, slot }]
    );

  const handleRegenerate = async () => {
    const clash = findLockClash(locks);
    if (clash) {
      toast.error(clash);
      return;
    }
    setRegenerating(true);
    try {
      const body = { ...request, locks };
      const response = await api.post("/timetables", body);
      const next = {
        variants: response.data.variants,
        partial: response.data.partial,
        warnings: response.data.warnings || [],
        request: body,
      };
      sessionStorage.setItem("generatedVariants", JSON.stringify(next));
      setGenerated(next);
      setView("options");
      setOptionIndex(0);
      setSavedOptions({});
      setCompare(false);
      toast.success(locks.length ? `Regenerated around ${locks.length} lock${locks.length === 1 ? "" : "s"}` : "Regenerated");
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Could not regenerate"));
    } finally {
      setRegenerating(false);
    }
  };

  const handleEdit = async () => {
    if (request) {
      localStorage.setItem("selectedSubjectsEdit", JSON.stringify(subjectsForEdit(request.timetable)));
      localStorage.setItem("selectedLocksEdit", JSON.stringify(locks));
    } else {
      // Older saved timetables have no selection: rebuild the subject list from the grid.
      const [subjects] = await transformData([{ timetable: grid, missedSubjects }]);
      localStorage.setItem("selectedSubjectsEdit", JSON.stringify(subjects));
      localStorage.removeItem("selectedLocksEdit");
    }
    navigate("/main");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selection = generated.request && { picks: generated.request.timetable, locks: generated.request.locks || [] };
      const response = await api.post("/timetables/save", { ...current, selection });
      setSaved(response.data.tables);
      setSavedOptions((prev) => ({ ...prev, [optionIndex]: true }));
      toast.success(`Option ${optionIndex + 1} saved`);
    } catch (error) {
      console.error(error);
      toast.error(errorMessage(error, "Could not save this timetable"));
    } finally {
      setSaving(false);
    }
  };

  const title = inOptions ? `Option ${optionIndex + 1}` : `Saved timetable ${savedIndex + 1}`;

  return (
    <div className="min-h-screen dark:bg-dark">
      <Navbar login={true} profile={true} />

      <div className="flex flex-col justify-center items-center mt-8 gap-6 px-4 w-full">
        {/* New options vs saved history */}
        {variants.length > 0 && (
          <div className="flex gap-2">
            <button className={tabClass(view === "options")} onClick={() => setView("options")}>
              New options ({variants.length})
            </button>
            <button
              className={tabClass(view === "saved")}
              onClick={() => setView("saved")}
              disabled={saved.length === 0}
              title={saved.length === 0 ? "Nothing saved yet" : undefined}
            >
              Saved timetables ({saved.length})
            </button>
          </div>
        )}

        <div className="w-full max-w-5xl p-6 bg-dark/5 dark:bg-white/5 backdrop-blur-sm border border-dark/20 dark:border-white/20 rounded-4xl">
          <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
            <div>
              <h2 className="text-3xl font-bold dark:text-white">{title}</h2>
              <p className="text-dark/60 dark:text-white/60 mt-1">
                {credits} credits · {missedSubjects.length} missed
              </p>
              {credits === 0 && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  None of your subjects could be placed. The reasons are listed under Missed Subjects.
                </p>
              )}
              {brokenPreferences.length > 0 && (
                <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  {brokenPreferences.map((b) => (
                    <li key={b}>Breaks your preference: {b}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              {inOptions && (
                <button
                  onClick={handleSave}
                  disabled={saving || savedOptions[optionIndex]}
                  className="btn bg-green-600 text-white px-4 font-bold disabled:opacity-60"
                >
                  {savedOptions[optionIndex] ? "Saved ✓" : saving ? "Saving..." : "Save this one"}
                </button>
              )}
              <button onClick={handleEdit} className="btn bg-blue-700 text-white px-4 font-bold">
                Edit
              </button>
              <button onClick={handleNew} className="btn bg-dark text-white dark:bg-white dark:text-dark px-4 font-bold">
                New
              </button>
            </div>
          </div>

          {/* Option tabs */}
          {inOptions && (
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                {variants.map((v, i) => (
                  <button key={i} className={tabClass(i === optionIndex)} onClick={() => setOptionIndex(i)}>
                    Option {i + 1} · {v.credits} cr
                  </button>
                ))}
              </div>
              <div className="flex gap-4 items-center flex-wrap text-sm">
                {variants.length > 1 && (
                  <label className="flex items-center gap-2 dark:text-white cursor-pointer">
                    <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                    Compare with Option 1
                  </label>
                )}
                {variants.length < MAX_VARIANTS && (
                  <span className="text-dark/60 dark:text-white/60">
                    Only {variants.length} possible timetable{variants.length === 1 ? "" : "s"} for these subjects.
                  </span>
                )}
                {generated.warnings?.map((w) => (
                  <span key={w} className="text-amber-600 dark:text-amber-400">
                    {w}
                  </span>
                ))}
                {generated.partial && (
                  <span className="text-amber-600 dark:text-amber-400">
                    The search took too long and stopped early; these are the best found.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Locks */}
          {request && (
            <div className="mb-4 flex gap-3 items-center flex-wrap text-sm">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-dark font-semibold disabled:opacity-60"
              >
                {regenerating ? "Regenerating..." : `Regenerate around locks (${locks.length})`}
              </button>
              {locks.length > 0 && (
                <button
                  onClick={() => setLocks([])}
                  className="px-4 py-2 rounded-2xl border border-dark/30 dark:border-white/30 dark:text-white hover:bg-dark/10 dark:hover:bg-white/10"
                >
                  Clear all locks
                </button>
              )}
              <span className="text-dark/60 dark:text-white/60">Click 🔓 on a class to keep it in that slot.</span>
            </div>
          )}

          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] border-collapse border border-dark/20 dark:border-white/20">
              <thead className="bg-dark/10 dark:bg-white/10">
                <tr>
                  <th className="border border-dark/20 dark:border-white/20 px-4 py-3 text-left dark:text-white">
                    Time / Day
                  </th>
                  {days.map((day) => (
                    <th key={day} className="border border-dark/20 dark:border-white/20 px-4 py-3 text-left dark:text-white">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slot} className="hover:bg-dark/10 dark:hover:bg-white/10">
                    <td className="border border-dark/20 dark:border-white/20 px-4 py-2 font-semibold dark:text-white bg-dark/5 dark:bg-white/5">
                      {slot}
                    </td>
                    {days.map((day) => {
                      const cell = grid[day]?.[slot];
                      const changed = differsFromFirst(day, slotIndex);
                      const filled = cell?.subjectSlot && cell.subjectSlot !== "FREE";
                      const isLocked = filled && lockOf(cell.code)?.slot === cell.subjectSlot;
                      return (
                        <td
                          key={day + slot}
                          className={`border border-dark/20 dark:border-white/20 px-4 py-2 dark:text-white align-top ${
                            changed ? "bg-amber-300/40 dark:bg-amber-400/25 outline-2 outline-amber-500 -outline-offset-2" : ""
                          } ${isLocked ? "shadow-[inset_0_0_0_3px_rgb(245,158,11)]" : ""}`}
                          title={changed ? "Different from Option 1" : undefined}
                        >
                          {cell?.subjectSlot && cell.subjectSlot !== "FREE" ? (
                            <div className="flex flex-col items-start">
                              <div className="relative group max-w-[100px]">
                                <div className="text-blue-600 dark:text-blue-400 font-bold line-clamp-2">{cell.subject}</div>
                                <div
                                  className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-1
                                                hidden group-hover:block bg-dark/90 dark:bg-white/90
                                                text-white dark:text-black text-xs px-2 py-1 rounded shadow-lg
                                                whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                                >
                                  {cell.subject}
                                </div>
                              </div>
                              <div className="text-dark/60 dark:text-white/60 text-sm">{cell.subjectSlot}</div>
                              <div className="text-dark/40 dark:text-white/40 text-xs">{cell.duration}</div>
                              {request && (
                                <button
                                  onClick={() => toggleLock(cell.code, cell.subjectSlot)}
                                  className={`mt-1 text-xs px-2 py-0.5 rounded-full ${
                                    isLocked
                                      ? "bg-amber-500 text-dark font-semibold"
                                      : "bg-dark/10 dark:bg-white/10 hover:bg-dark/20 dark:hover:bg-white/20"
                                  }`}
                                  title={isLocked ? "Unlock" : `Keep ${cell.code} in ${cell.subjectSlot}`}
                                >
                                  {isLocked ? "🔒 Locked" : "🔓 Lock"}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-bold">Free</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Saved history: step through it */}
          {!inOptions && saved.length > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 flex-wrap">
              <button
                onClick={() => setSavedIndex((i) => (i === 0 ? saved.length - 1 : i - 1))}
                className="px-4 py-2 bg-dark/20 dark:bg-white/20 border border-dark/30 dark:border-white/30 rounded-2xl hover:bg-dark/30 dark:hover:bg-white/30 dark:text-white"
              >
                Previous
              </button>
              <span className="dark:text-white text-sm">
                {savedIndex + 1} of {saved.length}
              </span>
              <button
                onClick={() => setSavedIndex((i) => (i + 1) % saved.length)}
                className="px-4 py-2 bg-blue-600 text-white border border-blue-800/30 rounded-2xl hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Missed Subjects Section */}
        {missedSubjects.length !== 0 && (
          <div className="w-full max-w-2xl p-4 bg-dark/5 dark:bg-white/5 backdrop-blur-sm border border-dark/20 dark:border-white/20 rounded-4xl">
            <h3 className="text-lg font-bold mb-3 dark:text-white text-center">Missed Subjects</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {missedSubjects.map((item, index) => (
                <div
                  key={index}
                  className="p-2 bg-dark/10 dark:bg-white/10 border border-dark/20 dark:border-white/20 rounded-xl flex flex-col items-center text-center break-words"
                >
                  <div className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{item.subject}</div>
                  <div className="text-dark/60 dark:text-white/60 text-xs">{item.code}</div>
                  {item.reason && <div className="text-dark/70 dark:text-white/70 text-xs mt-1">{item.reason}</div>}
                  {item.mustInclude && (
                    <div className="text-xs mt-1 px-2 py-0.5 rounded-full bg-red-600 text-white">Must-include subject left out</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timetable;
