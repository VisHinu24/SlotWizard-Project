import { Link } from "react-router";
import { Layers, SlidersHorizontal, Lock } from "lucide-react";
import Navbar from "../Components/Navbar";

// A small made-up week for the hero illustration.
const DEMO = [
  ["Mon", "sub-0", "CS301", "sub-1", "MA202", null, null],
  ["Tue", null, null, "sub-3", "EC210", "sub-2", "PH101"],
  ["Wed", "sub-1", "MA202", null, null, "sub-4", "HS105"],
  ["Thu", "sub-0", "CS301", "sub-3", "EC210", null, null],
];

const FEATURES = [
  {
    icon: Layers,
    colour: "nb-blue",
    title: "Top 5 options",
    text: "One click gives up to five clash-free timetables, ranked. Compare them and keep the one you like.",
  },
  {
    icon: SlidersHorizontal,
    colour: "nb-yellow",
    title: "Your time, your rules",
    text: "No 8 AM classes, free Fridays, fewer gaps. Make each one a must or just a wish.",
  },
  {
    icon: Lock,
    colour: "nb-green",
    title: "Lock what you love",
    text: "Pin a class to its slot, or a favourite faculty, and regenerate everything else around it.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen overflow-x-clip">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <section className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="nb-chip nb-green mb-6">Clash-free, every time</span>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight">
              Build{" "}
              <span className="inline-block bg-nb-yellow text-black px-3 border-3 border-ink rounded-lg -rotate-2 shadow-[4px_4px_0_var(--nb-ink)]">
                smarter
              </span>{" "}
              timetables, not harder.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted max-w-xl">
              Pick your subjects and faculty, tell us how you like your week, and SlotWizard builds the
              timetable for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup" className="nb-btn nb-pink text-lg px-6 py-3">
                Get started
              </Link>
              <Link to="/login" className="nb-btn text-lg px-6 py-3">
                I have an account
              </Link>
            </div>
          </div>

          {/* Illustration: a mini timetable */}
          <div className="relative" aria-hidden="true">
            <div className="nb-card p-5 sm:p-6 rotate-1">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-lg">Option 1</span>
                <span className="nb-chip nb-yellow">28 credits</span>
              </div>
              <div className="grid grid-cols-[3rem_repeat(3,1fr)] gap-2 text-sm">
                {DEMO.map(([day, ...cells]) => (
                  <div key={day} className="contents">
                    <span className="font-bold self-center">{day}</span>
                    {[0, 2, 4].map((i) =>
                      cells[i] ? (
                        <span key={i} className={`${cells[i]} font-bold border-2 border-black rounded-md px-2 py-3`}>
                          {cells[i + 1]}
                        </span>
                      ) : (
                        <span key={i} className="border-2 border-dashed border-muted/50 rounded-md" />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
            <span className="absolute -top-5 -right-2 sm:-right-5 nb-chip nb-pink text-sm px-3 py-1.5 rotate-6 shadow-[3px_3px_0_var(--nb-ink)]">
              0 clashes ✓
            </span>
          </div>
        </section>

        <section className="mt-20 sm:mt-28 grid sm:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const { colour, title, text } = feature;
            const Icon = feature.icon;
            return (
            <div key={title} className="nb-card p-6">
              <span className={`${colour} inline-flex p-2.5 border-3 border-ink rounded-lg mb-4`}>
                <Icon size={22} />
              </span>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-2 text-muted">{text}</p>
            </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
