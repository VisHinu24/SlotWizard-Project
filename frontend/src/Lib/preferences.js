// Same defaults as the backend (services/preferences.js).
export const DEFAULT_PREFERENCES = {
  avoidEarly: { on: false, hard: false, weight: "medium" },
  avoidLate: { on: false, hard: false, weight: "medium" },
  freeDays: { on: false, hard: false, weight: "medium", days: [] },
  fewerGaps: { on: false, weight: "low" },
  maxPerDay: { on: false, hard: false, weight: "medium", max: 3 },
};
