import mongoose from "mongoose";

// --- DaySlots schema (array of 4 slots per day) ---
const daySlotsSchema = new mongoose.Schema(
  {
    Monday: { type: [mongoose.Schema.Types.Mixed], default: ["empty", "empty", "empty", "empty"] },
    Tuesday: { type: [mongoose.Schema.Types.Mixed], default: ["empty", "empty", "empty", "empty"] },
    Wednesday: { type: [mongoose.Schema.Types.Mixed], default: ["empty", "empty", "empty", "empty"] },
    Thursday: { type: [mongoose.Schema.Types.Mixed], default: ["empty", "empty", "empty", "empty"] },
    Friday: { type: [mongoose.Schema.Types.Mixed], default: ["empty", "empty", "empty", "empty"] },
    Saturday: { type: [mongoose.Schema.Types.Mixed], default: ["empty", "empty", "empty", "empty"] },
  },
  { _id: false }
);

// --- Missing subject schema ---
const missingSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    code: { type: String, required: true },
    reason: { type: String }, // why it was left out, e.g. "Clashes with your other subjects"
    mustInclude: { type: Boolean },
  },
  { _id: false }
);

// --- Table schema (one generated timetable) ---
const tableSchema = new mongoose.Schema(
  {
    score: { type: Number, default: 0 },
    credits: { type: Number, default: 0 },
    timetable: { type: daySlotsSchema, default: () => ({}) },
    missedSubjects: { type: [missingSchema], default: [] },
    brokenPreferences: { type: [String], default: [] },
    // What the student picked: { picks: [{ code, staff, mustInclude }], locks: [{ code, slot }] }
    selection: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

// --- User schema ---
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // Never loaded unless a query asks for it with .select("+password").
  password: { type: String, required: true, select: false },
  department: { type: String, required: true },
  registerNumber: { type: Number, required: true },
  tables: { type: [tableSchema], default: [] },
  // Time preferences; shape is set by normalizePreferences in services/preferences.js.
  preferences: { type: mongoose.Schema.Types.Mixed },
});

// Extra safety: never include the password hash when a user is sent as JSON.
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
