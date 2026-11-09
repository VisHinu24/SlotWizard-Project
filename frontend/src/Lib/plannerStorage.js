// The in-progress selection (subjects, locks, last generated options) lives in the browser,
// not on the account. Clear it whenever the signed-in person changes, so one student's
// picks never show up for the next person on the same browser.
export const clearPlannerStorage = () => {
  try {
    ["selectedSubjectsEdit", "selectedLocksEdit", "selectedSubjects"].forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem("generatedVariants");
  } catch {
    // storage blocked (private mode): nothing to clear
  }
};
