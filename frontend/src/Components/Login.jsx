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
    <div className='h-5/6 dark:text-white flex justify-center items-center'>
        <div className='w-md  bg-dark/5 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border dark:border-white/20 border-dark/20'>
            <h1 className='text-4xl font-bold text-center p-6 '>Login</h1>
            <form onSubmit={handleSubmit} className='flex flex-col gap-5 m-1 justify-center items-center'>
                <input type="text" onChange={handleEmail} value={email} className='in' placeholder='Email'/>
                <input type="password" onChange={handlePassword} value={password} className='in' placeholder='Password'/>
                <button className='btn m-2 text-xl rounded-2xl dark:bg-white dark:text-dark px-4 font-bold' disabled={Loading}>
                {Loading ? "Logging in..." : "Login"}
                </button>
            </form>
            <div className='text-md text-dark-secondary/70 dark:text-secondary/40 text-center py-5'>
                <h3>Don't have an Account? <span className='text-dark dark:text-primary'><Link to={"/signup"}>Sign-Up</Link></span></h3>
            </div>
        </div>
    </div>
  )
}

export default Login