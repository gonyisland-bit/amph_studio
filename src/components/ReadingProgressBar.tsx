import React, { useEffect, useState } from "react";

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[70] pointer-events-none bg-transparent"
      aria-hidden="true"
    >
      <div 
        className="h-full bg-cobalt transition-all duration-100 ease-out shadow-[0_0_10px_rgba(0,71,171,0.4)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
