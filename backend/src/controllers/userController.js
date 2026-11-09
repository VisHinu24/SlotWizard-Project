import userModel from '../model/user.js'
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { generateTimetable, MAX_CREDITS, DAYS, TimetableInputError } from "../services/timetableService.js";
import { normalizePreferences } from "../services/preferences.js";
import fs from 'fs'
import path from 'path'


const registerUser = async(req,res)=>{
    try{
        const {name,email,password,department,registerNumber} = req.body
        if (!name || !email || !password || !department || !registerNumber) {
            return res.json({sucess:false,message:"Missing Details"})
        }
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt)

        const userData ={
            name,
            email,
            password:hashedPassword,
            department,
            registerNumber
        }   
        const newUser = new userModel(userData)

        const user = await newUser.save()

        const token = jwt.sign({id: user._id},process.env.JWT_SECRET)
        res.cookie("token",token,{
            httpOnly:true,
            secure:false,
            sameSite : "lax"
        });
        res.json({success:true,token,user:{name:user.name}})
    }
    catch(e){
        console.log(e)
        res.json({sucess:false,message:e.message})
    }
}
const logoutUser = (req, res) => {
    try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,   
      sameSite: "lax"  
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const loginUser = async(req,res)=>{
    try{
        const {email,password} = req.body
        if (!email || !password) {
            return res.json({sucess:false,message:"Missing Details"})
        }
        const user = await userModel.findOne({email}).select("+password")

        if (!user){
            return res.json({sucess:false,message:"User does not exist"})
        }

        const isMatch = await bcrypt.compare(password,user.password)

        if (isMatch){
            const token = jwt.sign({id: user._id},process.env.JWT_SECRET)
            res.cookie("token", token, {
              httpOnly: true,
              secure: false,
              sameSite: "lax",
            });
            res.json({success:true,token,user:{name:user.name}})
        }
        else {
            return res.json({sucess:false,message:"Invalid password"})
        }
        
    }
    catch(e){
        console.log(e)
        res.json({sucess:false,message:e.message})
    }
}

const editProfile = async (req, res) => {
    try {
        const user = req.user; 
        const { name, department, registerNumber } = req.body;

        if (name) user.name = name;
        if (department) user.department = department;
        if (registerNumber) user.registerNumber = registerNumber;

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                name: user.name,
                department: user.department,
                registerNumber: user.registerNumber,
                email: user.email
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Please provide both current and new passwords." });
        }

        // req.user is loaded without the password, so fetch it here
        const user = await userModel.findById(req.user._id).select("+password");

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ success: true, message: "Password updated successfully." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message:e.message });
    }
};


// Most subjects a student can select (matches the enrollment page).
const MAX_SUBJECTS = 13;
// Saved timetables kept per user.
const MAX_SAVED = 10;

// [{ code, staff: [names], mustInclude?: true }]
const isPicks = (picks) =>
  Array.isArray(picks) &&
  picks.every(
    (p) =>
      typeof p?.code === "string" &&
      Array.isArray(p.staff) &&
      p.staff.every((s) => typeof s === "string") &&
      (p.mustInclude === undefined || typeof p.mustInclude === "boolean")
  );

// [{ code, slot }]: subject pinned to one slot.
const isLocks = (locks) =>
  Array.isArray(locks) && locks.every((l) => typeof l?.code === "string" && typeof l?.slot === "string");

// Generates up to 5 ranked timetables. Nothing is saved; the student picks one to save.
const createTableForUser = async (req, res) => {
  try {
    const picks = req.body.timetable;
    const locks = req.body.locks ?? [];

    if (!isPicks(picks))
      return res.status(400).json({ success: false, message: "Invalid timetable" });
    if (!isLocks(locks))
      return res.status(400).json({ success: false, message: "Invalid locks" });
    if (picks.length > MAX_SUBJECTS)
      return res.status(400).json({ success: false, message: `Select at most ${MAX_SUBJECTS} subjects` });

    // Preferences sent with the request win; otherwise use the ones saved on the account.
    const preferences = req.body.preferences ?? req.user.preferences;
    const { variants, partial, warnings } = await generateTimetable(picks, undefined, { preferences, locks });

    res.json({ success: true, variants, partial, warnings });
  } catch (e) {
    if (e instanceof TimetableInputError)
      return res.status(400).json({ success: false, message: e.message });
    console.log(e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// A grid cell is "empty" or [slot, code, subject name, hours].
const isCell = (c) =>
  c === "empty" ||
  (Array.isArray(c) && c.length === 4 && typeof c[0] === "string" && typeof c[1] === "string" &&
    typeof c[2] === "string" && typeof c[3] === "number");

const isVariant = (v) =>
  v &&
  typeof v.score === "number" &&
  typeof v.credits === "number" &&
  v.credits >= 0 && v.credits <= MAX_CREDITS &&
  v.timetable && DAYS.every((d) => Array.isArray(v.timetable[d]) && v.timetable[d].length === 4 && v.timetable[d].every(isCell)) &&
  Array.isArray(v.missedSubjects) &&
  v.missedSubjects.every(
    (m) => typeof m?.code === "string" && typeof m?.subject === "string" && (m.reason === undefined || typeof m.reason === "string")
  ) &&
  (v.brokenPreferences === undefined ||
    (Array.isArray(v.brokenPreferences) && v.brokenPreferences.every((b) => typeof b === "string"))) &&
  (v.selection === undefined || (isPicks(v.selection?.picks) && isLocks(v.selection?.locks ?? [])));

// Saves the variant the student chose to their history (newest first, last 10 kept).
const saveTimetable = async (req, res) => {
  try {
    const variant = req.body;
    if (!isVariant(variant))
      return res.status(400).json({ success: false, message: "Invalid timetable" });

    const user = req.user;
    const { score, credits, timetable, missedSubjects, brokenPreferences = [], selection } = variant;
    // selection = what the student picked (faculty, must-include, locks), so Edit can restore it.
    const savedSelection = selection && {
      picks: selection.picks.map(({ code, staff, mustInclude }) => ({ code, staff, mustInclude: mustInclude === true })),
      locks: (selection.locks ?? []).map(({ code, slot }) => ({ code, slot })),
    };
    user.tables.unshift({ score, credits, timetable, missedSubjects, brokenPreferences, selection: savedSelection });
    while (user.tables.length > MAX_SAVED) user.tables.pop(); // drop the oldest
    await user.save();

    res.json({ success: true, tables: user.tables });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: e.message });
  }
};


const getPreferences = (req, res) => {
  res.json({ success: true, preferences: normalizePreferences(req.user.preferences) });
};

// Saves the student's time preferences. Unknown fields are dropped and missing ones get defaults.
const updatePreferences = async (req, res) => {
  try {
    if (!req.body || typeof req.body.preferences !== "object")
      return res.status(400).json({ success: false, message: "Invalid preferences" });

    const user = req.user;
    user.preferences = normalizePreferences(req.body.preferences);
    user.markModified("preferences");
    await user.save();

    res.json({ success: true, preferences: user.preferences });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: e.message });
  }
};

const getTimetables = async (req, res) => {
  try {
    const userId = req.user.id; 
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, tables: user.tables });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
};

const getSubjects =  (req,res,next) => {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(),"src","services","simplified.json"),'utf-8'))
    const filtered = data.map(({subject,code,credits}) => ({
        subject,code,credits
    }))
    res.status(200).send(filtered);
}

const loggedIn = (req,res) => {
    res.status(200).json({
        success : true,
        loggedIn : true,
        user : req.user
    })
}


export { registerUser, loginUser, createTableForUser, getTimetables,getSubjects, logoutUser, loggedIn, editProfile, changePassword, saveTimetable, getPreferences, updatePreferences};