import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/calendar.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import { GoogleMapsProvider } from './contexts/GoogleMapsContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GoogleMapsProvider>
      <App />
      <ToastContainer position="top-right" />
    </GoogleMapsProvider>
  </React.StrictMode>,
)
