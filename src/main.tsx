import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { MessagingProvider } from './context/MessagingContext'
import './index.css'
import App from './App.tsx'
import { installTelemetry } from './lib/telemetry'

installTelemetry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MessagingProvider>
        <App />
      </MessagingProvider>
    </AuthProvider>
  </StrictMode>,
)
