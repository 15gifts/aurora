import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WheelOfNames from './WheelOfNames'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WheelOfNames />
  </StrictMode>
)
