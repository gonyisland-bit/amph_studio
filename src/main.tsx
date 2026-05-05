import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Global Scroll Reveal Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.1 });

// Initial watch + dynamic watch for SPA routing
const watch = () => {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
};

watch();
setInterval(watch, 1000); // Simple poll for dynamically rendered content in SPA
