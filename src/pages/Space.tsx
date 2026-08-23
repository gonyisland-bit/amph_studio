import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSpaces, SpaceModel, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MoveRight, LayoutGrid, Rows } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function Space() {
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [viewMode, setViewMode] = useState<'magazine' | 'card'>(() => {
    return (localStorage.getItem('amph_space_view_mode') as 'magazine' | 'card') || 'magazine';
  });

  useEffect(() => {
    getSpaces().then(setSpaces);
    getHomeSettings().then(setSettings);
    document.title = "Space — Amph";
  }, []);

  const handleViewModeChange = (mode: 'magazine' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('amph_space_view_mode', mode);
  };

  const sortedSpaces = [...spaces].sort((a,b) => {
    const aIdx = settings.spaceOrder?.indexOf(a.id);
    const bIdx = settings.spaceOrder?.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  useScrollReveal([sortedSpaces, viewMode]);

  return (
    <div className="flex flex-col flex-grow bg-white">
      {/* Header & View Mode Switcher */}
      <div className="px-6 md:px-12 pt-12 md:pt-24 pb-8 md:pb-12 border-b border-black/10 bg-off-white flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9] mb-4 md:mb-6">
            {settings.hubSettings?.space?.title || 'Space'}
          </h1>
          <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">
            {settings.hubSettings?.space?.description}
          </p>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-1 self-start md:self-auto bg-black/5 p-1 rounded-none border border-black/10">
          <button
            type="button"
            onClick={() => handleViewModeChange('magazine')}
            className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer rounded-none ${
              viewMode === 'magazine'
                ? 'bg-cobalt text-white shadow-xs'
                : 'text-ink/60 hover:text-ink hover:bg-black/5'
            }`}
          >
            <Rows size={13} />
            <span>MAGAZINE</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('card')}
            className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer rounded-none ${
              viewMode === 'card'
                ? 'bg-cobalt text-white shadow-xs'
                : 'text-ink/60 hover:text-ink hover:bg-black/5'
            }`}
          >
            <LayoutGrid size={13} />
            <span>CARD</span>
          </button>
        </div>
      </div>

      {/* MAGAZINE VIEW MODE (2-Column Alternating Editorial Strip) */}
      {viewMode === 'magazine' && (
        <div className="flex flex-col">
          {sortedSpaces.map((space, i) => {
            const mediaUrl = space.images?.[0] || '';
            return (
              <Link 
                to={`/space/${space.id}`} 
                key={space.id} 
                className="group flex flex-col md:flex-row min-h-[60vh] border-b border-black/10 transition-colors hover:bg-black/[0.01] reveal mb-16 md:mb-0"
                onMouseEnter={() => {
                  import("../lib/data").then(module => {
                    module.getSpaceById(space.id);
                  });
                }}
              >
                <div className={`flex-1 p-6 sm:p-8 md:p-16 lg:p-24 flex flex-col justify-center ${i % 2 === 0 ? "md:border-r" : "md:order-last md:border-l"} border-black/10`}>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-cobalt font-sans block mb-3 md:mb-6">
                    Space 0{i + 1}
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-medium tracking-tighter uppercase font-sans mb-3 md:mb-8 leading-[0.95] md:leading-[0.9] group-hover:text-cobalt transition-colors">{space.title}</h2>
                  <p className="text-base sm:text-lg font-serif italic text-ink/80 leading-relaxed max-w-sm mb-4 md:mb-12 line-clamp-3">
                    {space.description}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest group-hover:gap-6 transition-all mb-2 md:mb-0">
                    <span>Enter Experience</span>
                    <MoveRight size={16} />
                  </div>
                </div>
                
                <div className="flex-[1.2] bg-black relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-none md:min-h-0 overflow-hidden">
                  <div 
                    className="w-full h-full overflow-hidden transform-gpu group-hover:scale-105 transition-transform duration-700 ease-out"
                    style={{ contain: 'paint' }}
                  >
                    <MediaRenderer 
                      src={mediaUrl} 
                      alt={space.title} 
                      className="w-full h-full object-cover pointer-events-none transform-gpu" 
                      loading={i === 0 ? "eager" : "lazy"}
                      fetchpriority={i === 0 ? "high" : "auto"}
                      nopin="nopin"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-700 pointer-events-none"></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* CARD VIEW MODE (3-Column Web Grid Matching Recommendation Card Design) */}
      {viewMode === 'card' && (
        <div className="px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {sortedSpaces.map((space, i) => {
              const mediaUrl = space.images?.[0] || '';
              return (
                <Link
                  key={space.id}
                  to={`/space/${space.id}`}
                  className="group flex flex-col bg-white border border-black/10 overflow-hidden hover:border-black/30 transition-all duration-300 reveal"
                >
                  <div className="w-full aspect-[4/3] bg-black overflow-hidden relative">
                    <MediaRenderer
                      src={mediaUrl}
                      alt={space.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading={i < 6 ? "eager" : "lazy"}
                    />
                    <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest">
                      Space 0{i + 1}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow justify-between bg-white">
                    <div>
                      <h3 className="text-xl font-bold uppercase tracking-tight font-sans mb-3 group-hover:text-cobalt transition-colors line-clamp-1">
                        {space.title}
                      </h3>
                      <p className="text-sm font-serif italic text-ink/70 line-clamp-3 leading-relaxed mb-6">
                        {space.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-cobalt group-hover:gap-5 transition-all pt-4 border-t border-black/5 mt-auto">
                      <span>Enter Experience</span>
                      <MoveRight size={14} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      
      {spaces.length === 0 && (
         <div className="p-24 text-center text-ink/40 text-sm font-semibold italic font-serif">No spaces recorded in our physical world yet.</div>
      )}
    </div>
  );
}
