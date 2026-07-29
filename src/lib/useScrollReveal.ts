import { useEffect } from 'react';

export function useScrollReveal(deps: any[] = []) {
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight || 800;

    // 1. Immediately activate top viewport elements to prevent scroll lag
    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < windowHeight + 200) {
        el.classList.add('active');
      }
    });

    // 2. Observer for remaining elements
    const observerOptions = {
      root: null,
      rootMargin: '200px 0px',
      threshold: 0.01,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealElements.forEach((el) => {
      if (!el.classList.contains('active')) {
        observer.observe(el);
      }
    });

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, deps);
}
