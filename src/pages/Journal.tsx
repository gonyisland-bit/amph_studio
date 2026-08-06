import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJournals, JournalArticle, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MoveRight } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function Journal() {
  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);

  useScrollReveal();

  useEffect(() => {
    getJournals().then(setArticles);
    getHomeSettings().then(setSettings);
    document.title = "Journal — Amph";
  }, []);

  const sortedArticles = [...articles].sort((a, b) => {
    const aIdx = settings.journalOrder?.indexOf(a.id);
    const bIdx = settings.journalOrder?.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="flex flex-col flex-grow bg-white">
      {/* Editorial Hub Header (Identical to Space Header Format) */}
      <div className="px-6 md:px-12 pt-12 md:pt-24 pb-12 border-b border-black/10 bg-off-white">
        <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9] mb-6">
          {settings.hubSettings?.journal?.title || 'Journal'}
        </h1>
        <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">
          {settings.hubSettings?.journal?.description || 'Letters on Amplified Living & Architectural Stories.'}
        </p>
      </div>

      {/* Alternating 2-Column Full-Bleed Grid (Identical to Space Design) */}
      {sortedArticles.map((article, i) => {
        const mediaUrl = article.image || '';
        const isVideo = mediaUrl ? (mediaUrl.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || mediaUrl.includes('video')) : false;
        return (
          <Link 
            to={`/journal/${article.id}`} 
            key={article.id} 
            className="group flex flex-col md:flex-row min-h-[60vh] border-b-8 border-black/10 md:border-b-0 md:border-b border-black/10 transition-colors hover:bg-black/[0.01] reveal pb-8 md:pb-0 mb-4 md:mb-0"
            onMouseEnter={() => {
              import("../lib/data").then(module => {
                module.getJournalById(article.id);
              });
            }}
          >
            <div className={`flex-1 p-6 sm:p-8 md:p-16 lg:p-24 flex flex-col justify-center ${i % 2 === 0 ? "md:border-r" : "md:order-last md:border-l"} border-black/10 pt-8 border-t-2 border-cobalt/30 md:border-t-0`}>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] font-black text-cobalt font-mono block">
                  Journal 0{i + 1}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink/30 md:hidden bg-black/5 px-2 py-0.5">
                  Story #{i + 1}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-medium tracking-tighter uppercase font-sans mb-4 md:mb-8 leading-[0.95] md:leading-[0.9] group-hover:text-cobalt transition-colors">{article.title}</h2>
              {article.description && (
                <p className="text-base sm:text-lg font-serif italic text-ink/80 leading-relaxed max-w-sm mb-6 md:mb-12 line-clamp-3">
                  {article.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest group-hover:gap-6 transition-all mb-2 md:mb-0">
                <span>Read Story</span>
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
                  alt={article.title} 
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
      
      {articles.length === 0 && (
         <div className="p-24 text-center text-ink/40 text-sm font-semibold italic font-serif">No journal stories published yet.</div>
      )}

      {/* Newsletter Subscription Footer Section */}
      <div className="w-full h-[30vh] bg-off-white relative flex items-center justify-center text-center p-6 border-t border-black/10">
        <div className="relative z-10">
          <span className="text-xs uppercase tracking-widest font-bold text-cobalt mb-4 block">Subscribe</span>
          <h3 className="text-3xl md:text-5xl font-bold font-sans tracking-tight mb-8">Letters on Amplified Living</h3>
          <div className="flex max-w-md mx-auto shadow-sm">
            <input type="email" placeholder="Your email address" className="flex-grow bg-white px-6 py-4 outline-none border border-black/10 border-r-0 font-sans text-sm" />
            <button className="bg-ink text-white px-8 py-4 font-semibold text-xs uppercase tracking-widest hover:bg-cobalt transition-colors">Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
