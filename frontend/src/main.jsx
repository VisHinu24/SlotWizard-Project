import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {Toaster} from 'react-hot-toast'

// StrictMode is off (as on main), so effects like the login check run once.
createRoot(document.getElementById('root')).render(
  <div>
    <App />
    <Toaster
      toastOptions={{
        style: {
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          background: "var(--nb-card)",
          color: "var(--nb-ink)",
          border: "3px solid var(--nb-ink)",
          borderRadius: "10px",
          boxShadow: "4px 4px 0 var(--nb-ink)",
        },
      }}
    />
  </div>
)
