import React, { useState } from 'react';

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

  return (
    <div className="flex-1 m-3 p-5 bg-white/10 dark:bg-gray-800/50 rounded-3xl z-10 backdrop-blur-sm shadow-lg overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-dark dark:text-white">Selected Subjects</h2>
        <div className="flex gap-2 flex-wrap justify-end">
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            selectedSubjects.length >= maxSubjects
              ? 'bg-amber-400 text-dark'
              : 'bg-dark/10 dark:bg-white/10 text-dark dark:text-white'
          }`}
        >
          {selectedSubjects.length} / {maxSubjects} subjects
        </span>
        <span
          className="px-3 py-1 rounded-full text-sm font-semibold bg-dark/10 dark:bg-white/10 text-dark dark:text-white"
          title={`Select as many as you like. The timetable will fit up to ${maxCredits} credits (college limit).`}
        >
          {totalCredits} credits selected · timetable fits up to {maxCredits}
        </span>
        </div>
      </div>
      {selectedSubjects.length === 0 ? (
        <p className="text-dark/50 dark:text-white/50 mt-4">
          No subjects selected. Pick subjects from the list to get started. Choosing a few more than 30 credits
          gives the timetable room to work around clashes.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          <p className="text-sm text-dark/60 dark:text-white/60">
            When subjects clash, the timetable drops whichever ones keep your credits highest. Tap{' '}
            <span className="font-semibold">Must include</span> on a subject you can't skip (e.g. a core subject):
            every option will have it, even if that means fewer credits.
          </p>
          {selectedSubjects.map((subj) => {
            const uniqueStaff = Array.from(new Set(subj.schedules.map(s => s.staff)));
            const isExpanded = expandedSubjects[subj.code] || false;
            const lock = locks.find((l) => l.code === subj.code);

            return (
              <div key={subj.code} className="p-4 border rounded-lg bg-dark/10 dark:bg-white/10">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-dark dark:text-white">{subj.code} - {subj.subject}</h3>
                    {lock && (
                      <span className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-dark">
                        🔒 Locked to {lock.slot}
                        <button onClick={() => onUnlock?.(subj.code)} className="ml-1 hover:opacity-70" title="Unlock">
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Must include */}
                    <button
                      onClick={() => onToggleMustInclude?.(subj.code)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        subj.mustInclude
                          ? 'bg-green-600 text-white'
                          : 'bg-dark/10 dark:bg-white/10 text-dark dark:text-white hover:bg-dark/20 dark:hover:bg-white/20'
                      }`}
                      title="Must include: every timetable option will have this subject, even if that means fewer total credits"
                    >
                      {subj.mustInclude ? '✓ Must include' : 'Must include'}
                    </button>
                    {/* Collapse/Expand */}
                    <button
                      onClick={() => toggleExpand(subj.code)}
                      className="p-1 rounded hover:bg-dark/20 dark:hover:bg-white/20 text-lg"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteSubject(subj.code)}
                      className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-600 text-red-500 dark:text-red-400 text-lg"
                      title="Delete Subject"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-dark/60 dark:text-white/60">Available Staff</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelectAll(subj, true)}
                          className="px-3 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => handleSelectAll(subj, false)}
                          className="px-3 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>


                    {uniqueStaff.map((staffName, index) => {
                      const isSelected = subj.preferredStaff[staffName] || false;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-dark/20 dark:bg-white/20 rounded-lg">
                          <div>
                            <p className="font-medium text-dark dark:text-white">{staffName}</p>
                            <p className="text-sm text-dark/50 dark:text-white/50">
                              {subj.schedules.filter(s => s.staff === staffName).map(s => s.slot).join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOnlyStaff?.(subj.code, staffName)}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-dark/10 dark:bg-white/10 text-dark dark:text-white hover:bg-dark/20 dark:hover:bg-white/20"
                            title="Lock this faculty: deselect everyone else"
                          >
                            Only this
                          </button>
                          <button
                            onClick={() => onUpdateStaff(subj.code, staffName)}
                            className={`px-4 py-1 rounded-full font-medium ${
                              isSelected
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-200 text-dark hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {beforeGenerate}
          <button
            onClick={onGenerate}
            disabled={selectedSubjects.length < 1 || generating}
            className={`mt-6 w-full py-2 rounded-lg text-white ${
              selectedSubjects.length < 1 || generating ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {generating ? 'Generating…' : 'Generate Timetable'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EnrollmentPanel;
