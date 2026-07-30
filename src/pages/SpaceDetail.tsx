import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getSpaces, getProducts, SpaceModel, Product } from "../lib/data";
import { MoveRight, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [space, setSpace] = useState<SpaceModel | null>(null);
  const [appliedProducts, setAppliedProducts] = useState<Product[]>([]);
  const [allSpaces, setAllSpaces] = useState<SpaceModel[]>([]);
  
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

  useScrollReveal([space, appliedProducts]);

  useEffect(() => {
    if (id) {
      getSpaces().then(all => {
        setAllSpaces(all);
        const found = all.find(s => s.id === id);
        if (found) {
          setSpace(found);
          if (found.appliedProductIds) {
            getProducts().then(prods => {
              setAppliedProducts(prods.filter(p => found.appliedProductIds?.includes(p.id)));
            });
          }
        }
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

  if (!space) return <div className="p-12 font-sans animate-pulse">Loading Space...</div>;

  const displayImages = space.images || [];
  
  const heroImage = space.image || (displayImages.length > 0 ? displayImages[0] : '');

  // Collect all images for Lightbox navigation (Strictly Hero Cover + Current Story ContentBlocks)
  const getAllImages = () => {
    const list: string[] = [];
    if (heroImage) {
      list.push(heroImage);
    }
    if (space.contentBlocks) {
      space.contentBlocks.forEach(b => {
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
    <div className="flex flex-col flex-grow bg-white font-sans text-ink">
      {/* Immersive Hero Header */}
      <div 
        onClick={() => {
          const heroImg = displayImages[0] || space.image;
          const idx = allImages.indexOf(heroImg);
          setLightboxIndex(idx !== -1 ? idx : 0);
          setZoomScale(1);
        }}
        className="relative w-full h-[85vh] md:h-[95vh] bg-black overflow-hidden cursor-zoom-in group"
      >
        <MediaRenderer 
          src={displayImages[0] || space.image} 
          alt={space.title} 
          className="w-full h-full opacity-80 group-hover:scale-105 transition-transform duration-1000"
          loading="eager"
          fetchpriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-24 pointer-events-none">
          <div className="max-w-7xl mx-auto w-full">
            <Link to="/space" className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 block text-white/60 hover:text-white transition-colors pointer-events-auto w-fit">
              <span className="inline-block mr-2">←</span> Back to Spaces
            </Link>
            <h1 className="text-[8.5vw] md:text-[7vw] font-medium uppercase tracking-tighter leading-[0.85] text-white mix-blend-lighten">
              {space.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Intro Text Container */}
      <div className="w-full px-4 md:px-8 lg:px-12 pt-12 md:pt-16 pb-8">
        <div className="max-w-4xl mb-12">
          <p className="text-xl md:text-3xl leading-relaxed font-serif italic text-ink/80 whitespace-pre-wrap">{space.description}</p>
        </div>
      </div>

      {/* Content Blocks (Editorial Section - Full-Bleed 2-Column Grid) */}
      {space.contentBlocks && space.contentBlocks.length > 0 && (
        <div className="w-full px-4 md:px-8 lg:px-12 py-12 border-t border-black/10">
          <div className="flex justify-between items-center mb-8 border-b border-black/10 pb-4">
            <h3 className="text-xs uppercase font-black tracking-[0.2em] text-cobalt font-mono">
              EDITORIAL STORY
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-ink/40 font-mono">
              {space.title}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-start w-full">
            {space.contentBlocks.map((block, idx) => {
              const textContent = block.caption || (block.type === 'text' ? block.value : '');
              const imageUrl = block.type === 'image' ? block.value : '';

              if (block.type === 'image' && imageUrl) {
                const targetIdx = allImages.indexOf(imageUrl);
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
                        src={imageUrl} 
                        alt={`Space view ${idx + 1}`} 
                        className="w-full h-full object-cover rounded-none shadow-none group-hover:scale-105 transition-transform duration-700" 
                        loading="lazy" 
                        nopin="nopin"
                      />
                    </div>
                    {textContent && (
                      <div className="mt-4">
                        <p className="text-xs sm:text-sm md:text-base font-sans leading-relaxed text-ink/80 text-center break-words max-w-full px-2">{textContent}</p>
                      </div>
                    )}
                  </div>
                );
              }

              if (block.type === 'text') {
                const len = block.value ? block.value.trim().length : 0;
                const textStyleClass = len < 40 
                  ? "text-lg sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-bold tracking-tighter leading-tight md:leading-[0.95]"
                  : len < 120 
                    ? "text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight leading-snug md:leading-tight"
                    : "text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-medium leading-relaxed";

                return (
                  <div key={idx} className="flex flex-col reveal py-8 md:py-16 w-full h-full min-h-[180px] md:min-h-[300px] justify-center items-center text-center my-auto px-4 sm:px-6 overflow-hidden max-w-full">
                    <p className={`w-full max-w-full [word-break:break-all] sm:[word-break:break-word] [overflow-wrap:anywhere] break-words whitespace-pre-wrap font-sans text-ink uppercase text-center mx-auto ${textStyleClass}`}>
                      {block.value}
                    </p>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {/* Applied Products */}
      {appliedProducts.length > 0 && (
        <div className="w-full px-4 md:px-8 lg:px-12 py-24 border-t border-black/10 reveal">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-16 gap-4">
            <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Shop the Space</h3>
            <p className="text-sm font-serif italic text-ink/40">Curated objects featured in this environment.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {appliedProducts.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="group block">
                <div className="aspect-[4/5] bg-silver/20 rounded-none overflow-hidden mb-4 border border-black/5">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <h4 className="text-sm font-bold tracking-tight mb-1 group-hover:text-cobalt transition-colors">{p.name}</h4>
                <p className="text-[10px] font-bold text-ink/30 uppercase tracking-widest">{p.category}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Spaces Carousel Slider Section */}
      {(() => {
        const getRelatedSpaces = () => {
          if (space.relatedSpaceIds && space.relatedSpaceIds.length > 0) {
            const explicit = allSpaces.filter(s => space.relatedSpaceIds?.includes(s.id));
            if (explicit.length > 0) return explicit;
          }
          const featured = allSpaces.filter(s => s.id !== space.id && s.featured);
          if (featured.length > 0) return featured;
          return allSpaces.filter(s => s.id !== space.id);
        };

        const relatedSpaces = getRelatedSpaces();
        if (relatedSpaces.length === 0) return null;

        const scrollSlider = (dir: 'left' | 'right') => {
          const el = document.getElementById('related-spaces-slider');
          if (el) {
            el.scrollBy({ left: dir === 'left' ? -350 : 350, behavior: 'smooth' });
          }
        };

        return (
          <div className="w-full px-4 md:px-8 lg:px-12 py-20 border-t border-black/10 reveal">
            <div className="flex justify-between items-end mb-8 border-b border-black/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cobalt block mb-1">Spaces</span>
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tighter">Explore Related Spaces</h3>
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
              id="related-spaces-slider"
              className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth snap-x pb-4"
            >
              {relatedSpaces.map(s => {
                const mediaUrl = s.image || (s.images && s.images[0]) || '';
                return (
                  <Link key={s.id} to={`/space/${s.id}`} className="group block w-[280px] md:w-[350px] flex-shrink-0 snap-start">
                    <div 
                      className="aspect-[4/3] bg-silver/20 rounded-none overflow-hidden isolate transform-gpu mb-3 border border-black/5 relative"
                      style={{ transform: 'translate3d(0, 0, 0)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', perspective: '1000px' }}
                    >
                      <MediaRenderer 
                        src={mediaUrl} 
                        alt={s.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none transform-gpu" 
                      />
                      {s.featured && (
                        <span className="absolute top-3 left-3 z-10 text-orange bg-black/40 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-orange/30">
                          ★ Featured
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold tracking-tight mb-1 group-hover:text-cobalt transition-colors uppercase truncate">{s.title}</h4>
                    <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest line-clamp-1">{s.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Footer Navigation */}
      <div className="p-12 md:p-32 border-t border-black/10 bg-off-white text-center">
        <Link to="/space" className="inline-flex items-center gap-6 text-4xl md:text-8xl font-black uppercase tracking-tighter hover:text-cobalt transition-all group">
          Next Space <MoveRight size={64} className="group-hover:translate-x-6 transition-transform" />
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
              {space.title} — {lightboxIndex + 1} / {allImages.length}
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
                alt={`${space.title} view ${lightboxIndex + 1}`}
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
