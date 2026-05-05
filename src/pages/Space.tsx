import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSpaces, SpaceModel, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MoveRight } from "lucide-react";

export default function Space() {
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);

  useEffect(() => {
    getSpaces().then(setSpaces);
    getHomeSettings().then(setSettings);
    document.title = "Space — Amph";
  }, []);

  return (
    <div className="flex flex-col flex-grow bg-white">
      <div className="px-6 md:px-12 pt-12 md:pt-24 pb-12 border-b border-black/10 bg-off-white">
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] mb-6">
          {settings.hubSettings?.space?.title || 'Space'}
        </h1>
        <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">
          {settings.hubSettings?.space?.description}
        </p>
      </div>

      {spaces.map((space, i) => (
        <Link 
          to={`/space/${space.id}`} 
          key={space.id} 
          className="group flex flex-col md:flex-row min-h-[60vh] border-b border-black/10 transition-colors hover:bg-black/[0.01]"
        >
          <div className={`flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-center ${i % 2 === 0 ? "md:border-r" : "md:order-last md:border-l"} border-black/10`}>
            <span className="text-[10px] uppercase tracking-widest font-bold text-cobalt font-sans block mb-6">Space 0{i + 1}</span>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase font-sans mb-8 leading-[0.9] group-hover:text-cobalt transition-colors">{space.title}</h2>
            <p className="text-lg font-serif italic text-ink/80 leading-relaxed max-w-sm mb-12 line-clamp-3">
              {space.description}
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest group-hover:gap-6 transition-all">
              <span>Enter Experience</span>
              <MoveRight size={16} />
            </div>
          </div>
          
          <div className="flex-[1.2] bg-silver/10 relative min-h-[40vh] md:min-h-0 overflow-hidden">
            <img 
              src={space.images?.[0]} 
              alt={space.title} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" 
              referrerPolicy="no-referrer"
              loading={i === 0 ? "eager" : "lazy"}
              {...((i === 0) ? { fetchpriority: "high" } : {})}
            />
            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-700"></div>
          </div>
        </Link>
      ))}
      
      {spaces.length === 0 && (
         <div className="p-24 text-center text-ink/40 text-sm font-semibold italic font-serif">No spaces recorded in our physical world yet.</div>
      )}
    </div>
  );
}
