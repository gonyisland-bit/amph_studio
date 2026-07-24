import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, Product, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { ArrowRight, MoveRight } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";
import { APP_VERSION } from "../lib/version";

let hasShownSplash = false;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');

  const [showSplash, setShowSplash] = useState(() => {
    if ((window as any).__triggerSplash) {
      (window as any).__triggerSplash = false;
      return true;
    }
    return !hasShownSplash;
  });
  const [fadeSplash, setFadeSplash] = useState(false);

  useScrollReveal();

  useEffect(() => {
    getProducts().then(setProducts);
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

  useEffect(() => {
    if (!settings.heroSlides || settings.heroSlides.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % settings.heroSlides.length);
    }, (settings.heroTransitionSpeed || 5) * 1000);
    
    return () => clearInterval(interval);
  }, [settings.heroSlides, settings.heroTransitionSpeed]);

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
      <section className="relative w-full h-[55vh] md:h-[90vh] overflow-hidden bg-off-white flex flex-col md:flex-row border-b border-black/10">
        {settings.heroSlides?.map((slide, idx) => (
          <div 
            key={slide.id} 
            className={`absolute inset-0 flex flex-col md:flex-row transition-opacity duration-1000 ease-in-out ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
          >
            {/* Left Column: Brand Slogan & Info (Only visible on MD and above, on mobile it overlays over media) */}
            <div className="hidden md:flex md:w-[45%] bg-off-white flex-col justify-center px-12 lg:px-20 py-24 relative z-20 border-r border-black/10">
              <span className="caption-nano text-cobalt mb-6 block font-bold tracking-[0.3em]">
                {slide.subtitle || "Amph Original"}
              </span>
              <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9] text-ink display-huge">
                {(slide.title || "AMPH").split('\n').map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </h1>
              <p className="mt-8 text-sm font-serif italic text-ink/50 max-w-xs leading-relaxed">
                A study of architectural form, sensory texture, and raw functionality.
              </p>
            </div>

            {/* Right Column / Background: Media Container (Takes full width on mobile, 55% on desktop) */}
            <div className="w-full md:w-[55%] h-full relative overflow-hidden bg-black ml-auto">
              {slide.image && (
                <MediaRenderer 
                  src={slide.image} 
                  className="w-full h-full object-cover opacity-90 md:opacity-100" 
                  alt={slide.title}
                  loading="eager"
                  fetchpriority={idx === activeSlide ? "high" : "auto"}
                  key={slide.image}
                  playing={idx === activeSlide}
                />
              )}
              {/* Overlay for mobile readability & visual tone tuning */}
              <div className="absolute inset-0 bg-black/30 md:bg-black/5 mix-blend-multiply transition-all"></div>
            </div>

            {/* Mobile Slogan Overlay (only visible on mobile) */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:hidden">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/80 mb-3 block font-bold">
                {slide.subtitle}
              </span>
              <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9] text-white drop-shadow-lg mb-8">
                {(slide.title || "").split('\n').map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </h1>
            </div>
          </div>
        ))}
        
        {/* Slide Indicators - Positioned carefully relative to the split */}
        {settings.heroSlides?.length > 1 && (
          <div className="absolute bottom-12 left-12 md:left-[45%] md:ml-12 z-30 flex gap-4">
            {settings.heroSlides.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 transition-all duration-500 ${i === activeSlide ? 'w-16 bg-white md:bg-cobalt' : 'w-4 bg-white/30 md:bg-ink/20'}`}
              />
            ))}
          </div>
        )}
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
            
            featured.forEach((product, index) => {
              // 1. Philosophy card before index 2
              if (index === 2) {
                const card1 = settings.philosophy1 || defaultHomeSettings.philosophy1 || { title: 'Design Philosophy', quote: 'Form follows function, but also emotion. Sensory simplicity for modern architectural spaces.', author: '// AMPH ORIGINALS' };
                items.push(
                  <div key="philosophy-1" className="border-b border-r border-black/10 aspect-[4/5] p-8 lg:p-12 bg-ink text-white flex flex-col justify-between reveal w-full h-full">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold block mb-8">{card1.title}</span>
                    <blockquote className="text-lg md:text-xl lg:text-2xl font-serif italic font-light leading-relaxed my-auto text-white/90 pr-4">
                      "{card1.quote}"
                    </blockquote>
                    <span className="text-[9px] uppercase tracking-widest text-white/30 block mt-8">{card1.author}</span>
                  </div>
                );
              }

              // 2. Standard grid card (uniform 1-column size, images fully filling grid borders with overlap text)
              items.push(
                <Link 
                  to={`/product/${product.id}`}
                  key={product.id}
                  className="group border-b border-r border-black/10 aspect-[4/5] relative overflow-hidden flex flex-col reveal"
                >
                  {/* Category tag overlap on top-left */}
                  <div className="absolute top-6 left-6 z-20 pointer-events-none">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-white/90 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
                      {product.category}
                    </span>
                  </div>

                  {/* Product Name overlap on bottom-left */}
                  <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
                    <h2 className="text-sm md:text-base font-bold font-sans tracking-tight leading-tight text-white drop-shadow-md group-hover:text-cobalt transition-colors">
                      {product.name}
                    </h2>
                  </div>
                  
                  <div className="absolute inset-0 w-full h-full bg-silver/5 overflow-hidden rounded-none">
                    {/* Primary Image with hover swap */}
                    <MediaRenderer 
                      src={product.images?.[0] || ''} 
                      alt={product.name} 
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${product.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`}
                      loading="lazy"
                      nopin="nopin"
                    />
                    {/* Secondary Hover Image */}
                    {product.hoverImages?.[0] && (
                      <MediaRenderer 
                        src={product.hoverImages[0]} 
                        alt={`${product.name} alternative view`}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-1000 ease-in-out group-hover:opacity-100 group-hover:scale-100 scale-95"
                        loading="lazy"
                        nopin="nopin"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/[0.08] group-hover:bg-black/30 transition-all duration-700 z-10 pointer-events-none" />
                  </div>
                </Link>
              );

              // 3. Philosophy card before index 4
              if (index === 4) {
                const card2 = settings.philosophy2 || defaultHomeSettings.philosophy2 || { title: 'Materiality', quote: 'Materials tell stories. Raw timber, hand-finished steel, sensory wool, and architectural tension.', author: '// HONEST CRAFT' };
                items.push(
                  <div key="philosophy-2" className="border-b border-r border-black/10 aspect-[4/5] p-8 lg:p-12 bg-silver/10 text-ink flex flex-col justify-between reveal w-full h-full">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-ink/40 font-bold block mb-8">{card2.title}</span>
                    <blockquote className="text-lg md:text-xl lg:text-2xl font-serif italic font-light leading-relaxed my-auto text-ink/80 pr-4">
                      "{card2.quote}"
                    </blockquote>
                    <span className="text-[9px] uppercase tracking-widest text-ink/30 block mt-8">{card2.author}</span>
                  </div>
                );
              }
            });

            return items;
          })()}
        </div>
      </section>

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
