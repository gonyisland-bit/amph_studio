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
            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white font-sans max-w-5xl leading-[0.8] mix-blend-lighten uppercase">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 mt-10">
              <div className="w-10 h-[1px] bg-white/30"></div>
              <span className="text-white/50 font-bold text-[10px] uppercase tracking-widest">{article.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Article Body Elements */}
      <div className="max-w-4xl mx-auto w-full px-6 py-16 md:py-32 flex flex-col gap-16 font-serif text-ink/90 text-xl leading-relaxed">
        {!article.contentBlocks || article.contentBlocks.length === 0 ? (
          <p className="italic text-ink/50 text-center">No additional body content available.</p>
        ) : (
          article.contentBlocks.map((block, idx) => {
            if (block.type === 'text') {
              return (
                <div key={idx} className="reveal">
                  <p className="first-letter:text-6xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-ink">{block.value}</p>
                </div>
              );
            }
            if (block.type === 'image') {
              return (
                <div key={idx} className="my-12 rounded-[40px] overflow-hidden shadow-2xl bg-silver/10 reveal aspect-[16/9]">
                  <MediaRenderer src={block.value} className="w-full h-full" loading="lazy" />
                </div>
              );
            }
            return null;
          })
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
