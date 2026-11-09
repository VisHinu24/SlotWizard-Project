# SlotWizard – Streamlined Course Scheduling for Students

SlotWizard is a smart web-based system that automates course enrollment and generates conflict-free timetables for students using an intelligent backtracking algorithm integrated with the MERN stack. It minimizes manual effort, reduces scheduling conflicts, and provides students with personalized, optimized schedules in real time.​

# About

SlotWizard addresses the limitations of traditional ERP and manual scheduling systems, which often fail to handle complex course combinations, faculty preferences, and slot constraints. By combining a customized backtracking-based scheduling engine with a modern MERN-based web interface, it delivers a scalable, cost-effective, and user-centric solution for academic timetable generation and management.​

The system operates in two key phases: smart enrollment (subject and faculty preference selection) and timetable optimization (automatic generation of a clash-free schedule). Students can view, edit, and regenerate their timetable in real time, while the system continually checks for slot clashes, faculty double-booking, and elective group conflicts.​

# Features

1. Automated generation of conflict-free timetables using a customized backtracking algorithm.​

2. Smart subject enrollment with support for core, elective, and faculty preference selection.​

3. Real-time slot clash detection for overlapping slots, lab blocks, duplicate electives, and faculty double-booking.​

4. Personalized timetable management with options to view, edit, and regenerate schedules.​

5. MERN stack architecture (MongoDB, Express.js, React.js, Node.js) for full-stack, scalable web deployment.​

5. Secure authentication using JWT-based login and protected routes for student access.​

6. Interactive UI for enrollment and timetable display using React components and SPA design.​

7. Backend scheduling engine with pruning, slot-order prioritization, and best-timetable selection based on maximum credits/subjects.​

# What's new in Scheduler v2

Full plan and design: [docs/PRD-scheduler-v2.md](docs/PRD-scheduler-v2.md) · build steps: [docs/PHASES.md](docs/PHASES.md)

- **Top 5 options:** one Generate gives up to 5 ranked, distinct clash-free timetables. Compare any option with Option 1, then save the one you want.
- **30-credit rule:** select up to 13 subjects (even over 30 credits); every timetable stays within the college limit of 30.
- **Time preferences:** no 8:00 classes, no 3:00–5:00 classes, free days, fewer gaps, max classes per day. Each is *Hard* (never broken) or *Soft* (Low / Medium / High weight). Credits always come first.
- **Locks:** lock a class to its slot and "Regenerate around locks", lock a faculty ("Only this"), or mark a subject *Must include*.
- **Clear reasons:** every missed subject says why (clash, preference, credit limit, class times off the grid), and each option lists the soft preferences it breaks.
- **Edit restores everything:** saved timetables remember faculty choices, must-include subjects and locks.
- **Correct long sections:** 6- and 8-hour sections, and classes at off-block times (e.g. 9:00–11:00), now take every block they meet in, so no hidden clashes.
- Works on phones.

![Timetable options with compare and locks](docs/images/timetable-options-locks.jpg)

![Enrollment with must-include, a lock and time preferences](docs/images/enrollment-preferences.jpg)

# Running locally

```bash
# backend (needs backend/.env with MONGODB_URI and JWT_SECRET)
cd backend && npm install && npm run dev

# frontend (port 5174, which the backend allows for CORS)
cd frontend && npm install && npm run dev -- --port 5174
```

Scheduler tests (Node's built-in test runner, no database needed):

```bash
cd backend && npm test
```

# Requirements

<b>Operating System:</b> Windows 10 / 11, Linux, or macOS (for MERN development and deployment).​

<b>Frontend:</b> React.js (SPA), HTML5, CSS3, JavaScript.​

<b>Backend:</b> Node.js with Express.js for REST APIs and scheduling services.​

<b>Database:</b> MongoDB for storing users, subjects, slots, faculty, and timetable metadata.​

<b>Authentication & Security: </b> JSON Web Tokens (JWT), secure password storage, and access control for protected routes.​

<b>Tools / IDE:</b> Visual Studio Code or equivalent, Git for version control, npm/yarn for dependency management.​

<b>Core Libraries / Dependencies (indicative):</b> 
1. React, React Router, axios, react-hot-toast (frontend).​

2. Express, Mongoose, JSON Web Token, dotenv, cors (backend).​

# System Architecture

The system follows a layered client–server architecture built on the MERN stack. The React frontend handles user interaction (login, subject selection, timetable view), the Express/Node backend hosts REST APIs and the scheduling engine, and MongoDB stores all domain data such as subjects, faculty, slots, and user profiles.​

<b>High-level flow:</b>

Student authenticates and selects subjects with preferred faculty from the Enrollment Panel.​

Selections are sent to the backend, where the backtracking-based timetable generator checks constraints and fills a weekly timetable structure.​

The backend returns the best conflict-free timetable and any missed subjects, which the frontend renders as an interactive weekly grid.​

![Architecture](<./Output_Images/Architecture.jpg>)

Output1 – Landing Page

The landing page introduces SlotWizard, highlighting its purpose of generating smarter, clash-free timetables and guiding users to register or log in with a clean, animated interface.​
![landing](<./Output_Images/Landing.png>)
![signup](<./Output_Images/SignUp.png>)

The login page allows registered students to authenticate securely before accessing the dashboard, with validations and error feedback for invalid credentials.​
![login](<./Output_Images/Login.png>)

The Enrollment Panel lets students browse/search all available subjects, add them to a selection list, and choose preferred faculty per subject with corresponding slot details.
![Enrollment](<./Output_Images/Main.png>)​

The Timetable Display Page shows the generated clash-free weekly schedule in a tabular grid with days vs time slots, including subject code, name, faculty, and slot.​
It also lists missed subjects that could not be scheduled and allows navigation between timetable variants (Previous/Next) and options like Edit or New.​The engine is optimized with pruning and slot-order heuristics to provide near-instant timetable generation for typical semester loads.​
![timetable](<./Output_Images/Timetable.png>)

# Results and Impact

SlotWizard significantly reduces the manual complexity of timetable creation, eliminating common issues like overlapping subjects, duplicate electives, and faculty double-booking. It improves academic planning efficiency by allowing students to experiment with course combinations and instantly visualize the impact on their weekly schedule.​

For institutions, the system demonstrates how intelligent algorithms (backtracking, constraint handling, simple heuristics) combined with modern web technologies can form a robust, scalable academic scheduling platform. This mini-project can be extended into a production-grade solution integrated with institutional ERPs or used as a base for more advanced research in timetable optimization and adaptive scheduling.​

# Articles published / References

Sadeh, N., Sycara, K., Xiong, Y. “Backtracking Techniques for Hard Scheduling Problems,” Carnegie Mellon University, 1992.​

Alagu Lakshmi, S., Sujitha, S., Durga, N. “Time Table Automation System Using Backtracking Technique,” International Journal of Advanced Research in Biology Engineering Science and Technology, 2016.​

Deris, S., Omatu, S., Ohta, H. “Timetable Planning Using Constraint-Based Reasoning,” Computers & Operations Research, 1999/2000.​

Alghamdi, H., Alsubait, T., Alhakami, H., Baz, A. “A Review of Optimization Algorithms for University Timetable Scheduling,” Engineering, Technology & Applied Science Research, 2020.​