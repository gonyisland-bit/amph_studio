import { useEffect } from 'react';

export function useScrollReveal(deps: any[] = []) {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    const runReveal = () => {
      const revealElements = document.querySelectorAll('.reveal');
      const windowHeight = window.innerHeight || 800;

      // 1. Immediately activate top viewport elements to prevent layout / blank gap lag
      revealElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < windowHeight + 300) {
          el.classList.add('active');
        }
      });

      // 2. Observer for remaining elements
      const observerOptions = {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0.01,
      };

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer?.unobserve(entry.target);
          }
        });
      }, observerOptions);

      revealElements.forEach((el) => {
        if (!el.classList.contains('active')) {
          observer?.observe(el);
        }
      });
    };

    // Run immediately for instant render
    runReveal();
    const frameId = requestAnimationFrame(runReveal);
    const timeoutId = setTimeout(runReveal, 50);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
      if (observer) {
        document.querySelectorAll('.reveal').forEach((el) => observer?.unobserve(el));
      }
    };
  }, deps);
}
