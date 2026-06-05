import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface-800)',
              color: 'var(--color-gray-300)',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.06))',
            },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
