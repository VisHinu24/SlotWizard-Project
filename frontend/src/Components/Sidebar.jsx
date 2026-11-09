import React from 'react';

const Sidebar = ({ subjects, onAddSubject, searchTerm, setSearchTerm, selectedCodes = new Set(), locked = false, maxSubjects = 13 }) => {
  return (
    <div className="border sm:w-[35%] m-4 h-[45vh] sm:h-[85vh] bg-dark/5 border-dark/20 dark:bg-white/5 backdrop-blur-sm dark:border-white/20 rounded-3xl flex flex-col items-center overflow-y-auto">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-11/12 m-4 p-2 border-2 sticky top-2 border-dark rounded-lg dark:bg-gray-800 dark:text-white"
        placeholder="Search by name or code..."
      />
      {locked && (
        <p className="w-11/12 -mt-2 mb-1 px-3 py-2 rounded-lg text-sm bg-amber-400/90 text-dark font-semibold">
          {maxSubjects} subjects selected (the limit). Remove one to add another.
        </p>
      )}
      <div className="w-full">
        {subjects.map((subject) => {
          const added = selectedCodes.has(subject.code);
          const disabled = added || locked;
          return (
            <div
              key={subject.code}
              role="button"
              aria-disabled={disabled}
              title={added ? 'Already selected' : locked ? `Limit of ${maxSubjects} subjects reached` : undefined}
              className={`w-11/12 mx-auto my-2 p-3 rounded-2xl ${
                added
                  ? 'bg-blue-500/80 text-white cursor-default'
                  : locked
                  ? 'bg-dark/10 dark:bg-white/20 text-dark/40 dark:text-white/40 cursor-not-allowed'
                  : 'cursor-pointer bg-dark/30 dark:bg-white/50 hover:bg-blue-400 hover:text-white'
              }`}
              onClick={() => !disabled && onAddSubject(subject)}
            >
              {added && '✓ '}{subject.code} - {subject.subject}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
