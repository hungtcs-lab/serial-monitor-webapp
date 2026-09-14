import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/i18n'
import { App } from '@/app'
import { Provider } from '@/components/ui/provider'
import { Toaster } from '@/components/ui/toaster'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <App />
      <Toaster />
    </Provider>
  </StrictMode>,
)
