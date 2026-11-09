import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import { Loader2Icon } from 'lucide-react'
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


  return (
    <div className='h-screen dark:bg-dark'>
        <Navbar />
        <div className='m-20 flex justify-center dark:text-white items-center'>
            <div className='w-2xl bg-dark/5 dark:bg-white/5 backdrop-blur-sm border border-dark/20 dark:border-white/20 rounded-4xl'>
                <h1 className='text-4xl font-bold text-center p-5'>Sign-Up</h1>
                <form onSubmit={handleClick} className='flex flex-col gap-5 m-1 p-4 justify-center items-center'>
                  <input type="text" onChange={handleUserName} value={username} name='name' className='in' placeholder='Username'/>
                  <input type="email" onChange={handleEmail} value={email} name='email' className='in' placeholder='Email'/>
                  <input type="text" onChange={handleRegNo} value={RegNo} name='reg-num' className='in' placeholder='Register Number'/>
                  <div className='flex gap-3 justify-center items-center'>
                      <select name="dept" onChange={handleDept} value={dept} className='bg-dark/20 dark:bg-white/40 border border-white/10 rounded-xl px-6 p-3 text-dark/60 dark:text-white/60' id="dept">
                          <option value="Department" hidden>Select a Department</option>
                          <option value="CSE">CSE</option>
                          <option value="IT">IT</option>
                          <option value="AIDS">AI-DS</option>
                          <option value="AIML">AI-ML</option>
                          <option value="CSE(CS)">CSE(CS)</option>
                          <option value="CSE(IOT)">CSE(IOT)</option>
                      </select>
                  </div>
                  <div className='w-4/5 flex gap-4'>
                      <input type="password" onChange={handlePassword} value={password} name="password" className='in w-full' placeholder='Create Password' />
                      <input type="password" onChange={handleConfPassword} value={confirm_password} name="password" className='in w-full' placeholder='Confirm Password' />
                  </div>
                  <button className='btn m-2 text-xl rounded-2xl dark:bg-white dark:text-dark px-4 font-bold' disabled={Loading}>
                    {Loading ? "Creating..." : "Create Account"}
                  </button>
                </form>
            </div>
        </div>
    </div>
  )
}

export default SignUpPage