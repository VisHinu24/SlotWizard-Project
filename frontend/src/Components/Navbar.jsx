import React, { useContext } from 'react'
import { ThemeContext } from '../Elements/ThemeProvider';
import { Link, NavLink } from 'react-router'
import { MoonIcon, SunIcon } from 'lucide-react';

export const Logo = ({ className = "" }) => (
  <span className={`inline-flex items-center gap-1.5 font-bold tracking-tight whitespace-nowrap ${className}`}>
    <span className="bg-nb-yellow text-black border-3 border-ink px-2 rounded-md shadow-[3px_3px_0_var(--nb-ink)]">
      SLOT
    </span>
    <span>WIZARD</span>
  </span>
);

const navLink = ({ isActive }) =>
  `px-3 py-1.5 font-bold rounded-md border-2 ${
    isActive ? "bg-ink text-paper border-ink" : "border-transparent hover:border-ink"
  }`;

// login: hide the Login button (already signed in, or on the login page).
// profile: signed-in pages; shows app links and Logout.
const Navbar = ({ login = false, profile = false }) => {
  const { IsDark, setIsDark } = useContext(ThemeContext);

  return (
    <header className="sticky top-0 z-30 bg-paper border-b-3 border-ink">
      <div className="max-w-7xl mx-auto h-18 px-4 sm:px-6 flex items-center justify-between gap-3">
        <Link to={profile ? "/main" : "/"} aria-label="SlotWizard home">
          <Logo className="text-lg sm:text-2xl" />
        </Link>

        {profile && (
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/main" className={navLink}>Plan</NavLink>
            <NavLink to="/timetable" className={navLink}>Timetables</NavLink>
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="nb-btn px-2.5"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={IsDark ? "Switch to light mode" : "Switch to dark mode"}
            title={IsDark ? "Light mode" : "Dark mode"}
          >
            {IsDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>
          {!login && (
            <Link to="/login" className="nb-btn nb-pink">
              Log in
            </Link>
          )}
          {profile && (
            <Link to="/logout" className="nb-btn nb-pink">
              Log out
            </Link>
          )}
        </div>
      </div>

      {/* Phones: app links on their own row */}
      {profile && (
        <nav className="md:hidden flex gap-2 px-4 pb-3">
          <NavLink to="/main" className={navLink}>Plan</NavLink>
          <NavLink to="/timetable" className={navLink}>Timetables</NavLink>
        </nav>
      )}
    </header>
  );
}

export default Navbar
