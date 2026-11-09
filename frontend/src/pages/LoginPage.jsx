import React from 'react'
import Navbar from '../Components/Navbar'
import Login from '../Components/Login';

const LoginPage = () => {
  return (
    <div className='min-h-screen'>
      <Navbar login={true} />
      <Login />
    </div>
  );
}

export default LoginPage
