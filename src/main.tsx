import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { MessagingProvider } from './context/MessagingContext'
import { ThemeSync } from './components/theme/ThemeSync'
import { ToastProvider } from './components'
import './index.css'
import App from './App.tsx'
import { installTelemetry } from './lib/telemetry'
import { initializeNavigation } from './utils/navigation'

installTelemetry()
initializeNavigation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeSync />
      <ToastProvider>
        <MessagingProvider>
          <App />
        </MessagingProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
