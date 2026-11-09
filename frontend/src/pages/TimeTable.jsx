import Navbar from "../Components/Navbar";
import { ChevronLeft, ChevronRight, Lock, LockOpen, Pencil, Plus, RefreshCw, Save } from "lucide-react";
import subjectColor from "../Lib/subjectColor";
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

const tabClass = (active) => `nb-btn nb-btn-sm text-sm px-3 py-1.5 ${active ? "nb-ink" : ""}`;
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat" };

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
    return (
      <div className="min-h-screen">
        <Navbar login={true} profile={true} />
        <p className="text-center text-xl font-bold mt-24 animate-pulse">Loading your timetables…</p>
      </div>
    );
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
      <div className="min-h-screen">
        <Navbar login={true} profile={true} />
        <div className="px-4 py-20 flex justify-center">
          <div className="nb-card max-w-md w-full p-8 text-center">
            <p className="text-3xl font-bold">No timetables yet</p>
            <p className="text-muted mt-2">Pick your subjects and generate your first one.</p>
            <button onClick={handleNew} className="nb-btn nb-pink text-lg px-6 py-3 mt-6">
              <Plus size={20} /> Create one
            </button>
          </div>
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

  const notices = [
    ...(inOptions && variants.length < MAX_VARIANTS
      ? [`Only ${variants.length} possible timetable${variants.length === 1 ? "" : "s"} for these subjects.`]
      : []),
    ...(inOptions ? generated.warnings || [] : []),
    ...(inOptions && generated.partial ? ["The search took too long and stopped early; these are the best found."] : []),
  ];

  return (
    <div className="min-h-screen">
      <Navbar login={true} profile={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Header: title, totals, actions */}
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <div>
            {variants.length > 0 && (
              <div className="flex gap-2 mb-4">
                <button className={tabClass(view === "options")} onClick={() => setView("options")}>
                  New options ({variants.length})
                </button>
                <button
                  className={tabClass(view === "saved")}
                  onClick={() => setView("saved")}
                  disabled={saved.length === 0}
                  title={saved.length === 0 ? "Nothing saved yet" : undefined}
                >
                  Saved ({saved.length})
                </button>
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{title}</h1>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="nb-chip nb-yellow border-black text-sm">{credits} credits</span>
              <span className={`nb-chip text-sm border-black ${missedSubjects.length ? "nb-pink" : "nb-green"}`}>
                {missedSubjects.length} missed
              </span>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleEdit} className="nb-btn">
              <Pencil size={16} /> Edit
            </button>
            <button onClick={handleNew} className="nb-btn">
              <Plus size={16} /> New
            </button>
            {inOptions && (
              <button onClick={handleSave} disabled={saving || savedOptions[optionIndex]} className="nb-btn nb-pink">
                <Save size={16} />
                {savedOptions[optionIndex] ? "Saved ✓" : saving ? "Saving..." : "Save this one"}
              </button>
            )}
          </div>
        </div>

        {credits === 0 && (
          <p className="nb-card-flat nb-pink px-4 py-3 font-semibold">
            None of your subjects could be placed. The reasons are listed under Missed subjects.
          </p>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* Timetable */}
          <section className="nb-card overflow-hidden">
            {inOptions && (
              <div className="flex justify-between items-center gap-3 flex-wrap px-5 py-4 border-b-3 border-ink">
                <div className="flex gap-2 flex-wrap">
                  {variants.map((v, i) => (
                    <button key={i} className={tabClass(i === optionIndex)} onClick={() => setOptionIndex(i)}>
                      Option {i + 1} · {v.credits} cr
                    </button>
                  ))}
                </div>
                {variants.length > 1 && (
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                    Compare with Option 1
                  </label>
                )}
              </div>
            )}

            {notices.length > 0 && (
              <ul className="px-5 py-3 border-b-3 border-ink bg-nb-yellow text-black text-sm font-semibold flex flex-col gap-1">
                {notices.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}

            <div className="overflow-x-auto custom-scrollbar p-4 sm:p-5">
              <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-1.5">
                <thead>
                  <tr>
                    <th className="w-20" />
                    {days.map((day) => (
                      <th key={day} className="nb-label text-left px-1 pb-1">
                        {DAY_SHORT[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, slotIndex) => (
                    <tr key={slot}>
                      <td className="align-top pt-2 pr-1">
                        <span className="block font-bold text-sm">{slot.split("-")[0]}</span>
                        <span className="block text-xs text-muted">to {slot.split("-")[1]}</span>
                      </td>
                      {days.map((day) => {
                        const cell = grid[day]?.[slot];
                        const changed = differsFromFirst(day, slotIndex);
                        const filled = cell?.subjectSlot && cell.subjectSlot !== "FREE";
                        const isLocked = filled && lockOf(cell.code)?.slot === cell.subjectSlot;
                        return (
                          <td
                            key={day + slot}
                            className={`h-28 align-top rounded-lg p-2.5 ${
                              filled
                                ? `${subjectColor(cell.code)} border-black ${isLocked ? "border-4" : "border-2"}`
                                : "border-2 border-dashed border-muted/40"
                            } ${changed ? "outline-3 outline-offset-2 outline-nb-pink" : ""}`}
                            title={changed ? "Different from Option 1" : filled ? cell.subject : undefined}
                          >
                            {filled ? (
                              <div className="flex flex-col h-full gap-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-sm">{cell.code}</span>
                                  {changed && <span className="nb-chip border-black bg-nb-pink text-[10px] px-1">new</span>}
                                </div>
                                <div className="text-xs font-semibold leading-tight line-clamp-2">{cell.subject}</div>
                                <div className="text-[11px] opacity-70">
                                  {cell.subjectSlot} · {cell.duration}
                                </div>
                                {request && (
                                  <button
                                    onClick={() => toggleLock(cell.code, cell.subjectSlot)}
                                    className={`mt-auto self-start inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 border-2 border-black rounded-md cursor-pointer ${
                                      isLocked ? "bg-black text-nb-yellow" : "bg-white/60 hover:bg-white"
                                    }`}
                                    title={isLocked ? "Unlock" : `Keep ${cell.code} in ${cell.subjectSlot}`}
                                  >
                                    {isLocked ? <Lock size={11} /> : <LockOpen size={11} />}
                                    {isLocked ? "Locked" : "Lock"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-muted/70">Free</span>
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
              <div className="flex justify-center items-center gap-4 px-5 py-4 border-t-3 border-ink">
                <button onClick={() => setSavedIndex((i) => (i === 0 ? saved.length - 1 : i - 1))} className="nb-btn">
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="font-bold">
                  {savedIndex + 1} of {saved.length}
                </span>
                <button onClick={() => setSavedIndex((i) => (i + 1) % saved.length)} className="nb-btn nb-blue">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>

          {/* Side column */}
          <aside className="flex flex-col gap-6">
            {request && (
              <div className="nb-card overflow-hidden">
                <div className="px-5 py-3 border-b-3 border-ink bg-nb-yellow text-black flex items-center gap-2">
                  <Lock size={18} />
                  <h2 className="font-bold text-lg">Locks</h2>
                  <span className="nb-chip border-black bg-white ml-auto">{locks.length}</span>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  <p className="text-sm text-muted">Lock a class to keep it in its slot, then regenerate the rest around it.</p>
                  {locks.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {locks.map((l) => (
                        <span key={l.code} className={`${subjectColor(l.code)} nb-chip border-black`}>
                          {l.code} · {l.slot}
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={handleRegenerate} disabled={regenerating} className="nb-btn nb-yellow w-full">
                    <RefreshCw size={16} className={regenerating ? "animate-spin" : ""} />
                    {regenerating ? "Regenerating..." : "Regenerate around locks"}
                  </button>
                  {locks.length > 0 && (
                    <button onClick={() => setLocks([])} className="nb-btn w-full">
                      Clear all locks
                    </button>
                  )}
                </div>
              </div>
            )}

            {brokenPreferences.length > 0 && (
              <div className="nb-card p-5">
                <h2 className="font-bold text-lg mb-2">Preferences this breaks</h2>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {brokenPreferences.map((b) => (
                    <li key={b} className="nb-card-flat bg-paper px-3 py-2 font-medium">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="nb-card overflow-hidden">
              <div className="px-5 py-3 border-b-3 border-ink bg-nb-pink text-black flex items-center gap-2">
                <h2 className="font-bold text-lg">Missed subjects</h2>
                <span className="nb-chip border-black bg-white ml-auto">{missedSubjects.length}</span>
              </div>
              {missedSubjects.length === 0 ? (
                <p className="p-5 font-semibold">Everything fits. Nothing missed.</p>
              ) : (
                <ul className="p-4 flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {missedSubjects.map((item, index) => (
                    <li key={index} className="nb-card-flat p-3 break-words">
                      <span className={`${subjectColor(item.code)} nb-chip border-black`}>{item.code}</span>
                      <div className="font-bold mt-1.5 leading-tight">{item.subject}</div>
                      {item.reason && <div className="text-sm text-muted mt-1">{item.reason}</div>}
                      {item.mustInclude && (
                        <span className="nb-chip bg-nb-red text-black border-black mt-2">Must-include subject left out</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Timetable;
