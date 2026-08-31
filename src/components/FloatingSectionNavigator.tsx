import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface FloatingSectionNavigatorProps {
  mode?: 'sections' | 'viewport';
  sectionIds?: string[];
  className?: string;
}

export function FloatingSectionNavigator({ 
  mode = 'sections',
  sectionIds = [], 
  className = '' 
}: FloatingSectionNavigatorProps) {
  // Navigation State
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [scrollRatio, setScrollRatio] = useState(0); // 0 to 1

  // Dimming state: Strictly dimmed (opacity-30) unless cursor directly hovers this navigator
  const [isHovered, setIsHovered] = useState(false);

  // Scroll Tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const maxScroll = Math.max(1, scrollHeight - windowHeight);

      setIsAtTop(scrollY <= 60);
      setIsAtBottom(scrollY + windowHeight >= scrollHeight - 60);
      setScrollRatio(Math.min(1, Math.max(0, scrollY / maxScroll)));

      // If in sections mode, track current active section index
      if (mode === 'sections' && sectionIds.length > 0) {
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

        if (scrollY + windowHeight >= scrollHeight - 60) {
          currentIdx = sectionIds.length - 1;
        }

        setActiveSectionIdx(currentIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mode, sectionIds]);

  // Section Mode Handlers (Home)
  const scrollToSectionIndex = (index: number) => {
    const targetId = sectionIds[index];
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollNextSection = () => {
    const nextIdx = Math.min(sectionIds.length - 1, activeSectionIdx + 1);
    scrollToSectionIndex(nextIdx);
  };

  const handleScrollPrevSection = () => {
    const prevIdx = Math.max(0, activeSectionIdx - 1);
    scrollToSectionIndex(prevIdx);
  };

  // Viewport Mode Handlers (Hub Pages: Collection, Catalogue, Space, Journal)
  const handleScrollNextViewport = () => {
    const step = window.innerHeight * 0.85;
    window.scrollBy({ top: step, behavior: 'smooth' });
  };

  const handleScrollPrevViewport = () => {
    if (window.scrollY <= window.innerHeight) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const step = window.innerHeight * 0.85;
      window.scrollBy({ top: -step, behavior: 'smooth' });
    }
  };

  const handleScrollToRatio = (ratio: number) => {
    const scrollHeight = document.documentElement.scrollHeight;
    const maxScroll = scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll * ratio, behavior: 'smooth' });
  };

  // Number of viewport dots for hub pages (5 steps: 0%, 25%, 50%, 75%, 100%)
  const viewportSteps = [0, 0.25, 0.5, 0.75, 1];
  const activeViewportStep = Math.min(4, Math.round(scrollRatio * 4));

  return (
    <aside 
      aria-label="Smart Navigation"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto transition-all duration-500 ease-out select-none ${
        isHovered ? 'opacity-100 scale-105' : 'opacity-30 scale-100'
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1.5 p-1.5 bg-black/80 hover:bg-black/90 backdrop-blur-md border border-white/20 rounded-full shadow-2xl transition-all">
        {/* Up Arrow */}
        {mode === 'sections' ? (
          activeSectionIdx > 0 && (
            <button
              type="button"
              onClick={handleScrollPrevSection}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-cobalt text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="이전 섹션으로 이동"
              aria-label="Previous section"
            >
              <ChevronUp size={18} />
            </button>
          )
        ) : (
          !isAtTop && (
            <button
              type="button"
              onClick={handleScrollPrevViewport}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-cobalt text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="이전 영역으로 스크롤"
              aria-label="Scroll up"
            >
              <ChevronUp size={18} />
            </button>
          )
        )}

        {/* Progress Dots */}
        <div className="flex items-center gap-1 px-1.5">
          {mode === 'sections' ? (
            sectionIds.map((_, sIdx) => (
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
            ))
          ) : (
            viewportSteps.map((ratio, vIdx) => (
              <button
                key={vIdx}
                type="button"
                onClick={() => handleScrollToRatio(ratio)}
                className={`transition-all rounded-full cursor-pointer p-0 border-0 outline-none ${
                  vIdx === activeViewportStep 
                    ? 'w-4 h-1.5 bg-cobalt' 
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
                title={`${Math.round(ratio * 100)}%`}
                aria-label={`Scroll to ${Math.round(ratio * 100)}%`}
              />
            ))
          )}
        </div>

        {/* Down Arrow: Always available in viewport mode unless at absolute bottom! */}
        {mode === 'sections' ? (
          !isAtBottom && activeSectionIdx < sectionIds.length - 1 && (
            <button
              type="button"
              onClick={handleScrollNextSection}
              className={`w-8 h-8 rounded-full bg-white/10 hover:bg-cobalt text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/down ${
                activeSectionIdx === 0 ? 'bg-cobalt/80 hover:bg-cobalt ring-2 ring-white/30' : ''
              }`}
              title="다음 섹션으로 이동"
              aria-label="Next section"
            >
              <ChevronDown size={18} className="group-hover/down:translate-y-0.5 transition-transform" />
            </button>
          )
        ) : (
          !isAtBottom && (
            <button
              type="button"
              onClick={handleScrollNextViewport}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-cobalt text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group/down"
              title="다음 영역으로 스크롤"
              aria-label="Scroll down"
            >
              <ChevronDown size={18} className="group-hover/down:translate-y-0.5 transition-transform" />
            </button>
          )
        )}
      </div>
    </aside>
  );
}
