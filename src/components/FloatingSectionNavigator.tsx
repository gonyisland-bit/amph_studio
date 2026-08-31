import React, { useEffect, useState, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface FloatingSectionNavigatorProps {
  sectionIds: string[];
  className?: string;
}

export function FloatingSectionNavigator({ sectionIds, className = '' }: FloatingSectionNavigatorProps) {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Idle auto-dimming logic (Dim to opacity-30 after 3.5s of no interaction)
  useEffect(() => {
    const resetIdleTimer = () => {
      setIsDimmed(false);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        setIsDimmed(true);
      }, 3500);
    };

    resetIdleTimer();

    const handleUserInteraction = () => {
      resetIdleTimer();
    };

    window.addEventListener('mousemove', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // 2. Scroll & Active Section Tracking
  useEffect(() => {
    if (!sectionIds || sectionIds.length === 0) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;

      const nearBottom = scrollY + windowHeight >= scrollHeight - 80;
      setIsAtBottom(nearBottom);

      let currentIdx = 0;
      sectionIds.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= windowHeight * 0.45) {
            currentIdx = idx;
          }
        }
      });

      if (nearBottom) {
        currentIdx = sectionIds.length - 1;
      }

      setActiveSectionIdx(currentIdx);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionIds]);

  const scrollToSectionIndex = (index: number) => {
    const targetId = sectionIds[index];
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollNext = () => {
    const nextIdx = Math.min(sectionIds.length - 1, activeSectionIdx + 1);
    scrollToSectionIndex(nextIdx);
  };

  const handleScrollPrev = () => {
    const prevIdx = Math.max(0, activeSectionIdx - 1);
    scrollToSectionIndex(prevIdx);
  };

  if (!sectionIds || sectionIds.length <= 1) return null;

  return (
    <aside 
      aria-label="Section Navigation"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto transition-all duration-700 ease-out group ${
        isDimmed ? 'opacity-30 hover:opacity-100 hover:scale-105' : 'opacity-100 scale-100'
      } ${className}`}
      onMouseEnter={() => setIsDimmed(false)}
    >
      <div className="flex items-center gap-1.5 p-1.5 bg-black/80 hover:bg-black/90 backdrop-blur-md border border-white/20 rounded-full shadow-2xl transition-all select-none">
        {/* Up Arrow: Moves to previous section (hidden on top) */}
        {activeSectionIdx > 0 && (
          <button
            type="button"
            onClick={handleScrollPrev}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-cobalt text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="이전 섹션으로 이동"
            aria-label="Previous section"
          >
            <ChevronUp size={18} />
          </button>
        )}

        {/* Section Progress Dots */}
        <div className="flex items-center gap-1 px-1.5">
          {sectionIds.map((_, sIdx) => (
            <button
              key={sIdx}
              type="button"
              onClick={() => scrollToSectionIndex(sIdx)}
              className={`transition-all rounded-full cursor-pointer p-0 border-0 outline-none ${
                sIdx === activeSectionIdx 
                  ? 'w-4 h-1.5 bg-cobalt' 
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
              title={`Section ${sIdx + 1}`}
              aria-label={`Go to section ${sIdx + 1}`}
            />
          ))}
        </div>

        {/* Down Arrow: Moves to next section (hidden on bottom) */}
        {!isAtBottom && activeSectionIdx < sectionIds.length - 1 && (
          <button
            type="button"
            onClick={handleScrollNext}
            className={`w-8 h-8 rounded-full bg-white/10 hover:bg-cobalt text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/down ${
              activeSectionIdx === 0 ? 'bg-cobalt/80 hover:bg-cobalt ring-2 ring-white/30' : ''
            }`}
            title="다음 섹션으로 이동"
            aria-label="Next section"
          >
            <ChevronDown size={18} className="group-hover/down:translate-y-0.5 transition-transform" />
          </button>
        )}
      </div>
    </aside>
  );
}
