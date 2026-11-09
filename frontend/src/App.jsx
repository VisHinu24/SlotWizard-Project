import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router';

import ThemeProvider from './Elements/ThemeProvider';
import LandingPage from './pages/LandingPage'
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
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

// The light/dark class lives on <html> (see ThemeProvider), so the page
// background and toasts follow the theme too.
const App = () => {
  return (
    <ThemeProvider>
      <RouterProvider router={router}></RouterProvider>
    </ThemeProvider>
  );
};

export default App;
