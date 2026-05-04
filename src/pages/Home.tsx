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
    <div className="flex flex-col flex-grow w-full bg-off-white overflow-hidden">
      
      {/* 1. Hero Section: Editorial Image & Overlapping Title */}
      <section className="relative w-full h-[90vh] flex flex-col justify-center px-6 md:px-14 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={featured[0]?.images[0] || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2158&auto=format&fit=crop'} 
            className="w-full h-full object-cover" 
            alt="Hero"
          />
          <div className="absolute inset-0 bg-black/5"></div>
        </div>
        
        <div className="z-10 relative mt-auto mb-12">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white mb-4 block font-bold drop-shadow-sm">{settings.subtitle}</span>
          <h1 className="text-[14vw] leading-[0.8] font-black tracking-tighter text-white drop-shadow-2xl mix-blend-difference">
            {settings.title.split('\n').map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
        </div>
      </section>

      {/* 2. Intro Section: Tabs Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-black/10 bg-white">
        {[
          { label: 'Collection', link: '/shop', desc: 'Curated objects for modern living.', img: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?q=80&w=1974&auto=format&fit=crop' },
          { label: 'Space', link: '/space', desc: 'Industrial minimalism in Seoul.', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070&auto=format&fit=crop' },
          { label: 'Journal', link: '/journal', desc: 'Studies in chrome and steel.', img: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=1974&auto=format&fit=crop' }
        ].map((item, i) => (
          <Link key={i} to={item.link} className="group border-r border-black/10 p-10 md:p-14 flex flex-col justify-between hover:bg-black/5 transition-colors relative overflow-hidden h-[400px] md:h-[500px]">
            <div className="z-10">
              <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 group-hover:text-cobalt transition-colors">{item.label}</h3>
              <p className="text-lg font-serif italic text-ink/60 max-w-[200px]">{item.desc}</p>
            </div>
            <div className="mt-auto z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest border-b border-ink pb-1">Explore</span>
            </div>
            <img src={item.img} className="absolute bottom-[-10%] right-[-10%] w-1/2 opacity-0 group-hover:opacity-100 group-hover:bottom-0 group-hover:right-0 transition-all duration-700 mix-blend-multiply" alt="" />
          </Link>
        ))}
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
