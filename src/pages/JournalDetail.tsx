import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MoveLeft } from "lucide-react";
import { getJournalById, JournalArticle } from "../lib/data";

export default function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<JournalArticle | null>(null);

  useEffect(() => {
    if (id) {
      getJournalById(id).then(setArticle);
    }
  }, [id]);

  if (!article) return <div className="p-12 font-sans">Loading...</div>;

  return (
    <div className="flex flex-col flex-grow bg-white">
      {/* Article Hero */}
      <div className="relative w-full h-[60vh] bg-silver flex items-end">
        <img 
          src={article.image} 
          alt={article.title} 
          className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-multiply" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        
        <div className="relative z-10 p-6 md:p-12 lg:p-24 w-full flex flex-col pt-32">
          <Link to="/journal" className="text-white/80 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest font-semibold mb-8 w-fit transition-colors">
            <MoveLeft size={16} /> Back to Journal
          </Link>
          <span className="text-orange text-xs uppercase font-bold tracking-widest mb-4 inline-block">{article.category}</span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white font-sans max-w-4xl">{article.title}</h1>
          <span className="text-white/60 font-semibold text-sm mt-6 font-sans">{article.date}</span>
        </div>
      </div>

      {/* Article Body Elements */}
      <div className="max-w-3xl mx-auto w-full px-6 py-16 md:py-24 flex flex-col gap-12 font-serif text-ink/90 text-lg leading-relaxed">
        {!article.contentBlocks || article.contentBlocks.length === 0 ? (
          <p className="italic text-ink/50 text-center">No additional body content available.</p>
        ) : (
          article.contentBlocks.map((block, idx) => {
            if (block.type === 'text') {
              return <p key={idx} className="first-letter:text-5xl first-letter:font-bold first-letter:mr-1 first-letter:float-left">{block.value}</p>;
            }
            if (block.type === 'image') {
              return (
                <div key={idx} className="my-8 rounded-[20px] overflow-hidden shadow-inner bg-silver">
                  <img src={block.value} alt="" className="w-full mix-blend-multiply" referrerPolicy="no-referrer" />
                </div>
              );
            }
            return null;
          })
        )}
      </div>

    </div>
  );
}
