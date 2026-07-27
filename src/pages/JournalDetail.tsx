import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MoveLeft } from "lucide-react";
import { getJournalById, JournalArticle } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<JournalArticle | null>(null);

  useScrollReveal();

  useEffect(() => {
    if (id) {
      getJournalById(id).then(setArticle);
    }
  }, [id]);

  if (!article) return <div className="p-12 font-sans animate-pulse">Loading...</div>;

  return (
    <div className="flex flex-col flex-grow bg-white">
      {/* Immersive Article Hero */}
      <div className="relative w-full h-[70vh] md:h-[85vh] bg-black overflow-hidden flex items-end">
        <MediaRenderer 
          src={article.image} 
          alt={article.title} 
          className="absolute inset-0 w-full h-full opacity-80"
          loading="eager"
          fetchpriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
        
        <div className="relative z-10 p-6 md:p-12 lg:p-24 w-full flex flex-col">
          <div className="max-w-7xl mx-auto w-full">
            <Link to="/journal" className="text-white/60 hover:text-white flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black mb-8 w-fit transition-colors">
              <MoveLeft size={14} /> Back to Journal
            </Link>
            <span className="text-orange text-xs uppercase font-black tracking-[0.2em] mb-6 inline-block">{article.category}</span>
            <h1 className="text-3.5xl md:text-5.5xl lg:text-6.5xl font-medium tracking-tighter text-white font-sans max-w-5xl leading-[0.85] mix-blend-lighten uppercase">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 mt-10">
              <div className="w-10 h-[1px] bg-white/30"></div>
              <span className="text-white/50 font-bold text-[10px] uppercase tracking-widest">{article.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Article Body Elements (Editorial 2-Column Grid Layout) */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 md:py-24">
        {!article.contentBlocks || article.contentBlocks.length === 0 ? (
          <p className="italic text-ink/50 text-center font-serif text-xl">No additional body content available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-start w-full">
            {article.contentBlocks.map((block, idx) => {
              if (block.type === 'text') {
                return (
                  <div key={idx} className="flex flex-col reveal py-4 w-full">
                    <p className="text-xl md:text-2xl font-serif italic leading-relaxed text-ink/80 first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-cobalt">
                      {block.value}
                    </p>
                  </div>
                );
              }
              if (block.type === 'image') {
                const textContent = block.caption || '';
                return (
                  <div key={idx} className="flex flex-col reveal group w-full">
                    <div className="w-full aspect-[4/3] bg-silver/5 overflow-hidden border border-black/5 relative rounded-none">
                      <MediaRenderer 
                        src={block.value} 
                        alt={`Journal view ${idx + 1}`} 
                        className="w-full h-full object-cover rounded-none shadow-none group-hover:scale-105 transition-transform duration-700" 
                        loading="lazy" 
                        nopin="nopin"
                      />
                    </div>
                    {textContent && (
                      <div className="mt-4">
                        <p className="text-sm md:text-base font-sans leading-relaxed text-ink/80">{textContent}</p>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-6 py-24 border-t border-black/10 bg-off-white text-center">
        <Link to="/journal" className="inline-flex items-center gap-6 text-4xl md:text-6xl font-black uppercase tracking-tighter hover:text-cobalt transition-all group">
          Explore More Stories <MoveLeft size={48} className="group-hover:-translate-x-4 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
