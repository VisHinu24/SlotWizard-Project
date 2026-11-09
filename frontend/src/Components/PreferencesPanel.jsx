import React, { useState } from "react";
import { DEFAULT_PREFERENCES } from "../Lib/preferences";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEIGHTS = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
];

const Segmented = ({ options, value, onChange, disabled }) => (
  <div className={`inline-flex rounded-lg overflow-hidden border border-dark/20 dark:border-white/20 ${disabled ? "opacity-40" : ""}`}>
    {options.map(([key, label]) => (
      <button
        key={key}
        type="button"
        disabled={disabled}
        onClick={() => onChange(key)}
        className={`px-2.5 py-1 text-xs font-semibold ${
          value === key ? "bg-blue-600 text-white" : "bg-dark/5 dark:bg-white/5 text-dark dark:text-white hover:bg-dark/15 dark:hover:bg-white/15"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const Row = ({ label, hint, pref, onChange, canBeHard = true, children }) => (
  <div className="p-3 rounded-lg bg-dark/10 dark:bg-white/10 flex flex-col gap-2">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <label className="flex items-center gap-2 font-medium text-dark dark:text-white cursor-pointer">
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
    {pref.on && hint && <p className="text-xs text-dark/60 dark:text-white/60">{hint(pref)}</p>}
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
    <div className="mt-6 border border-dark/20 dark:border-white/20 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 font-semibold text-dark dark:text-white"
      >
        <span>
          Time preferences{" "}
          <span className="text-sm font-normal text-dark/60 dark:text-white/60">
            {activeCount ? `(${activeCount} on)` : "(none)"}
          </span>
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <Row label="No 8:00–10:00 classes" pref={prefs.avoidEarly} onChange={update("avoidEarly")} hint={hardOrSoft} />
          <Row label="No 3:00–5:00 classes" pref={prefs.avoidLate} onChange={update("avoidLate")} hint={hardOrSoft} />
          <Row label="Keep days free" pref={prefs.freeDays} onChange={update("freeDays")} hint={hardOrSoft}>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    prefs.freeDays.days.includes(day)
                      ? "bg-blue-600 text-white"
                      : "bg-dark/10 dark:bg-white/10 text-dark dark:text-white hover:bg-dark/20 dark:hover:bg-white/20"
                  }`}
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
            <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
              At most
              <select
                value={prefs.maxPerDay.max}
                onChange={(e) => update("maxPerDay")({ max: Number(e.target.value) })}
                className="rounded px-2 py-1 bg-white dark:bg-gray-800 border border-dark/20 dark:border-white/20"
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
          <p className="text-xs text-dark/60 dark:text-white/60">
            Weight sets how much a soft preference matters. Credits always come first: one extra credit outweighs two High
            misses.
          </p>
        </div>
      )}
    </div>
  );
};

export default PreferencesPanel;
