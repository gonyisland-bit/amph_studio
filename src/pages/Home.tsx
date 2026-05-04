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

  return (
    <div className="flex flex-col flex-grow w-full overflow-hidden relative">
      <div className="flex flex-col lg:flex-row flex-grow w-full border-b border-black/10">
        
        {/* Left Side: Editorial Typography & Marquee */}
        <section className="flex-1 p-8 md:p-14 mb-[80px] lg:mb-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black/10 relative">
          <div className="z-10 relative">
            <span className="text-[11px] uppercase tracking-widest text-ink/60 mb-6 block font-sans whitespace-pre-wrap">{settings.subtitle}</span>
            <h1 className="text-[15vw] lg:text-[7.5vw] leading-[0.85] font-black tracking-tighter mb-8 font-sans whitespace-pre-wrap">
              {settings.title}
            </h1>
            <p className="text-xl md:text-2xl leading-relaxed max-w-[360px] font-serif italic text-ink/80 border-l border-ink/20 pl-4 whitespace-pre-wrap">
              {settings.description}
            </p>
          </div>

          <div className="hidden lg:flex w-full h-[60px] absolute bottom-0 left-0 border-t border-black/10 bg-off-white overflow-hidden items-center z-20">
            <div className="flex whitespace-nowrap animate-marquee">
              {[...Array(6)].map((_, i) => (
                <span key={i} className="text-xs uppercase tracking-widest font-semibold font-sans px-8 flex items-center gap-8">
                  {settings.marquee} <ArrowRight size={14} className="text-orange" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side: Featured Products Magazine Layout */}
        <section className="flex-[1.4] p-6 lg:p-16 bg-white overflow-y-auto">
          {featured.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-ink/40 font-serif italic">No featured products selected.</div>
          ) : (
            <div className="columns-1 sm:columns-2 gap-12 space-y-16">
              {featured.map((product, index) => {
                const isEven = index % 2 === 0;
                
                return (
                  <Link 
                    to={`/product/${product.id}`}
                    key={product.id}
                    className={`group relative block break-inside-avoid transition-all duration-700 ${isEven ? 'mt-0' : 'mt-12 sm:mt-24'}`}
                  >
                    <div className="relative overflow-hidden mb-4">
                      <img 
                        src={product.images?.[0] || ''} 
                        alt={product.name} 
                        className="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-ink/5 group-hover:bg-transparent transition-colors duration-500"></div>
                    </div>
                    
                    <div className="flex justify-between items-end border-b border-black/10 pb-2">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-tighter text-orange font-sans block mb-1">
                          {product.category}
                        </span>
                        <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight leading-tight group-hover:text-cobalt transition-colors">
                          {product.name}
                        </h2>
                        <p className="text-[10px] font-serif italic text-ink/60 mt-1">{product.subTitle}</p>
                      </div>
                      <div className="text-[10px] font-bold text-ink/40 mb-1">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

       {/* Mobile Marquee */}
       <div className="lg:hidden w-full py-4 border-b border-black/10 bg-off-white overflow-hidden flex items-center">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="text-[10px] uppercase tracking-widest font-semibold font-sans px-6 flex items-center gap-6">
                {settings.marquee} <ArrowRight size={12} className="text-orange" />
              </span>
            ))}
          </div>
        </div>
    </div>
  );
}
