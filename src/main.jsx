// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// Prevent mouse wheel and Arrow Up/Down keys from increasing/decreasing amounts on number inputs
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            fontSize: '13.5px',
            fontFamily: 'Inter, sans-serif',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
