import React, { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { DEFAULT_PREFERENCES } from "../Lib/preferences";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEIGHTS = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
];

const Segmented = ({ options, value, onChange, disabled }) => (
  <div className={`inline-flex rounded-md overflow-hidden border-2 border-ink divide-x-2 divide-ink ${disabled ? "opacity-40" : ""}`}>
    {options.map(([key, label]) => (
      <button
        key={key}
        type="button"
        disabled={disabled}
        onClick={() => onChange(key)}
        className={`px-2.5 py-1 text-xs font-bold ${
          value === key ? "bg-nb-yellow text-black" : "bg-card text-ink enabled:hover:bg-paper"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        {label}
      </button>
    ))}
  </div>
);

const Row = ({ label, hint, pref, onChange, canBeHard = true, children }) => (
  <div className={`p-3 border-2 border-ink rounded-lg flex flex-col gap-2 ${pref.on ? "bg-card" : "bg-paper"}`}>
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <label className="flex items-center gap-2.5 font-bold cursor-pointer">
        <input type="checkbox" checked={pref.on} onChange={(e) => onChange({ on: e.target.checked })} />
        {label}
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {canBeHard && (
          <Segmented
            options={[
              ["soft", "Soft"],
              ["hard", "Hard"],
            ]}
            value={pref.hard ? "hard" : "soft"}
            onChange={(v) => onChange({ hard: v === "hard" })}
            disabled={!pref.on}
          />
        )}
        <Segmented options={WEIGHTS} value={pref.weight} onChange={(w) => onChange({ weight: w })} disabled={!pref.on || pref.hard} />
      </div>
    </div>
    {pref.on && children}
    {pref.on && hint && <p className="text-xs text-muted">{hint(pref)}</p>}
  </div>
);

const hardOrSoft = (pref) =>
  pref.hard ? "Hard: never broken, even if a subject has to be dropped." : "Soft: preferred, but never costs you a subject that fits.";

const PreferencesPanel = ({ preferences, onChange }) => {
  const [open, setOpen] = useState(false);
  const prefs = preferences || DEFAULT_PREFERENCES;
  const activeCount = Object.values(prefs).filter((p) => p.on).length;

  const update = (key) => (patch) => onChange({ ...prefs, [key]: { ...prefs[key], ...patch } });

  const toggleDay = (day) => {
    const days = prefs.freeDays.days.includes(day)
      ? prefs.freeDays.days.filter((d) => d !== day)
      : DAYS.filter((d) => d === day || prefs.freeDays.days.includes(d));
    update("freeDays")({ days });
  };

  return (
    <div className="nb-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full flex justify-between items-center gap-3 px-5 py-4 font-bold text-lg cursor-pointer ${open ? "border-b-3 border-ink" : ""}`}
      >
        <span className="flex items-center gap-3">
          <span className="nb-blue inline-flex p-1.5 border-2 border-ink rounded-md"><Clock size={18} /></span>
          Time preferences
          <span className={`nb-chip ${activeCount ? "nb-yellow" : "bg-card"}`}>
            {activeCount ? `${activeCount} on` : "none"}
          </span>
        </span>
        <ChevronDown size={20} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-5 flex flex-col gap-3">
          <Row label="No 8:00–10:00 classes" pref={prefs.avoidEarly} onChange={update("avoidEarly")} hint={hardOrSoft} />
          <Row label="No 3:00–5:00 classes" pref={prefs.avoidLate} onChange={update("avoidLate")} hint={hardOrSoft} />
          <Row label="Keep days free" pref={prefs.freeDays} onChange={update("freeDays")} hint={hardOrSoft}>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`nb-btn nb-btn-sm ${prefs.freeDays.days.includes(day) ? "nb-blue" : ""}`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </Row>
          <Row
            label="Fewer gaps between classes"
            pref={prefs.fewerGaps}
            onChange={update("fewerGaps")}
            canBeHard={false}
            hint={() => "Soft only: prefers classes back to back on the same day."}
          />
          <Row label="Max classes per day" pref={prefs.maxPerDay} onChange={update("maxPerDay")} hint={hardOrSoft}>
            <label className="flex items-center gap-2 text-sm font-medium">
              At most
              <select
                value={prefs.maxPerDay.max}
                onChange={(e) => update("maxPerDay")({ max: Number(e.target.value) })}
                className="px-2 py-1 font-bold bg-card text-ink border-2 border-ink rounded-md cursor-pointer"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              of 4 slots a day
            </label>
          </Row>
          <p className="text-xs text-muted">
            Weight sets how much a soft preference matters. Credits always come first: one extra credit outweighs two High
            misses.
          </p>
        </div>
      )}
    </div>
  );
};

export default PreferencesPanel;
