import React, { useContext } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router';

import ThemeProvider,{ThemeContext} from './Elements/ThemeProvider';
import LandingPage from './pages/LandingPage'
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import Particles from './Elements/Particles';
import ErrorEl from './pages/ErrorEl'
import ProfilePage from './pages/ProfilePage';
import LogoutPage from './pages/LogoutPage';
import Timetable from './pages/TimeTable'

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <ErrorEl />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignUpPage />,
  },
  {
    path: "/main",
    element: <MainPage />,
  },
  {
    path: "/profile",
    element: <ProfilePage />,
  },
  {
    path : "/Logout",
    element : <LogoutPage />
  },
  {
    path: "/timetable",
    element : <Timetable/>
  }
])

const App = () => {
  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  );
};

const Main = () => {
  const { IsDark } = useContext(ThemeContext);

  const color = IsDark ? "#fff" : "#000";

  return (
      <div className={IsDark ? 'dark' : ''}>
      {/* Particle background only on larger screens; the app itself shows everywhere. */}
      <div className="hidden sm:block pointer-events-none fixed top-0 left-0 w-full h-full z-0">
        <Particles  
          key={IsDark ? "dark" : "light"}
          particleColors={[color, color]}
          particleCount={400}
          particleSpread={20}
          speed={0.075}
          particleBaseSize={200}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>
      <RouterProvider router={router}></RouterProvider>
    </div>
  );
};

export default App;
