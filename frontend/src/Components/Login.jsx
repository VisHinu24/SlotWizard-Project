import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import api from '../Lib/axios'
import toast from 'react-hot-toast'
import { clearPlannerStorage } from "../Lib/plannerStorage";

const Login = () => {
    const navigate = useNavigate()
    const [Loading,setLoading] = useState(false);
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");

    const handleEmail = (e) => setEmail(e.target.value);
    const handlePassword = (e) => setPassword(e.target.value);

    function Validate(){
        if(email === "" || password === ""){
            toast.error("Check credentials");
            return false
        }
        return true
    }

    async function handleSubmit(e){
        e.preventDefault();
        if(!Validate()) return ;
        setLoading(true);
        try{
            const res = await api.post('/login',{
                email : email,
                password : password
            })
            if(res.data.success){
                clearPlannerStorage();
                toast.success("Logging in Successfully");
                navigate('/main');
            }
            else{
                toast.error("Loggin failed");
                return;
            }
        }
        catch(e)
        {
            console.log(e.message);
            toast.error("Something went Wrong..");
        }
        finally{
            setLoading(false);
        }
    }

  return (
    <div className='px-4 py-12 sm:py-20 flex justify-center'>
        <div className='nb-card w-full max-w-md overflow-hidden'>
            <div className='nb-yellow border-b-3 border-ink px-6 py-5'>
                <h1 className='text-3xl font-bold'>Welcome back</h1>
                <p className='font-medium'>Log in to plan your semester.</p>
            </div>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4 p-6'>
                <label className='flex flex-col gap-1.5'>
                    <span className='nb-label'>Email</span>
                    <input type="email" onChange={handleEmail} value={email} className='nb-input' placeholder='you@college.edu' autoComplete='email'/>
                </label>
                <label className='flex flex-col gap-1.5'>
                    <span className='nb-label'>Password</span>
                    <input type="password" onChange={handlePassword} value={password} className='nb-input' placeholder='Your password' autoComplete='current-password'/>
                </label>
                <button className='nb-btn nb-pink text-lg py-3 mt-2' disabled={Loading}>
                {Loading ? "Logging in..." : "Log in"}
                </button>
            </form>
            <p className='text-center text-muted pb-6'>
                New here? <Link to={"/signup"} className='font-bold text-ink underline decoration-3 decoration-nb-pink underline-offset-4'>Create an account</Link>
            </p>
        </div>
    </div>
  )
}

export default Login
