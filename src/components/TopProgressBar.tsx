import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function TopProgressBar() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(20);

    const timer1 = setTimeout(() => {
      setProgress(65);
    }, 80);

    const timer2 = setTimeout(() => {
      setProgress(100);
    }, 220);

    const timer3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[9999] pointer-events-none overflow-hidden bg-transparent">
      <div 
        className="h-full bg-cobalt transition-all duration-300 ease-out shadow-[0_0_8px_rgba(0,35,255,0.7)]"
        style={{ 
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          transitionProperty: 'width, opacity'
        }}
      />
    </div>
  );
}
