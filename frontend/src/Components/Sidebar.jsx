import React from 'react';
import { Check, Plus, Search } from 'lucide-react';
import subjectColor from '../Lib/subjectColor';

// The subject catalog: search, then click a subject to add it.
const Sidebar = ({ subjects, onAddSubject, searchTerm, setSearchTerm, selectedCodes = new Set(), locked = false, maxSubjects = 13 }) => {
  return (
    <aside className="nb-card flex flex-col overflow-hidden h-[55vh] lg:h-[calc(100vh-9rem)] lg:sticky lg:top-24">
      <div className="p-4 border-b-3 border-ink bg-nb-purple text-black">
        <h2 className="text-lg font-bold mb-3">Subject catalog</h2>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="nb-input pl-10 py-2.5"
            placeholder="Search by name or code"
          />
        </div>
      </div>

      {locked && (
        <p className="mx-4 mt-4 nb-card-flat nb-yellow px-3 py-2 text-sm font-semibold">
          {maxSubjects} subjects selected (the limit). Remove one to add another.
        </p>
      )}

      <ul className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2.5">
        {subjects.length === 0 && <li className="text-muted text-center py-8">No subjects match "{searchTerm}".</li>}
        {subjects.map((subject) => {
          const added = selectedCodes.has(subject.code);
          const disabled = added || locked;
          return (
            <li key={subject.code}>
              <button
                type="button"
                disabled={disabled}
                title={added ? 'Already selected' : locked ? `Limit of ${maxSubjects} subjects reached` : `Add ${subject.subject}`}
                onClick={() => !disabled && onAddSubject(subject)}
                className={`w-full text-left flex items-center gap-3 p-2.5 border-2 border-ink rounded-lg transition-[transform,box-shadow] duration-100 ${
                  added
                    ? 'bg-nb-green text-black cursor-default'
                    : locked
                    ? 'bg-card opacity-45 cursor-not-allowed'
                    : 'bg-card cursor-pointer hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_var(--nb-ink)]'
                }`}
              >
                <span className={`${subjectColor(subject.code)} nb-chip border-black shrink-0`}>{subject.code}</span>
                <span className="flex-1 min-w-0 font-medium leading-tight">{subject.subject}</span>
                <span className="text-xs font-bold shrink-0 opacity-70">{subject.credits} cr</span>
                <span className="shrink-0">{added ? <Check size={18} /> : !locked && <Plus size={18} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default Sidebar;
