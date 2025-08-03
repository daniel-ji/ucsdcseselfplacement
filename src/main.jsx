import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { CodeLanguageProvider } from './contexts/CodeLanguageContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CodeLanguageProvider>
      <App />
    </CodeLanguageProvider>
  </StrictMode>,
)
