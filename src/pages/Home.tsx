import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, getSpaces, getJournals, Product, SpaceModel, JournalArticle, getHomeSettings, HomeSettings, defaultHomeSettings, HomeShowcaseItem } from "../lib/data";
import { ArrowRight, MoveRight, Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { ImageHotspots } from "../components/ImageHotspots";
import { useWishlist } from "../lib/wishlist";
import { useScrollReveal } from "../lib/useScrollReveal";
import { APP_VERSION } from "../lib/version";

let hasShownSplash = false;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [activeShowcaseIdx, setActiveShowcaseIdx] = useState(0);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const { toggle: toggleWishlist, isSaved } = useWishlist();

  const [showSplash, setShowSplash] = useState(() => {
    if ((window as any).__triggerSplash) {
      (window as any).__triggerSplash = false;
      return true;
    }
    return !hasShownSplash;
  });
  const [fadeSplash, setFadeSplash] = useState(false);

  useScrollReveal([products, spaces, journals, settings]);

  useEffect(() => {
    getProducts().then(setProducts);
    getSpaces().then(setSpaces);
    getJournals().then(setJournals);
    getHomeSettings().then(setSettings);
    document.title = "Home — Amph";
    
    const checkAuth = () => setIsAuth(localStorage.getItem('admin_auth') === 'true');
    window.addEventListener('admin_auth_change', checkAuth);
    return () => window.removeEventListener('admin_auth_change', checkAuth);
  }, []);

  useEffect(() => {
    if (showSplash) {
      hasShownSplash = true;
      window.scrollTo(0, 0);
      const timer = setTimeout(() => {
        setFadeSplash(true);
        const removeTimer = setTimeout(() => {
          setShowSplash(false);
        }, 200);
        return () => clearTimeout(removeTimer);
      }, 300);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [showSplash]);

  useEffect(() => {
    // Preload first hero image for LCP optimization and smoother paint
    if (settings.heroSlides && settings.heroSlides[0]?.image) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = settings.heroSlides[0].image.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) ? 'video' : 'image';
      link.href = settings.heroSlides[0].image;
      document.head.appendChild(link);
      return () => {
        try {
          document.head.removeChild(link);
        } catch(e) {}
      };
    }
  }, [settings.heroSlides]);

  const featured = settings.featuredProductIds
    .map(id => products.find(p => p.id === id))
    .filter((p): p is Product => p !== undefined);

  const [activeSlide, setActiveSlide] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  const transitionDuration = (settings.heroTransitionSpeed || 5) * 1000;
  const slideCount = settings.heroSlides?.length || 0;

  useEffect(() => {
    if (!settings.heroSlides || settings.heroSlides.length <= 1) {
      setSlideProgress(0);
      return;
    }
    
    if (isHeroHovered) return;

    const stepMs = 50;
    const progressIncrement = (stepMs / transitionDuration) * 100;

    const interval = setInterval(() => {
      setSlideProgress(prev => {
        if (prev + progressIncrement >= 100) {
          setActiveSlide(curr => (curr + 1) % slideCount);
          return 0;
        }
        return prev + progressIncrement;
      });
    }, stepMs);
    
    return () => clearInterval(interval);
  }, [settings.heroSlides, transitionDuration, slideCount, isHeroHovered]);

  const handleSelectSlide = (idx: number) => {
    setActiveSlide(idx);
    setSlideProgress(0);
    setIsHeroHovered(false);
  };

  return (
    <div className="flex flex-col flex-grow w-full bg-off-white overflow-hidden">
      {showSplash && (
        <div 
          className={`fixed inset-0 z-[9999] bg-cobalt flex flex-col justify-between p-12 transition-opacity duration-500 ease-in-out pointer-events-none ${
            fadeSplash ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div></div>
          <div className="text-center text-white space-y-4">
            <h1 className="text-7xl md:text-9xl font-bold uppercase tracking-tighter animate-in fade-in zoom-in-95 duration-1000">
              AMPH
            </h1>
            <p className="text-xs md:text-sm uppercase tracking-[0.4em] font-light text-white/80 font-sans">
              amplify your ordinary
            </p>
          </div>
          <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-white/50 font-bold font-sans">
            <div>Casual Uniqueness</div>
            <div>{APP_VERSION}</div>
          </div>
        </div>
      )}

      {isAuth && null}

      {/* 1. Hero Section: Editorial Slideshow (Split-screen on desktop) */}
      <section className="relative w-full h-[80vh] md:h-[90vh] overflow-hidden bg-off-white flex flex-col md:flex-row border-b border-black/10 select-none group/hero">
        {settings.heroSlides?.map((slide, idx) => {
          const isActive = idx === activeSlide;
          return (
            <div 
              key={slide.id} 
              className={`absolute inset-0 flex flex-col md:flex-row transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              {/* Left Column: Brand Slogan, Info & Action CTA (Desktop) */}
              <div className="hidden md:flex md:w-[45%] bg-off-white flex-col justify-center px-12 lg:px-20 py-24 relative z-20 border-r border-black/10">
                {isActive && (
                  <div key={`desktop-hero-text-${activeSlide}`} className="flex flex-col">
                    <span className="caption-nano text-cobalt mb-6 block font-bold tracking-[0.3em] animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
                      {slide.subtitle || "Amph Original"}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9] text-ink display-huge animate-in fade-in slide-in-from-bottom-4 duration-600 delay-150 fill-mode-both">
                      {(slide.title || "AMPH").split('\n').map((line, i) => (
                        <span key={i} className="block">{line}</span>
                      ))}
                    </h1>
                    <p className="mt-8 text-sm font-serif italic text-ink/60 max-w-xs leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-600 delay-300 fill-mode-both">
                      A study of architectural form, sensory texture, and raw functionality.
                    </p>
                    <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-600 delay-450 fill-mode-both">
                      <Link 
                        to="/collection"
                        className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-ink hover:text-cobalt group/cta transition-all w-fit cursor-pointer py-1"
                      >
                        <span>Explore Collection</span>
                        <ArrowRight size={14} className="group-hover/cta:translate-x-1.5 transition-transform text-cobalt" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column / Background: Media Container (Takes full width on mobile, 55% on desktop - Hover pause scoped here) */}
              <div 
                className="w-full md:w-[55%] h-full relative overflow-hidden bg-black ml-auto"
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setIsHeroHovered(true);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse') setIsHeroHovered(false);
                }}
              >
                {slide.image && (
                  <MediaRenderer 
                    src={slide.image} 
                    className="w-full h-full object-cover opacity-90 md:opacity-100 transition-transform duration-[8000ms] ease-out scale-100 group-hover/hero:scale-105" 
                    alt={slide.title}
                    loading="eager"
                    fetchpriority={isActive ? "high" : "auto"}
                    key={slide.image}
                    playing={isActive}
                  />
                )}
                {/* Overlay for mobile readability & visual tone tuning */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 md:bg-black/5 md:mix-blend-multiply transition-all"></div>
              </div>

              {/* Mobile Slogan Overlay (only visible on mobile) */}
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 pb-20 md:hidden">
                {isActive && (
                  <div key={`mobile-hero-text-${activeSlide}`} className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/80 mb-3 block font-bold animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
                      {slide.subtitle}
                    </span>
                    <h1 className="text-4xl sm:text-5xl font-medium tracking-tighter uppercase leading-[0.9] text-white drop-shadow-lg mb-6 animate-in fade-in slide-in-from-bottom-4 duration-600 delay-150 fill-mode-both">
                      {(slide.title || "").split('\n').map((line, i) => (
                        <span key={i} className="block">{line}</span>
                      ))}
                    </h1>
                    <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-600 delay-300 fill-mode-both">
                      <Link 
                        to="/collection"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-ink text-[10px] font-black uppercase tracking-widest hover:bg-cobalt hover:text-white transition-all w-fit rounded-none shadow-md"
                      >
                        <span>Explore Collection</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Slide Indicators: Time-based Progress Bars (Unified High-Contrast White Theme) */}
        {slideCount > 1 && (
          <div className="absolute bottom-8 left-8 md:bottom-12 md:left-[45%] md:ml-12 z-30 flex items-center gap-3">
            {settings.heroSlides.map((_, i) => {
              const isCurrent = i === activeSlide;
              const isPast = i < activeSlide;

              return (
                <button 
                  key={i} 
                  type="button"
                  onClick={() => handleSelectSlide(i)}
                  className="group/indicator relative h-1 md:h-1.5 w-12 sm:w-16 md:w-20 bg-white/30 backdrop-blur-xs rounded-full overflow-hidden transition-all duration-300 cursor-pointer p-0 border-0 outline-none"
                  title={`Go to slide ${i + 1}`}
                  aria-label={`Slide ${i + 1}`}
                >
                  <div 
                    className={`absolute inset-y-0 left-0 transition-all duration-75 rounded-full ${
                      isCurrent 
                        ? 'bg-white shadow-xs' 
                        : isPast 
                          ? 'w-full bg-white/75' 
                          : 'w-0'
                    }`}
                    style={isCurrent ? { width: `${slideProgress}%` } : undefined}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-30 flex items-center gap-2 pointer-events-none text-white/90 text-[10px] font-mono font-bold tracking-widest uppercase">
          <span className="drop-shadow-md">Scroll</span>
          <span className="inline-block animate-bounce text-sm drop-shadow-md">↓</span>
        </div>
      </section>

      {/* 2. Selected Works (Featured Products) - Now directly after Hero slider */}
      <section className="px-8 md:px-20 py-32 md:py-48 bg-off-white">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-24 gap-8">
          <h2 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9]">Selected<br/>Works</h2>
          <p className="text-sm md:text-sm font-light tracking-wide text-ink/50 font-sans max-w-sm">A rhythmic display of industrial aesthetics and vivid comfort.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-black/10 auto-rows-fr">
          {(() => {
            const items: React.ReactNode[] = [];
            
            const magazineCardsList = settings.magazineCards && settings.magazineCards.length > 0
              ? settings.magazineCards
              : [
                  { id: 'mag-1', title: settings.philosophy1?.title || 'Design Philosophy', quote: settings.philosophy1?.quote || 'Form follows function, but also emotion. Sensory simplicity for modern architectural spaces.', author: settings.philosophy1?.author || '// AMPH ORIGINALS', insertAfterIndex: 2, image: '' },
                  { id: 'mag-2', title: settings.philosophy2?.title || 'Materiality', quote: settings.philosophy2?.quote || 'Materials tell stories. Raw timber, hand-finished steel, sensory wool, and architectural tension.', author: settings.philosophy2?.author || '// HONEST CRAFT', insertAfterIndex: 4, image: '' }
                ];

            featured.forEach((product, index) => {
              const productPosition = index + 1;

              // Standard product grid card
              items.push(
                <Link 
                  to={`/product/${product.id}`}
                  key={product.id}
                  className="group border-b border-r border-black/10 aspect-[4/5] relative overflow-hidden flex flex-col reveal"
                >
                  <div className="absolute top-6 left-6 z-20 pointer-events-none">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-white/90 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
                      {product.category}
                    </span>
                  </div>

                  {/* Wishlist Bookmark Button on top-right */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}
                    className={`absolute top-5 right-5 z-30 p-2 rounded-full backdrop-blur-md transition-all duration-300 cursor-pointer ${
                      isSaved(product.id)
                        ? 'bg-cobalt text-white shadow-md opacity-100'
                        : 'bg-black/30 text-white/80 hover:text-white hover:bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isSaved(product.id) ? "Remove from Saved" : "Save to Wishlist"}
                    aria-label="Save to Wishlist"
                  >
                    <Bookmark size={13} className={isSaved(product.id) ? "fill-current" : ""} />
                  </button>

                  <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
                    <h2 className="text-sm md:text-base font-bold font-sans tracking-tight leading-tight text-white drop-shadow-md group-hover:text-cobalt transition-colors">
                      {product.name}
                    </h2>
                  </div>
                  
                  <div className="absolute inset-0 w-full h-full bg-silver/5 overflow-hidden rounded-none">
                    <MediaRenderer 
                      src={product.images?.[0] || ''} 
                      alt={product.name} 
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out scale-100 ${product.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`}
                      loading="lazy"
                      nopin="nopin"
                    />
                    {product.hoverImages?.[0] && (
                      <MediaRenderer 
                        src={product.hoverImages[0]} 
                        alt={`${product.name} alternative view`}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-1000 ease-in-out scale-100 group-hover:opacity-100 group-hover:scale-105"
                        loading="lazy"
                        nopin="nopin"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent z-10 pointer-events-none" />
                  </div>
                </Link>
              );

              // Check if any magazine card should be inserted AFTER this product
              const matchedCards = magazineCardsList.filter(mag => Number(mag.insertAfterIndex) === productPosition);
              matchedCards.forEach((card, mIdx) => {
                const isEven = (index + mIdx) % 2 === 0;
                const mode = (card.overlayMode || 'DARK').toUpperCase();
                
                // Color & Theme calculations based on overlayMode (DARK, LIGHT, OFF)
                let bgContainerClass = isEven ? 'bg-ink text-white' : 'bg-silver/10 text-ink';
                let titleClass = isEven ? 'text-white/50' : 'text-ink/50';
                let quoteClass = isEven ? 'text-white' : 'text-ink';
                let authorClass = isEven ? 'text-white/40' : 'text-ink/40';
                
                if (mode === 'LIGHT') {
                  bgContainerClass = 'bg-white text-ink';
                  titleClass = 'text-ink/60';
                  quoteClass = 'text-ink';
                  authorClass = 'text-ink/50';
                } else if (mode === 'DARK' || card.image) {
                  bgContainerClass = 'bg-black text-white';
                  titleClass = 'text-white/60';
                  quoteClass = 'text-white';
                  authorClass = 'text-white/50';
                }

                const customStyle: React.CSSProperties = card.bgColor ? { backgroundColor: card.bgColor } : {};

                items.push(
                  <div 
                    key={`mag-card-${card.id || mIdx}-${index}`} 
                    className={`border-b border-r border-black/10 aspect-[4/5] p-6 sm:p-8 lg:p-10 ${bgContainerClass} flex flex-col justify-between reveal w-full h-full relative overflow-hidden`}
                    style={customStyle}
                  >
                    {/* Cover Media & Overlay Dimming (DARK, LIGHT, OFF) */}
                    {card.image && (
                      <div className="absolute inset-0 w-full h-full z-0">
                        <MediaRenderer 
                          src={card.image} 
                          alt={card.title} 
                          className="w-full h-full object-cover" 
                        />
                        {mode === 'DARK' && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[0.5px]" />
                        )}
                        {mode === 'LIGHT' && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-[0.5px]" />
                        )}
                      </div>
                    )}
                    
                    {/* Content Layer (Main Bold Title Typography filled inside grid) */}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-0">
                      <span className={`text-[9px] sm:text-[10px] uppercase tracking-[0.25em] font-black block mb-4 shrink-0 ${titleClass}`}>
                        {card.title}
                      </span>
                      <div className="my-auto overflow-hidden py-1">
                        <blockquote className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-sans font-black uppercase tracking-tighter leading-[1.05] pr-1 sm:pr-2 break-words ${quoteClass}`}>
                          "{card.quote}"
                        </blockquote>
                      </div>
                      <span className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-bold block mt-4 shrink-0 ${authorClass}`}>
                        {card.author}
                      </span>
                    </div>
                  </div>
                );
              });
            });

            return items;
          })()}
        </div>
      </section>

      {/* 2.5. Interactive Lookbook Showcase (Shop the Space / Journal / Custom Multi-Lookbook) */}
      {(() => {
        const showcaseConfig = settings.showcase || defaultHomeSettings.showcase;
        if (showcaseConfig?.enabled === false) return null;

        // Collect items list
        const rawItems: HomeShowcaseItem[] = (showcaseConfig?.items && showcaseConfig.items.length > 0)
          ? showcaseConfig.items
          : [
              {
                id: 'showcase-default',
                sourceType: showcaseConfig?.spaceId ? 'space' : 'custom',
                targetId: showcaseConfig?.spaceId || spaces[0]?.id || '',
                selectedImage: showcaseConfig?.image || spaces[0]?.image || '',
                title: showcaseConfig?.title || 'Shop The Space',
                subtitle: showcaseConfig?.subtitle || 'Spatial Curation',
                description: showcaseConfig?.description || 'Explore objects placed in real architectural context. Hover or tap the interactive pins to preview details.',
                image: showcaseConfig?.image || '',
                hotspots: showcaseConfig?.hotspots || spaces[0]?.hotspots || []
              }
            ];

        // Process resolved items
        const resolvedItems = rawItems.map(item => {
          let resolvedImg = item.selectedImage || item.image || '';
          let resolvedHotspots = item.hotspots || [];
          let resolvedTitle = item.title;
          let resolvedSubtitle = item.subtitle || 'Spatial Curation';
          let resolvedDesc = item.description || 'Explore objects placed in real architectural context. Hover or tap the interactive pins to preview details.';
          let targetLink = '/collection';

          if (item.sourceType === 'space') {
            const sp = spaces.find(s => s.id === item.targetId) || spaces[0];
            if (sp) {
              if (!resolvedImg) resolvedImg = sp.image || sp.images?.[0] || '';
              if (resolvedHotspots.length === 0) {
                const matchingBlock = (sp.contentBlocks || []).find(b => b.value === resolvedImg && b.hotspots && b.hotspots.length > 0);
                resolvedHotspots = matchingBlock?.hotspots || (resolvedImg === sp.image ? (sp.hotspots || []) : []);
              }
              if (!resolvedTitle) resolvedTitle = sp.title || 'Shop The Space';
              targetLink = `/space/${sp.id}`;
            }
          } else if (item.sourceType === 'journal') {
            const jn = journals.find(j => j.id === item.targetId) || journals[0];
            if (jn) {
              if (!resolvedImg) resolvedImg = jn.image || '';
              if (resolvedHotspots.length === 0) {
                const matchingBlock = (jn.contentBlocks || []).find(b => b.value === resolvedImg && b.hotspots && b.hotspots.length > 0);
                resolvedHotspots = matchingBlock?.hotspots || (resolvedImg === jn.image ? (jn.hotspots || []) : []);
              }
              if (!resolvedTitle) resolvedTitle = jn.title || 'Featured Story';
              resolvedSubtitle = item.subtitle || 'Editorial Journal';
              targetLink = `/journal/${jn.id}`;
            }
          }

          if (!resolvedImg) {
            const fallbackSpace = spaces.find(s => s.image) || spaces[0];
            if (fallbackSpace) {
              resolvedImg = fallbackSpace.image || fallbackSpace.images?.[0] || '';
              if (resolvedHotspots.length === 0) resolvedHotspots = fallbackSpace.hotspots || [];
              if (!resolvedTitle) resolvedTitle = fallbackSpace.title || 'Shop The Space';
              targetLink = `/space/${fallbackSpace.id}`;
            }
          }

          return {
            ...item,
            image: resolvedImg,
            hotspots: resolvedHotspots,
            title: resolvedTitle || 'Shop The Space',
            subtitle: resolvedSubtitle,
            description: resolvedDesc,
            targetLink
          };
        }).filter(item => Boolean(item.image));

        if (resolvedItems.length === 0) return null;

        const currentIdx = Math.min(activeShowcaseIdx, resolvedItems.length - 1);
        const currentItem = resolvedItems[currentIdx];

        return (
          <section className="bg-white border-t border-black/10 flex flex-col reveal group/showcase-sec">
            <div className="px-8 md:px-20 py-16 md:py-24 flex flex-col md:flex-row justify-between items-baseline gap-6 border-b border-black/10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="caption-nano text-cobalt font-bold tracking-[0.3em] block">
                    {currentItem.subtitle}
                  </span>
                  {resolvedItems.length > 1 && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink/40 bg-black/5 px-2 py-0.5">
                      {String(currentIdx + 1).padStart(2, '0')} / {String(resolvedItems.length).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <h2 className="text-3xl md:text-5xl font-medium tracking-tighter uppercase leading-[0.9]">
                  {currentItem.title}
                </h2>
              </div>
              <div className="flex flex-col md:items-end gap-4 max-w-md">
                <p className="text-sm font-serif italic text-ink/60 leading-relaxed">
                  {currentItem.description}
                </p>

                {/* Left/Right Lookbook Navigation Controls */}
                {resolvedItems.length > 1 && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveShowcaseIdx(prev => (prev === 0 ? resolvedItems.length - 1 : prev - 1))}
                      className="w-8 h-8 rounded-none border border-black/20 flex items-center justify-center text-ink hover:bg-cobalt hover:text-white hover:border-cobalt transition-colors cursor-pointer"
                      title="Previous Lookbook"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="flex items-center gap-1 px-2">
                      {resolvedItems.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          type="button"
                          onClick={() => setActiveShowcaseIdx(dotIdx)}
                          className={`h-1.5 transition-all cursor-pointer ${
                            dotIdx === currentIdx ? 'w-6 bg-cobalt' : 'w-1.5 bg-black/20 hover:bg-black/40'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveShowcaseIdx(prev => (prev === resolvedItems.length - 1 ? 0 : prev + 1))}
                      className="w-8 h-8 rounded-none border border-black/20 flex items-center justify-center text-ink hover:bg-cobalt hover:text-white hover:border-cobalt transition-colors cursor-pointer"
                      title="Next Lookbook"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Immersive Hotspot Space Showcase with Dynamic Pins & Slide Transition */}
            <div className="w-full bg-black relative">
              <div 
                key={`home-showcase-${currentItem.id}-${currentIdx}-${currentItem.image}`}
                className="w-full h-[55vh] sm:h-[65vh] md:h-[80vh] relative overflow-hidden animate-in fade-in duration-500"
              >
                <ImageHotspots 
                  src={currentItem.image}
                  alt={currentItem.title}
                  hotspots={currentItem.hotspots}
                  products={products}
                  className="w-full h-full"
                  imageClassName="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
                
                {/* Floating Bottom Info & Full Page CTA */}
                <div className="absolute bottom-6 left-6 md:bottom-12 md:left-16 z-20 pointer-events-none">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/70 block mb-2 font-mono drop-shadow-sm">
                    LOOKBOOK // {currentItem.title}
                  </span>
                  <Link
                    to={currentItem.targetLink}
                    className="inline-flex items-center gap-3 px-5 py-2.5 bg-white text-ink text-[10px] font-black uppercase tracking-widest hover:bg-cobalt hover:text-white transition-all pointer-events-auto rounded-none shadow-lg group/space-btn"
                  >
                    <span>
                      {currentItem.sourceType === 'journal' ? 'Read Full Story' : 'Explore Full Space'}
                    </span>
                    <ArrowRight size={12} className="group-hover/space-btn:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Floating Left/Right Arrow Overlays on the image for quick browsing */}
                {resolvedItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveShowcaseIdx(prev => (prev === 0 ? resolvedItems.length - 1 : prev - 1));
                      }}
                      className="absolute top-1/2 left-4 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-cobalt text-white backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover/showcase-sec:opacity-100 transition-all cursor-pointer shadow-lg"
                      title="Previous Lookbook"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveShowcaseIdx(prev => (prev === resolvedItems.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute top-1/2 right-4 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-cobalt text-white backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover/showcase-sec:opacity-100 transition-all cursor-pointer shadow-lg"
                      title="Next Lookbook"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* 3. Curated Gallery / Magazine Intros - Placed after Selected Works, border-aligned & padding-optimized */}
      <section className="flex flex-col bg-white border-t border-black/10 px-0 py-0">
        <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-fr border-b border-black/10">
          {[
            { key: 'collection', link: '/collection' },
            { key: 'space', link: '/space' },
            { key: 'journal', link: '/journal' }
          ].map((item, idx) => {
            const intro = settings.intros?.[item.key as keyof typeof settings.intros] || { title: item.key, description: '', image: '' };
            
            return (
              <Link 
                key={item.key} 
                to={item.link}
                className="group border-r last:border-r-0 border-black/10 flex flex-col pt-0 pb-16 px-0 relative hover:bg-off-white transition-all duration-700 reveal h-full"
              >
                {/* 100% Grid-filling image with no borders and rounded corners */}
                <div className="w-full aspect-[16/10] md:aspect-[4/3] overflow-hidden rounded-none bg-silver/10 relative mb-12 border-b border-black/10">
                  {intro.image ? (
                    <MediaRenderer 
                      src={intro.image} 
                      className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" 
                      alt={intro.title} 
                      loading="lazy"
                      nopin="nopin"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink/10 font-black text-4xl">AMPH</div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-700"></div>
                </div>
                
                {/* Content Area with refined font and size */}
                <div className="flex-grow w-full flex flex-col px-8 md:px-12 justify-between">
                  <div>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-cobalt mb-6 block">
                      0{idx + 1} // {item.key}
                    </span>
                    <h3 className="text-3xl md:text-2xl lg:text-3xl xl:text-5xl 2xl:text-6xl font-medium tracking-tighter uppercase mb-6 leading-[0.9] group-hover:text-cobalt transition-colors display-huge break-words">
                      {intro.title}
                    </h3>
                    <p className="text-xs lg:text-sm font-serif text-ink/60 max-w-sm mb-8 leading-relaxed">
                      {intro.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest group-hover:gap-10 transition-all mt-6">
                    <span>Enter Experience</span>
                    <ArrowRight size={20} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Footer Call to Action */}
      <section className="px-6 md:px-14 py-40 border-t border-black/10 bg-white text-center">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-widest font-bold text-cobalt mb-8 block">Next Chapter</span>
          <div className="flex flex-col gap-12">
            <Link to="/collection" className="inline-flex items-center justify-center gap-4 text-4xl md:text-6xl font-medium uppercase tracking-tighter hover:text-cobalt transition-colors group">
              Explore Collection <MoveRight size={48} className="group-hover:translate-x-4 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Marquee */}
      <div className="w-full py-12 border-t border-black/10 bg-white overflow-hidden flex items-center">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="text-4xl md:text-6xl font-black uppercase tracking-tighter px-12 flex items-center gap-12 text-ink/5">
              {settings.marquee}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
