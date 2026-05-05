import { MoveRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getJournals, JournalArticle } from "../lib/data";

export default function Journal() {
  const [hoveredArticle, setHoveredArticle] = useState<number | null>(null);
  const [articles, setArticles] = useState<JournalArticle[]>([]);

  useEffect(() => {
    getJournals().then(setArticles);
    document.title = "Journal — Amph";
  }, []);

  const _a = (prompt: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=400&nologo=true`;

  return (
    <div className="flex flex-col flex-grow bg-white relative">
      <div className="px-6 md:px-12 py-12 md:py-24 border-b border-black/10">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase font-sans mb-8">Journal</h1>
        <p className="max-w-2xl text-xl md:text-2xl font-serif text-ink/80 leading-relaxed italic">
          Conversations on contemporary living, exploring the intersection of raw industrial materials and vibrant, unexpected forms.
        </p>
      </div>

      <div className="flex-grow relative">
        {/* Floating image that follows hover state */}
        <div className="hidden lg:block absolute right-24 top-1/2 -translate-y-1/2 w-[300px] h-[200px] pointer-events-none z-10 transition-opacity duration-300">
          {articles.map((article, i) => (
             <img 
               key={article.id}
               src={article.image}
               alt={article.title}
               className={`absolute inset-0 w-full h-full object-cover rounded-2xl shadow-xl transition-opacity duration-500 ${hoveredArticle === i ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
               referrerPolicy="no-referrer"
             />
          ))}
        </div>

        {articles.map((article, i) => (
          <Link 
            to={`/journal/${article.id}`}
            key={article.id} 
            onMouseEnter={() => setHoveredArticle(i)}
            onMouseLeave={() => setHoveredArticle(null)}
            className="group border-b border-black/10 px-6 md:px-12 py-10 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-silver/10 transition-colors cursor-pointer relative z-0"
          >
            <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8 md:w-2/3">
              <span className="text-xs uppercase font-semibold font-sans text-orange w-32 shrink-0">{article.category}</span>
              <h2 className="text-3xl md:text-5xl font-bold font-sans tracking-tight group-hover:text-cobalt transition-colors">{article.title}</h2>
            </div>
            <div className="flex items-center gap-6 justify-between md:justify-end md:w-1/3 text-sm font-semibold font-sans text-ink/50 mt-4 md:mt-0">
              <span>{article.date}</span>
              <div className="w-12 h-12 rounded-full border border-black/20 flex items-center justify-center group-hover:border-cobalt group-hover:text-cobalt group-hover:bg-cobalt/5 transition-all">
                <MoveRight size={18} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      
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
