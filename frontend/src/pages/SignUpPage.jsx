import React, { useState } from 'react'
import Navbar from '../Components/Navbar'
import toast from 'react-hot-toast'
import { Link } from 'react-router'
import { useNavigate } from 'react-router'

import api from '../Lib/axios'
import { clearPlannerStorage } from "../Lib/plannerStorage";

const SignUpPage = () => {

  const [username,setUsername] = useState("");
  const [email,setEmail] = useState("");
  const [RegNo,setRegNo] = useState("");
  const [dept,setDept] = useState("");
  const [password,setPassword] = useState("");
  const [confirm_password,setConfPassword] = useState("");
  const [Loading,setLoading] = useState(false);
  const navigate = useNavigate()

  function Validate(){
    if(username == "" || email == "" || dept == "" || password=="" || RegNo ==""||confirm_password ==""){
      toast.error("You Missed out a Field");
      return false;
    }

    if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      toast.error("Check Your Mail");
      return false;
    }
    if(!(/^\d{12}$/.test(RegNo)))
    {
      toast.error("Enter a Valid RegNo")
      return false;
    }

    if(password !== confirm_password)
    {
      toast.error("Check Password");
      return false;
    }
    return true;
  }

  async function handleClick(e)
  {
    e.preventDefault()
    if(!Validate()) return;

    setLoading(true);

    try {
      const res = await api.post("/register",{
      name : username,
      email : email,
      password : password,
      department: dept,
      registerNumber : RegNo
    })
    if(res.data.success)
    {
      clearPlannerStorage();
      toast.success("Welcome To Slot-Wizard");
      navigate('/main');
    }
    else{
      toast.error("User Registration Failed..");
      return;
    }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
    finally{
      setLoading(false);
    }

  }

  const handleUserName = (e) => setUsername(e.target.value);
  const handleEmail = (e) => setEmail(e.target.value);
  const handleRegNo = (e) => setRegNo(e.target.value);
  const handleDept = (e) => setDept(e.target.value)
  const handlePassword = (e) => setPassword(e.target.value);
  const handleConfPassword = (e) => setConfPassword(e.target.value);


  const field = (label, input) => (
    <label className='flex flex-col gap-1.5'>
      <span className='nb-label'>{label}</span>
      {input}
    </label>
  );

  return (
    <div className='min-h-screen'>
        <Navbar />
        <div className='px-4 py-12 sm:py-16 flex justify-center'>
            <div className='nb-card w-full max-w-2xl overflow-hidden'>
                <div className='nb-blue border-b-3 border-ink px-6 py-5'>
                    <h1 className='text-3xl font-bold'>Create your account</h1>
                    <p className='font-medium'>Takes a minute. Then build your first timetable.</p>
                </div>
                <form onSubmit={handleClick} className='grid sm:grid-cols-2 gap-4 p-6'>
                  {field('Name', <input type="text" onChange={handleUserName} value={username} name='name' className='nb-input' placeholder='Asha Kumar' autoComplete='name'/>)}
                  {field('Email', <input type="email" onChange={handleEmail} value={email} name='email' className='nb-input' placeholder='you@college.edu' autoComplete='email'/>)}
                  {field('Register number', <input type="text" inputMode='numeric' onChange={handleRegNo} value={RegNo} name='reg-num' className='nb-input' placeholder='12 digits'/>)}
                  {field('Department',
                      <select name="dept" onChange={handleDept} value={dept} className='nb-input cursor-pointer' id="dept">
                          <option value="" hidden>Select a department</option>
                          <option value="CSE">CSE</option>
                          <option value="IT">IT</option>
                          <option value="AIDS">AI-DS</option>
                          <option value="AIML">AI-ML</option>
                          <option value="CSE(CS)">CSE(CS)</option>
                          <option value="CSE(IOT)">CSE(IOT)</option>
                      </select>
                  )}
                  {field('Password', <input type="password" onChange={handlePassword} value={password} name="password" className='nb-input' placeholder='Create a password' autoComplete='new-password'/>)}
                  {field('Confirm password', <input type="password" onChange={handleConfPassword} value={confirm_password} name="confirm-password" className='nb-input' placeholder='Type it again' autoComplete='new-password'/>)}
                  <button className='nb-btn nb-pink text-lg py-3 sm:col-span-2 mt-2' disabled={Loading}>
                    {Loading ? "Creating..." : "Create account"}
                  </button>
                </form>
                <p className='text-center text-muted pb-6'>
                    Already have an account? <Link to="/login" className='font-bold text-ink underline decoration-3 decoration-nb-blue underline-offset-4'>Log in</Link>
                </p>
            </div>
        </div>
    </div>
  )
}

export default SignUpPage
