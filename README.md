# SlotWizard – Streamlined Course Scheduling for Students

SlotWizard is a web app that automates course enrollment and builds clash-free timetables for students. A backtracking scheduling engine runs on a MERN stack (MongoDB, Express, React, Node). Students pick subjects and faculty, set how they like their week, and get up to five ranked timetables to compare and save.

# About

Traditional ERP and manual scheduling often fail with complex course combinations, faculty preferences and slot constraints. SlotWizard combines a custom backtracking engine with a modern web interface to give students a fast, personal way to plan their semester.

It works in two phases:

1. **Smart enrollment:** choose subjects, preferred faculty and time preferences.
2. **Timetable optimisation:** the engine builds clash-free timetables that keep credits as high as possible, within the college limit of 30.

Students can view, compare, lock, edit and regenerate timetables at any time. The engine checks for slot clashes, lab blocks, duplicate electives and faculty double-booking.

# Features

1. **Top 5 options:** one click gives up to five ranked, distinct clash-free timetables. Compare any option with Option 1 (changed classes are highlighted), then save the one you want.
2. **30-credit rule:** select up to 13 subjects, even over 30 credits. Every timetable stays within the 30-credit limit, and the engine drops whichever subjects keep credits highest.
3. **Time preferences:** no 8:00 classes, no 3:00–5:00 classes, free days, fewer gaps, and a maximum number of classes per day. Each one is *Hard* (never broken) or *Soft* with a Low / Medium / High weight. Credits always come first.
4. **Locks:** lock a class to its slot and regenerate around it, keep only one faculty for a subject ("Only this"), or mark a subject *Must include* so every option has it.
5. **Clear reasons:** every missed subject says why (clash, preference, credit limit, class times off the grid), and each option lists the soft preferences it breaks.
6. **Edit restores everything:** saved timetables remember faculty choices, must-include subjects and locks.
7. **Accurate long sections:** 6- and 8-hour sections, and classes at off-block times (for example 9:00–11:00), take every block they touch, so there are no hidden clashes.
8. **Secure accounts:** JWT-based login with protected routes.
9. **Neo-brutalist design:** bold borders, flat bright colours and a colour per subject that stays the same everywhere. Light and dark modes, and it works on phones.

# Tech stack

**Frontend:** React 19, Vite, React Router, Tailwind CSS v4, axios, react-hot-toast, lucide-react.

**Backend:** Node.js, Express, Mongoose, JSON Web Token, dotenv, cors.

**Database:** MongoDB (Atlas, or a local MongoDB / Docker container).

**Requirements:** Windows 10 / 11, Linux or macOS · Node.js 18+ · npm · Git.

# Running locally

### 1. Database

Use MongoDB Atlas, or run MongoDB locally with Docker:

```bash
docker run -d --name slotwizard-mongo -p 27017:27017 mongo:7
```

### 2. Backend

Create `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/slotwizard
JWT_SECRET=change-me
```

Then start it (runs on port 5000):

```bash
cd backend && npm install && npm run dev
```

### 3. Frontend

Run it on port 5174, the port the backend allows for CORS:

```bash
cd frontend && npm install && npm run dev -- --port 5174
```

Open http://localhost:5174.

### Tests

Scheduler tests use Node's built-in test runner and need no database:

```bash
cd backend && npm test
```

# System architecture

SlotWizard uses a layered client–server design:

- **React frontend:** sign-up and login, subject and faculty selection, time preferences, and the timetable view with options, compare and locks.
- **Express / Node backend:** REST APIs, authentication and the scheduling engine.
- **MongoDB:** users, saved timetables, selections and preferences.

**How it flows:**

1. The student logs in and picks subjects, faculty and time preferences on the planning page.
2. The selection goes to the backend. The backtracking engine prunes clashing combinations, follows hard preferences, scores soft ones and keeps credits as high as possible.
3. The backend returns up to five ranked timetables with missed subjects and their reasons. The frontend shows them as a colour-coded weekly grid.
4. The student compares options, locks classes, regenerates if needed and saves the timetable they want.

![Architecture](<./Output_Images/Architecture.jpg>)

Full design notes: [docs/PRD-scheduler-v2.md](docs/PRD-scheduler-v2.md) · build steps: [docs/PHASES.md](docs/PHASES.md)

# Screenshots

**Landing page:** introduces SlotWizard and leads students to sign up or log in.
![landing](<./Output_Images/Landing.png>)

**Sign up and login:** create an account or log in, with validation and clear error messages.
![signup](<./Output_Images/SignUp.png>)
![login](<./Output_Images/Login.png>)

**Planning page:** search the subject catalog, add subjects, choose faculty, mark must-include subjects and set time preferences.
![Enrollment](<./Output_Images/Main.png>)

**Timetable page:** compare up to five options in a colour-coded weekly grid, lock classes, regenerate around locks, see missed subjects with reasons, and save the one you want.
![timetable](<./Output_Images/Timetable.png>)

# Results and impact

SlotWizard removes the manual work of building a timetable and avoids overlapping classes, duplicate electives and faculty double-booking. Students can try different course combinations and immediately see how each one changes their week, while preferences and locks keep the result close to what they actually want.

For institutions, it shows how backtracking, constraint handling and simple heuristics, combined with modern web technology, can form a solid academic scheduling platform. The project can be extended into a production system connected to an institution's ERP, or used as a base for research into timetable optimisation and adaptive scheduling.

# References

Sadeh, N., Sycara, K., Xiong, Y. "Backtracking Techniques for Hard Scheduling Problems," Carnegie Mellon University, 1992.

Alagu Lakshmi, S., Sujitha, S., Durga, N. "Time Table Automation System Using Backtracking Technique," International Journal of Advanced Research in Biology Engineering Science and Technology, 2016.

Deris, S., Omatu, S., Ohta, H. "Timetable Planning Using Constraint-Based Reasoning," Computers & Operations Research, 1999/2000.

Alghamdi, H., Alsubait, T., Alhakami, H., Baz, A. "A Review of Optimization Algorithms for University Timetable Scheduling," Engineering, Technology & Applied Science Research, 2020.
