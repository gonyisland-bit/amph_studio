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
                src={slide.image || ''} 
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

      {/* 2. Intro Section: Trendy Banner Layout */}
      <section className="flex flex-col border-b border-black/10 bg-white">
        {[
          { key: 'collection', link: '/shop' },
          { key: 'space', link: '/space' },
          { key: 'journal', link: '/journal' }
        ].map((item, idx) => {
          const intro = settings.intros?.[item.key as keyof typeof settings.intros] || { title: item.key, description: '', image: '' };
          const isEven = idx % 2 === 0;
          
          return (
            <Link 
              key={item.key} 
              to={item.link} 
              className={`group flex flex-col md:flex-row h-auto md:h-[45vh] border-b last:border-b-0 border-black/5 relative overflow-hidden transition-colors hover:bg-black/[0.02]`}
            >
              {/* Content Side */}
              <div className={`flex-1 p-8 md:p-16 flex flex-col justify-center z-10 ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cobalt mb-4 block">0{idx + 1} // {item.key}</span>
                <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 leading-[0.9]">{intro.title}</h3>
                <p className="text-lg md:text-xl font-serif italic text-ink/70 max-w-md mb-8">{intro.description}</p>
                <div className="flex items-center gap-4 group-hover:gap-6 transition-all duration-500">
                  <span className="text-[11px] font-bold uppercase tracking-widest border-b-2 border-cobalt pb-1">Enter Experience</span>
                  <ArrowRight size={16} className="text-cobalt" />
                </div>
              </div>
              
              {/* Image Side */}
              <div className={`flex-[1.2] relative h-[300px] md:h-full overflow-hidden ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                <img 
                  src={intro.image} 
                  className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" 
                  alt={intro.title} 
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-700"></div>
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
