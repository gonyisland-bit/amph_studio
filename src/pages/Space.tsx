import { useEffect, useState } from "react";
import { getSpaces, SpaceModel } from "../lib/data";

export default function Space() {
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);

  useEffect(() => {
    getSpaces().then(setSpaces);
  }, []);

  return (
    <div className="flex flex-col flex-grow bg-white">
      {spaces.map((space, i) => (
        <div key={space.id} className="flex flex-col min-h-[50vh]">
          <div className={`flex-1 grid grid-cols-1 md:grid-cols-2 ${i > 0 ? "border-t border-black/10" : ""}`}>
            <div className={`p-6 md:p-12 lg:p-24 flex flex-col justify-center border-b md:border-b-0 ${i % 2 === 0 ? "bg-pink md:border-r" : "bg-off-white order-last md:border-l"} border-black/10`}>
              <span className="text-[10px] uppercase tracking-widest font-bold text-ink/40 font-sans block mb-6">{space.title}</span>
              <h1 className="text-6xl md:text-8xl lg:text-[120px] font-bold tracking-tighter uppercase font-sans mb-8 leading-[0.8]" dangerouslySetInnerHTML={{ __html: space.location.replace(' ', '<br/>') }} />
              <p className="text-xl font-serif italic text-ink/80 leading-relaxed max-w-sm mb-12">
                {space.description}
              </p>
              <div className="space-y-4 text-sm font-semibold font-sans uppercase tracking-widest text-ink/60 whitespace-pre-line">
                <p>{space.address}</p>
                <p className="text-ink/60">{space.hours}</p>
              </div>
            </div>
            <div className="bg-silver relative min-h-[50vh] p-8 flex items-center justify-center">
              <div className="w-full h-full rounded-[40px] overflow-hidden relative shadow-inner">
                <img 
                  src={space.image} 
                  alt={space.title} 
                  className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-1000 hover:scale-105" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
      {spaces.length === 0 && (
         <div className="p-12 text-center text-ink/40 text-sm font-semibold">No spaces available.</div>
      )}
    </div>
  );
}
