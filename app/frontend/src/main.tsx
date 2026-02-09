import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth-context'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './lib/sentry'

// Sentry 초기화 (렌더링 전에)
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
