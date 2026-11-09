import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import Navbar from "../Components/Navbar";
import Sidebar from "../Components/Sidebar";
import EnrollmentPanel from "../Components/EnrollmentPanel";
import PreferencesPanel from "../Components/PreferencesPanel";
import { DEFAULT_PREFERENCES } from "../Lib/preferences";
import subjectsData from "./simplified.json";
import api, { errorMessage } from "../Lib/axios";
import toast from "react-hot-toast";

// College rule: at most 30 credits per semester. Students may select more
// than this; the scheduler fits the best timetable within the cap.
const MAX_CREDITS = 30;
// Most subjects a student can select (the server rejects more).
const MAX_SUBJECTS = 13;

const MainPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSubjects, setSelectedSubjects] = useState(() => {
    const saved =
      JSON.parse(localStorage.getItem("selectedSubjectsEdit")) || [];

    return saved
      .map((s) => {
        const subj = subjectsData.find((sub) => sub.code === s.code);
        if (!subj) return null;

        // Get all unique staff
        const staffList = subj.schedules.map((sch) => sch.staff);
        const uniqueStaff = [...new Set(staffList)];

        // Use saved preferredStaff if exists, otherwise initialize all to true
        const preferredStaff = s.preferredStaff
          ? {
              ...Object.fromEntries(uniqueStaff.map((staff) => [staff, true])),
              ...s.preferredStaff,
            }
          : Object.fromEntries(uniqueStaff.map((staff) => [staff, true]));

        return { ...subj, preferredStaff, mustInclude: s.mustInclude === true };
      })
      .filter(Boolean)
      .slice(0, MAX_SUBJECTS);
  });

  // Slot locks ([{ code, slot }]) set on the timetable page, kept when editing.
  const [locks, setLocks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("selectedLocksEdit")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("selectedLocksEdit", JSON.stringify(locks));
  }, [locks]);

  const handleToggleMustInclude = (code) =>
    setSelectedSubjects((prev) => prev.map((s) => (s.code === code ? { ...s, mustInclude: !s.mustInclude } : s)));

  // Lock faculty: keep only this staff member selected for the subject.
  const handleOnlyStaff = (code, staff) =>
    setSelectedSubjects((prev) =>
      prev.map((s) =>
        s.code === code
          ? { ...s, preferredStaff: Object.fromEntries(Object.keys(s.preferredStaff).map((n) => [n, n === staff])) }
          : s
      )
    );

  const handleUnlock = (code) => setLocks((prev) => prev.filter((l) => l.code !== code));

  const totalCredits = selectedSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);

  const [user, setUser] = useState({});
  const [generating, setGenerating] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const savePrefsTimer = useRef(null);

  // Load saved time preferences once.
  useEffect(() => {
    api
      .get("/preferences")
      .then((res) => res.data.success && setPreferences(res.data.preferences))
      .catch((error) => console.error("Could not load preferences:", error));
  }, []);

  // Save preference changes after a short pause, so quick clicks send one request.
  const handlePreferencesChange = (next) => {
    setPreferences(next);
    clearTimeout(savePrefsTimer.current);
    savePrefsTimer.current = setTimeout(() => {
      api.put("/preferences", { preferences: next }).catch(() => toast.error("Could not save your preferences"));
    }, 500);
  };
  const navigate = useNavigate();

  const filteredSubjects = subjectsData.filter((subj) => {
    if (!searchTerm) return true;
    if (searchTerm.length > 0 && "0123456789".includes(searchTerm[0])) {
      return subj.code.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      return subj.subject.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  useEffect(() => {
    localStorage.setItem("selectedSubjects", JSON.stringify(selectedSubjects));
  }, [selectedSubjects]);

  React.useEffect(() => {
    async function LoggedIn() {
      try {
        const res = await api.get("/loggedin");
        if (!res.data.loggedIn) {
          toast.error("Authentication error");
          navigate("/login");
        }
        if (res.data.success) setUser(res.data.user);
      } catch (error) {
        console.log(error);
        // Only a rejected session means "log in again"; a down server gets its own message.
        if (error.response) {
          toast.error("Please log in again");
          navigate("/login");
        } else {
          toast.error(errorMessage(error));
        }
      }
    }
    LoggedIn();
  }, []);

  const handleAddSubject = (subject) => {
    console.log(subject);
    if (selectedSubjects.length >= MAX_SUBJECTS) {
      toast.error(`You can select at most ${MAX_SUBJECTS} subjects. Remove one to add another.`);
      return;
    }

    if (selectedSubjects.find((s) => s.code === subject.code)) return;

    const staffList = subject.schedules.map((sch) => sch.staff);
    const uniqueStaff = [...new Set(staffList)];

    const preferredStaff = uniqueStaff.reduce((acc, staff) => {
      acc[staff] = true;
      return acc;
    }, {});

    setSelectedSubjects([
      ...selectedSubjects,
      { ...subject, preferredStaff },
    ]);
  };

  const handleDeleteSubject = (code) => {
    handleUnlock(code);
    setSelectedSubjects((prev) => {
      const updated = prev.filter((subj) => subj.code !== code);
      localStorage.setItem("selectedSubjectsEdit", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateStaff = (code, staffOrBulk, isBulk = false) => {
    setSelectedSubjects((prevSubjects) =>
      prevSubjects.map((subj) => {
        if (subj.code === code) {
          if (isBulk) {
            return {
              ...subj,
              preferredStaff: staffOrBulk,
            };
          } else {
            return {
              ...subj,
              preferredStaff: {
                ...subj.preferredStaff,
                [staffOrBulk]: !subj.preferredStaff[staffOrBulk],
              },
            };
          }
        }
        return subj;
      })
    );
  };

  const handleGenerateTimetable = async () => {
    console.log(selectedSubjects);
    const timetable = {
      timetable: selectedSubjects.map((subj) => ({
        code: subj.code,
        staff: Object.keys(subj.preferredStaff).filter(
          (staff) => subj.preferredStaff[staff]
        ),
        ...(subj.mustInclude ? { mustInclude: true } : {}),
      })),
      preferences,
      locks: locks.filter((l) => selectedSubjects.some((s) => s.code === l.code)),
    };

    setGenerating(true);
    try {
      const response = await api.post("/timetables", timetable);
      if (!response.data.success) {
        toast.error(response.data.message || "Something went wrong");
        return;
      }
      // The timetable page shows these as Option 1..5; nothing is saved until the student picks one.
      sessionStorage.setItem(
        "generatedVariants",
        JSON.stringify({
          variants: response.data.variants,
          partial: response.data.partial,
          warnings: response.data.warnings || [],
          request: timetable, // reused by "Regenerate around locks" and saved with the timetable
        })
      );
      navigate("/timetable");
    } catch (error) {
      console.error("Error generating timetable:", error);
      if (error.response?.status === 401) {
        toast.error("Please log in again");
        navigate("/login");
      } else {
        toast.error(errorMessage(error, "Could not generate a timetable"));
      }
    } finally {
      setGenerating(false);
    }
  };

  const firstName = user.name?.split(" ")[0];

  return (
    <div className="min-h-screen">
      <Navbar login={true} profile={true} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <p className="nb-label">{firstName ? `Hey ${firstName}` : "Semester planner"}</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mt-1">
            Plan your{" "}
            <span className="bg-nb-blue text-black px-2 border-3 border-ink rounded-lg inline-block -rotate-1">semester</span>
          </h1>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6 items-start">
          <Sidebar
            subjects={filteredSubjects}
            onAddSubject={handleAddSubject}
            selectedCodes={new Set(selectedSubjects.map((s) => s.code))}
            locked={selectedSubjects.length >= MAX_SUBJECTS}
            maxSubjects={MAX_SUBJECTS}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
          <EnrollmentPanel
            selectedSubjects={selectedSubjects}
            onUpdateStaff={handleUpdateStaff}
            onGenerate={handleGenerateTimetable}
            generating={generating}
            locks={locks}
            onToggleMustInclude={handleToggleMustInclude}
            onOnlyStaff={handleOnlyStaff}
            onUnlock={handleUnlock}
            beforeGenerate={
              <PreferencesPanel preferences={preferences} onChange={handlePreferencesChange} />
            }
            onDeleteSubject={handleDeleteSubject}
            totalCredits={totalCredits}
            maxCredits={MAX_CREDITS}
            maxSubjects={MAX_SUBJECTS}
          />
        </div>
      </main>
    </div>
  );
};

export default MainPage;
