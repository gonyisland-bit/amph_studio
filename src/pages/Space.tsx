import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSpaces, SpaceModel, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MoveRight } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function Space() {
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);

  useScrollReveal();

  useEffect(() => {
    getSpaces().then(setSpaces);
    getHomeSettings().then(setSettings);
    document.title = "Space — Amph";
  }, []);

  const sortedSpaces = [...spaces].sort((a,b) => {
    const aIdx = settings.spaceOrder?.indexOf(a.id);
    const bIdx = settings.spaceOrder?.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="flex flex-col flex-grow bg-white">
      <div className="px-6 md:px-12 pt-12 md:pt-24 pb-12 border-b border-black/10 bg-off-white">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9] mb-6">
          {settings.hubSettings?.space?.title || 'Space'}
        </h1>
        <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">
          {settings.hubSettings?.space?.description}
        </p>
      </div>

      {sortedSpaces.map((space, i) => {
        const mediaUrl = space.images?.[0] || '';
        const isVideo = mediaUrl ? (mediaUrl.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || mediaUrl.includes('video')) : false;
        return (
          <Link 
            to={`/space/${space.id}`} 
            key={space.id} 
            className="group flex flex-col md:flex-row min-h-[60vh] border-b border-black/10 transition-colors hover:bg-black/[0.01] reveal"
            onMouseEnter={() => {
              import("../lib/data").then(module => {
                module.getSpaceById(space.id);
              });
            }}
          >
            <div className={`flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-center ${i % 2 === 0 ? "md:border-r" : "md:order-last md:border-l"} border-black/10`}>
              <span className="text-[10px] uppercase tracking-widest font-bold text-cobalt font-sans block mb-6">Space 0{i + 1}</span>
              <h2 className="text-3xl md:text-5xl font-medium tracking-tighter uppercase font-sans mb-8 leading-[0.9] group-hover:text-cobalt transition-colors">{space.title}</h2>
              <p className="text-lg font-serif italic text-ink/80 leading-relaxed max-w-sm mb-12 line-clamp-3">
                {space.description}
              </p>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest group-hover:gap-6 transition-all">
                <span>Enter Experience</span>
                <MoveRight size={16} />
              </div>
            </div>
            
            <div className="flex-[1.2] bg-silver/10 relative min-h-[40vh] md:min-h-0 overflow-hidden">
              <div 
                className="w-full h-full overflow-hidden transform-gpu group-hover:scale-105 transition-transform duration-700 ease-out"
                style={{ contain: 'paint' }}
              >
                <MediaRenderer 
                  src={mediaUrl} 
                  alt={space.title} 
                  className="w-full h-full object-cover scale-100 pointer-events-none transform-gpu" 
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchpriority={i === 0 ? "high" : "auto"}
                  nopin="nopin"
                />
              </div>
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-700 pointer-events-none"></div>
            </div>
          </Link>
        );
      })}
      
      {spaces.length === 0 && (
         <div className="p-24 text-center text-ink/40 text-sm font-semibold italic font-serif">No spaces recorded in our physical world yet.</div>
      )}
    </div>
  );
}
