import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getProducts, Product, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);

  useEffect(() => {
    getProducts().then(setProducts);
    getHomeSettings().then(setSettings);
  }, []);

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
      
      {/* 1. Hero Section: Editorial Slideshow */}
      <section className="relative w-full h-[90vh] overflow-hidden">
        {settings.heroSlides?.map((slide, idx) => (
          <div 
            key={slide.id} 
            className={`absolute inset-0 flex flex-col justify-center px-6 md:px-14 transition-opacity duration-1000 ease-in-out ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <div className="absolute inset-0">
              <img 
                src={slide.image || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2158&auto=format&fit=crop'} 
                className="w-full h-full object-cover" 
                alt={slide.title}
              />
              <div className="absolute inset-0 bg-black/10"></div>
            </div>
            
            <div className="z-20 relative mt-auto mb-12">
              <span className="text-[11px] uppercase tracking-[0.2em] text-white mb-4 block font-bold drop-shadow-sm">{slide.subtitle}</span>
              <h1 className="text-[14vw] leading-[0.8] font-black tracking-tighter text-white drop-shadow-2xl mix-blend-difference">
                {slide.title.split('\n').map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </h1>
            </div>
          </div>
        ))}
        
        {/* Slide Indicators */}
        {settings.heroSlides?.length > 1 && (
          <div className="absolute bottom-12 right-12 z-30 flex gap-4">
            {settings.heroSlides.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setActiveSlide(i)}
                className={`h-1 transition-all duration-500 ${i === activeSlide ? 'w-12 bg-white' : 'w-4 bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. Intro Section: Enhanced Tabs Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-black/10 bg-white overflow-hidden">
        {[
          { key: 'collection', link: '/shop' },
          { key: 'space', link: '/space' },
          { key: 'journal', link: '/journal' }
        ].map((item) => {
          const intro = settings.intros?.[item.key as keyof typeof settings.intros] || { title: item.key, description: '', image: '' };
          return (
            <Link key={item.key} to={item.link} className="group border-r border-black/10 p-10 md:p-14 flex flex-col justify-between hover:bg-black/5 transition-all duration-700 relative overflow-hidden h-[500px] md:h-[600px]">
              <div className="z-10">
                <h3 className="text-5xl font-black uppercase tracking-tighter mb-4 group-hover:text-cobalt transition-colors">{intro.title}</h3>
                <p className="text-lg font-serif italic text-ink/80 max-w-[240px] group-hover:text-ink transition-colors">{intro.description}</p>
              </div>
              
              {/* Background Image - Always Visible, Scaling on Hover */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={intro.image} 
                  className="w-full h-full object-cover opacity-30 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 mix-blend-multiply" 
                  alt="" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/20 to-transparent group-hover:from-transparent transition-colors duration-700"></div>
              </div>

              <div className="mt-auto z-10 flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] border-b-2 border-ink pb-1 group-hover:border-cobalt group-hover:text-cobalt transition-all">Explore {intro.title}</span>
                <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform group-hover:text-cobalt" />
              </div>
            </Link>
          );
        })}
      </section>

      {/* 3. Magazine Section: Featured Products */}
      <section className="px-6 md:px-14 py-24 md:py-40 bg-off-white">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-24 gap-8">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.8]">Selected<br/>Works</h2>
          <p className="text-xl md:text-2xl font-serif italic text-ink/60 max-w-sm">A rhythmic display of industrial aesthetics and vivid comfort.</p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-12 space-y-20">
          {featured.map((product, index) => {
            const isWide = index % 4 === 0;
            return (
              <Link 
                to={`/product/${product.id}`}
                key={product.id}
                className={`group relative block break-inside-avoid transition-all duration-700`}
              >
                <div className="relative overflow-hidden mb-8 aspect-[4/5] bg-silver/20 rounded-[4px]">
                  <img 
                    src={product.images?.[0] || ''} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-1000 scale-100 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/5 transition-colors duration-500"></div>
                  
                  {/* Subtle index number */}
                  <div className="absolute top-6 left-6 text-[10px] font-bold text-white/40 group-hover:text-white transition-colors">
                    0{index + 1}
                  </div>
                </div>
                
                <div className="flex flex-col border-l border-black/10 pl-6">
                  <span className="text-[10px] uppercase font-bold tracking-tighter text-orange font-sans mb-1">
                    {product.category}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold font-sans tracking-tight leading-tight group-hover:text-cobalt transition-colors mb-2">
                    {product.name}
                  </h2>
                  <p className="text-xs font-serif italic text-ink/60">{product.subTitle}</p>
                </div>
              </Link>
            );
          })}
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
