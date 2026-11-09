import React,{useContext} from 'react'
import { ThemeContext } from '../Elements/ThemeProvider';
import { Link } from 'react-router'
import { MoonIcon, SunIcon } from 'lucide-react';

const Navbar = ({login = false,profile=false}) => {

  const {IsDark, setIsDark} = useContext(ThemeContext);

  const handleTheme = () => {
    setIsDark((prev) => !prev);
  }

  return (
    <div className="flex justify-center items-center">
      <div className="h-20 w-full flex place-content-between bg-white/10 backdrop-blur-sm border border-white/10 items-center shadow-2xl/20 ">
        <Link to={"/"}>
          <div className="text-2xl sm:text-4xl sm:ml-4 inline-block p-3 sm:p-6 font-bold dark:text-white whitespace-nowrap">
            <span className="bg-dark text-primary dark:text-dark dark:bg-white p-1 rounded-xl">
              Slot
            </span>
            -Wizard
          </div>
        </Link>
        <div className='flex justify-center items-center my-8 mx-3 sm:mx-12 gap-3'>
          <div className='bg-dark text-white dark:bg-white p-2 rounded-2xl dark:text-dark' onClick={handleTheme}>
              {(IsDark) ? <MoonIcon /> : <SunIcon /> }
          </div>
          {!login && (<div>
          <Link to={"/login"}>
            <button className="btn cursor-cell dark:bg-white dark:text-dark px-5 py-2 font-bold">
              Login
            </button>
          </Link>
          </div>
        )}
        {profile && (
          <div>
              {/* <Link to={"/profile"}>
                <button className="btn dark:bg-white dark:text-dark my-8  px-4 font-bold">
                  Profile
                </button>
              </Link> */}
              <Link to={"/logout"}>
                <button className="btn dark:bg-white dark:text-dark my-8 mx-5 px-4 font-bold">
                  Logout
                </button>
              </Link>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default Navbar