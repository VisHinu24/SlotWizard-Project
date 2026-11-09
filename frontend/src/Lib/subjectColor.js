// Gives each subject one of six colours, based on its code, so the same
// subject looks the same in the catalog, the selected list and the timetable.
const COLOURS = 6;

const subjectColor = (code = "") => {
  let hash = 0;
  for (const ch of String(code)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `sub-${hash % COLOURS}`;
};

export default subjectColor;
