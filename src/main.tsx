import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Rejestracja Service Workera nie powiodła się:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
