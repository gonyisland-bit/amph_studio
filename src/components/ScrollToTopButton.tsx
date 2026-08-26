import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 bg-white/90 hover:bg-cobalt text-ink hover:text-white border border-black/10 hover:border-cobalt px-3 py-2 text-[9px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 cursor-pointer group"
      aria-label="Scroll to top"
    >
      <ArrowUp size={12} className="group-hover:-translate-y-0.5 transition-transform" />
      <span>TOP</span>
    </button>
  );
}
