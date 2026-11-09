import React, { useState } from 'react';
import { ChevronDown, Lock, Sparkles, Star, Trash2, X } from 'lucide-react';
import subjectColor from '../Lib/subjectColor';

const EnrollmentPanel = ({ selectedSubjects, onUpdateStaff, onGenerate, onDeleteSubject, totalCredits = 0, maxCredits = 30, maxSubjects = 13, beforeGenerate = null, generating = false, locks = [], onToggleMustInclude, onOnlyStaff, onUnlock }) => {
  const [expandedSubjects, setExpandedSubjects] = useState({});

  const handleSelectAll = (subj, value) => {
    const updatedStaff = subj.preferredStaff
      ? Object.fromEntries(Object.keys(subj.preferredStaff).map(staff => [staff, value]))
      : {};
    onUpdateStaff(subj.code, updatedStaff, true);
  };

  const toggleExpand = (code) => {
    setExpandedSubjects(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const atLimit = selectedSubjects.length >= maxSubjects;

  return (
    <section className="flex flex-col gap-6">
      <div className="nb-card overflow-hidden">
        <div className="flex justify-between items-center gap-3 flex-wrap px-5 py-4 border-b-3 border-ink">
          <h2 className="text-xl font-bold">Your picks</h2>
          <div className="flex gap-2 flex-wrap">
            <span className={`nb-chip text-sm ${atLimit ? 'nb-yellow' : 'bg-card'}`}>
              {selectedSubjects.length} / {maxSubjects} subjects
            </span>
            <span
              className={`nb-chip text-sm ${totalCredits >= maxCredits ? 'nb-green' : 'bg-card'}`}
              title={`Select as many as you like. The timetable will fit up to ${maxCredits} credits (college limit).`}
            >
              {totalCredits} credits · fits {maxCredits}
            </span>
          </div>
        </div>

        {selectedSubjects.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-2xl font-bold">Start with the catalog</p>
            <p className="text-muted mt-2 max-w-md mx-auto">
              Click subjects to add them here. Picking a few more than 30 credits gives the timetable room to work
              around clashes.
            </p>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            <p className="text-sm text-muted">
              When subjects clash, the timetable drops whichever ones keep your credits highest. Mark a subject{' '}
              <span className="font-bold text-ink">Must include</span> if you can't skip it: every option will have it,
              even if that means fewer credits.
            </p>

            {selectedSubjects.map((subj) => {
              const uniqueStaff = Array.from(new Set(subj.schedules.map(s => s.staff)));
              const chosen = uniqueStaff.filter((n) => subj.preferredStaff[n]).length;
              const isExpanded = expandedSubjects[subj.code] || false;
              const lock = locks.find((l) => l.code === subj.code);

              return (
                <div key={subj.code} className="nb-card-flat overflow-hidden flex">
                  <span className={`${subjectColor(subj.code)} w-2.5 shrink-0 border-r-2 border-ink`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    {/* Buttons sit in a fixed spot: right side on wider screens, under the name on phones.
                        Long names wrap inside their own column instead of pushing the buttons down. */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`${subjectColor(subj.code)} nb-chip border-black`}>{subj.code}</span>
                          <span className="text-xs font-bold text-muted">{subj.credits} cr</span>
                          {lock && (
                            <span className="nb-chip nb-yellow border-black">
                              <Lock size={12} /> {lock.slot}
                              <button onClick={() => onUnlock?.(subj.code)} className="ml-0.5 hover:opacity-60" title="Unlock" aria-label={`Unlock ${subj.code}`}>
                                <X size={12} />
                              </button>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold leading-tight break-words">{subj.subject}</h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onToggleMustInclude?.(subj.code)}
                          className={`nb-btn nb-btn-sm ${subj.mustInclude ? 'nb-green' : ''}`}
                          title="Must include: every timetable option will have this subject, even if that means fewer total credits"
                        >
                          <Star size={13} className={subj.mustInclude ? 'fill-current' : ''} />
                          Must include
                        </button>
                        <button
                          onClick={() => toggleExpand(subj.code)}
                          className="nb-btn nb-btn-sm min-w-[7.5rem] justify-between tabular-nums"
                          aria-expanded={isExpanded}
                          title="Choose faculty"
                        >
                          {chosen}/{uniqueStaff.length} faculty
                          <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                          onClick={() => onDeleteSubject(subj.code)}
                          className="nb-btn nb-btn-sm hover:bg-nb-red hover:text-black"
                          title="Remove subject"
                          aria-label={`Remove ${subj.code}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t-2 border-ink p-3 flex flex-col gap-2.5 bg-paper">
                        <div className="flex items-center justify-between gap-2">
                          <p className="nb-label">Faculty</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleSelectAll(subj, true)} className="nb-btn nb-btn-sm">
                              Select all
                            </button>
                            <button onClick={() => handleSelectAll(subj, false)} className="nb-btn nb-btn-sm">
                              Clear all
                            </button>
                          </div>
                        </div>

                        {uniqueStaff.map((staffName) => {
                          const isSelected = subj.preferredStaff[staffName] || false;
                          return (
                            <div
                              key={staffName}
                              className={`flex items-center justify-between gap-3 flex-wrap p-2.5 border-2 border-ink rounded-lg ${
                                isSelected ? 'bg-card' : 'bg-card opacity-60'
                              }`}
                            >
                              <label className="flex items-center gap-3 cursor-pointer min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => onUpdateStaff(subj.code, staffName)}
                                />
                                <span className="min-w-0">
                                  <span className="block font-bold">{staffName}</span>
                                  <span className="flex gap-1 flex-wrap mt-1">
                                    {subj.schedules.filter(s => s.staff === staffName).map(s => (
                                      <span key={s.slot} className="nb-chip bg-paper font-semibold">{s.slot}</span>
                                    ))}
                                  </span>
                                </span>
                              </label>
                              <button
                                onClick={() => onOnlyStaff?.(subj.code, staffName)}
                                className="nb-btn nb-btn-sm"
                                title="Lock this faculty: deselect everyone else"
                              >
                                Only this
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSubjects.length > 0 && beforeGenerate}

      {selectedSubjects.length > 0 && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="nb-btn nb-pink w-full text-xl py-4"
        >
          <Sparkles size={22} />
          {generating ? 'Generating…' : 'Generate timetable'}
        </button>
      )}
    </section>
  );
};

export default EnrollmentPanel;
