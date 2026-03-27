import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SolariBoard from './SolariBoard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SolariBoard />
  </StrictMode>,
)
