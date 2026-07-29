import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { MoveLeft, MoveRight, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getJournalById, getJournals, JournalArticle } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<JournalArticle | null>(null);
  const [allArticles, setAllArticles] = useState<JournalArticle[]>([]);

  // Fullscreen Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragDistanceRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStartPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      dragDistanceRef.current = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      e.preventDefault();
      dragDistanceRef.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      setPanOffset({
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useScrollReveal();

  useEffect(() => {
    if (id) {
      getJournals().then(all => {
        setAllArticles(all);
        const found = all.find(a => a.id === id);
        if (found) setArticle(found);
      });
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

  // Collect all images for Lightbox navigation (Strictly Hero Cover + Current Story ContentBlocks)
  const getAllImages = () => {
    const list: string[] = [];
    if (article.image) {
      list.push(article.image);
    }
    if (article.contentBlocks) {
      article.contentBlocks.forEach(b => {
        if (b.type === 'image' && b.value && !list.includes(b.value)) {
          list.push(b.value);
        }
      });
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
            <h1 className="text-[8.5vw] md:text-[7vw] font-medium uppercase tracking-tighter leading-[0.85] text-white mix-blend-lighten">
              {article.title}
            </h1>
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
                  <div key={idx} className="flex flex-col reveal py-12 w-full h-full min-h-[250px] md:min-h-[350px] justify-center items-center text-center my-auto">
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

      {/* Related Journal Articles Carousel Slider Section */}
      {(() => {
        const getRelatedArticles = () => {
          if (article.relatedJournalIds && article.relatedJournalIds.length > 0) {
            const explicit = allArticles.filter(a => article.relatedJournalIds?.includes(a.id));
            if (explicit.length > 0) return explicit;
          }
          const featured = allArticles.filter(a => a.id !== article.id && a.featured);
          if (featured.length > 0) return featured;
          return allArticles.filter(a => a.id !== article.id);
        };

        const relatedArticles = getRelatedArticles();
        if (relatedArticles.length === 0) return null;

        const scrollSlider = (dir: 'left' | 'right') => {
          const el = document.getElementById('related-journals-slider');
          if (el) {
            el.scrollBy({ left: dir === 'left' ? -350 : 350, behavior: 'smooth' });
          }
        };

        return (
          <div className="w-full px-4 md:px-8 lg:px-12 py-20 border-t border-black/10 reveal">
            <div className="flex justify-between items-end mb-8 border-b border-black/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange block mb-1">Journal Stories</span>
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tighter">More Stories to Explore</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => scrollSlider('left')} 
                  className="p-2 border border-black/10 hover:bg-black/5 text-ink transition-colors cursor-pointer rounded-none"
                  title="Scroll Left"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => scrollSlider('right')} 
                  className="p-2 border border-black/10 hover:bg-black/5 text-ink transition-colors cursor-pointer rounded-none"
                  title="Scroll Right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div 
              id="related-journals-slider"
              className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth snap-x pb-4"
            >
              {relatedArticles.map(a => (
                <Link key={a.id} to={`/journal/${a.id}`} className="group block w-[280px] md:w-[350px] flex-shrink-0 snap-start">
                  <div className="aspect-[4/3] bg-silver/20 rounded-none overflow-hidden mb-3 border border-black/5 relative">
                    <MediaRenderer src={a.image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    {a.featured && (
                      <span className="absolute top-3 left-3 z-10 text-orange bg-black/40 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-orange/30">
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold tracking-tight mb-1 group-hover:text-cobalt transition-colors uppercase truncate">{a.title}</h4>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

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
            <div className="flex items-center gap-4 text-white/70 text-xs font-mono">
              <div className="flex items-center gap-2 border-l border-white/20 pl-4">
                <button 
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.5, 3))}
                  className="hover:text-white transition-colors p-1 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <button 
                  onClick={() => {
                    setZoomScale(prev => {
                      const next = Math.max(prev - 0.5, 1);
                      if (next === 1) setPanOffset({ x: 0, y: 0 });
                      return next;
                    });
                  }}
                  className="hover:text-white transition-colors p-1 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
              </div>
              <button 
                onClick={() => {
                  setLightboxIndex(null);
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="hover:text-white transition-colors p-1.5 cursor-pointer ml-2"
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
              className="w-full h-full flex items-center justify-center select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                transformOrigin: 'center center',
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
              }}
              onClick={() => {
                if (dragDistanceRef.current > 5) {
                  dragDistanceRef.current = 0;
                  return;
                }
                setZoomScale(prev => {
                  const next = prev > 1 ? 1 : 2.5;
                  if (next === 1) setPanOffset({ x: 0, y: 0 });
                  return next;
                });
              }}
            >
              <MediaRenderer
                src={allImages[lightboxIndex]}
                alt={`${article.title} view ${lightboxIndex + 1}`}
                style={{
                  maxWidth: 'calc(100vw - 80px)',
                  maxHeight: 'calc(100vh - 150px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  pointerEvents: zoomScale > 1 ? 'none' : 'auto',
                  userSelect: 'none',
                }}
                loading="eager"
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
          <div className="py-4 px-6 z-30 flex justify-center items-center gap-2 overflow-x-auto hide-scrollbar flex-shrink-0 bg-black/60 backdrop-blur-md border-t border-white/10 w-full">
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
