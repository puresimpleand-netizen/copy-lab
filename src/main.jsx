import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// This runs every time the page loads
window.addEventListener('load', () => {
  const select = document.querySelector('select.cl-input');
  const label = document.querySelector('label');
  if (select && label) {
    select.id = 'copy-type';
    select.name = 'copy-type';
    label.setAttribute('for', 'copy-type');
  }
});
