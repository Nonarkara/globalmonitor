import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/rams-theme.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles/operational-shell.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { trackVisitor } from './services/visitorTracker.js'
import { registerAppUpdates } from './services/appUpdates.js'

trackVisitor()

// Register service worker for offline/PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerAppUpdates();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
