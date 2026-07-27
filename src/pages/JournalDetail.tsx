import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MoveLeft, MoveRight, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getJournalById, JournalArticle } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<JournalArticle | null>(null);

  // Fullscreen Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useScrollReveal();

  useEffect(() => {
    if (id) {
      getJournalById(id).then(setArticle);
    }
  }, [id]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
        setZoomScale(1);
      } else if (e.key === 'ArrowRight') {
        const allImgs = getAllImages();
        if (allImgs.length > 0) {
          setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allImgs.length : 0));
          setZoomScale(1);
        }
      } else if (e.key === 'ArrowLeft') {
        const allImgs = getAllImages();
        if (allImgs.length > 0) {
          setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allImgs.length) % allImgs.length : 0));
          setZoomScale(1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]);

  if (!article) return <div className="p-12 font-sans animate-pulse">Loading...</div>;

  // Collect all images for Lightbox navigation (Deduplicated, excluding separate hero duplicate)
  const getAllImages = () => {
    const list: string[] = [];
    if (article.contentBlocks) {
      article.contentBlocks.forEach(b => {
        if (b.type === 'image' && b.value && b.value !== article.image && !list.includes(b.value)) {
          list.push(b.value);
        }
      });
    }
    if (list.length === 0 && article.image) {
      list.push(article.image);
    }
    return list;
  };

  const allImages = getAllImages();

  // Touch gesture handlers for Lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setTouchDelta({ x: 0, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    setTouchDelta({ x: currentX - touchStartPos.x, y: currentY - touchStartPos.y });
  };

  const handleTouchEnd = () => {
    if (zoomScale > 1) {
      setTouchStartPos(null);
      setTouchDelta({ x: 0, y: 0 });
      return;
    }
    if (touchDelta.x < -60) {
      setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allImages.length : 0));
      setZoomScale(1);
    } else if (touchDelta.x > 60) {
      setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allImages.length) % allImages.length : 0));
      setZoomScale(1);
    } else if (Math.abs(touchDelta.y) > 100) {
      setLightboxIndex(null);
      setZoomScale(1);
    }
    setTouchStartPos(null);
    setTouchDelta({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col flex-grow bg-white">
      {/* Immersive Article Hero (Identical to Space Hero Layout) */}
      <div 
        onClick={() => {
          const idx = allImages.indexOf(article.image);
          setLightboxIndex(idx !== -1 ? idx : 0);
          setZoomScale(1);
        }}
        className="relative w-full h-[85vh] md:h-[95vh] bg-black overflow-hidden cursor-zoom-in group"
      >
        <MediaRenderer 
          src={article.image} 
          alt={article.title} 
          className="w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-1000"
          loading="eager"
          fetchpriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-24 pointer-events-none">
          <div className="max-w-7xl mx-auto w-full">
            <Link to="/journal" className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 block text-white/60 hover:text-white transition-colors pointer-events-auto w-fit">
              <span className="inline-block mr-2">←</span> Back to Journal
            </Link>
            <span className="text-orange text-xs uppercase font-black tracking-[0.2em] mb-4 inline-block">{article.category}</span>
            <h1 className="text-[8.5vw] md:text-[7vw] font-medium uppercase tracking-tighter leading-[0.85] text-white mix-blend-lighten">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 mt-8">
              <div className="w-10 h-[1px] bg-white/30"></div>
              <span className="text-white/50 font-bold text-[10px] uppercase tracking-widest">{article.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Article Body Elements (Editorial 2-Column Grid Layout) */}
      <div className="w-full px-4 md:px-8 lg:px-12 py-16">
        {!article.contentBlocks || article.contentBlocks.length === 0 ? (
          <p className="italic text-ink/50 text-center font-serif text-xl">No additional body content available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-start w-full">
            {article.contentBlocks.map((block, idx) => {
              if (block.type === 'text') {
                return (
                  <div key={idx} className="flex flex-col reveal py-6 w-full justify-center text-center">
                    <p className="text-3xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tighter leading-[0.9] font-sans text-ink whitespace-pre-wrap text-center mx-auto max-w-4xl">
                      {block.value}
                    </p>
                  </div>
                );
              }
              if (block.type === 'image') {
                const textContent = block.caption || '';
                const targetIdx = allImages.indexOf(block.value);
                return (
                  <div key={idx} className="flex flex-col reveal group w-full">
                    <div 
                      onClick={() => {
                        setLightboxIndex(targetIdx !== -1 ? targetIdx : 0);
                        setZoomScale(1);
                      }}
                      className="w-full aspect-[4/3] bg-silver/5 overflow-hidden border border-black/5 relative rounded-none cursor-zoom-in"
                    >
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
                        <p className="text-sm md:text-base font-sans leading-relaxed text-ink/80 text-center">{textContent}</p>
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

      {/* Fullscreen Lightbox Modal with Controls */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 bg-black z-[200] flex flex-col select-none touch-none animate-fade-in"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Header Controls */}
          <div className="flex justify-between items-center w-full z-30 text-white/60 px-6 pt-4 pb-2 flex-shrink-0">
            <span className="text-[10px] font-sans font-bold tracking-widest uppercase">
              {article.title} — {lightboxIndex + 1} / {allImages.length}
            </span>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setZoomScale(prev => prev === 1 ? 2.5 : 1)}
                className="hover:text-white transition-colors p-1.5 cursor-pointer"
                title={zoomScale === 1 ? "Zoom In" : "Zoom Out"}
              >
                {zoomScale === 1 ? <ZoomIn size={18} /> : <ZoomOut size={18} />}
              </button>
              <button 
                onClick={() => {
                  setLightboxIndex(null);
                  setZoomScale(1);
                }}
                className="hover:text-white transition-colors p-1.5 cursor-pointer"
                title="Close (Esc)"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Lightbox Main Stage */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden px-4 md:px-16 py-2">
            <button 
              onClick={() => {
                setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allImages.length) % allImages.length : 0));
                setZoomScale(1);
              }}
              className="absolute left-4 z-30 text-white/40 hover:text-white p-3 transition-all hover:scale-110 cursor-pointer hidden sm:block"
              title="Previous"
            >
              <ChevronLeft size={36} />
            </button>

            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
              style={{
                transform: `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0)`
              }}
            >
              <MediaRenderer
                src={allImages[lightboxIndex]}
                alt={`${article.title} view ${lightboxIndex + 1}`}
                className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out rounded-none cursor-pointer"
                style={{ transform: `scale(${zoomScale})` }}
                onClick={() => setZoomScale(prev => prev === 1 ? 2.5 : 1)}
              />
            </div>

            <button 
              onClick={() => {
                setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allImages.length : 0));
                setZoomScale(1);
              }}
              className="absolute right-4 z-30 text-white/40 hover:text-white p-3 transition-all hover:scale-110 cursor-pointer hidden sm:block"
              title="Next"
            >
              <ChevronRight size={36} />
            </button>
          </div>

          {/* Lightbox Thumbnails Bar */}
          <div className="py-4 px-6 z-30 flex justify-center items-center gap-2 overflow-x-auto hide-scrollbar flex-shrink-0 bg-black/60 backdrop-blur-md border-t border-white/10">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setLightboxIndex(i);
                  setZoomScale(1);
                }}
                className={`w-12 h-12 flex-shrink-0 border transition-all duration-300 overflow-hidden rounded-none cursor-pointer ${
                  lightboxIndex === i ? 'border-cobalt scale-105 opacity-100' : 'border-white/20 opacity-40 hover:opacity-80'
                }`}
              >
                <MediaRenderer src={img} alt={`Thumb ${i+1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
