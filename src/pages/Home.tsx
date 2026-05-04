import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getProducts, Product } from "../lib/data";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const featured = products.filter(p => p.isFeatured);

  return (
    <div className="flex flex-col flex-grow w-full overflow-hidden relative">
      <div className="flex flex-col lg:flex-row flex-grow w-full border-b border-black/10">
        
        {/* Left Side: Editorial Typography & Marquee */}
        <section className="flex-1 p-8 md:p-14 mb-[80px] lg:mb-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black/10 relative">
          <div className="z-10 relative">
            <span className="text-[11px] uppercase tracking-widest text-ink/60 mb-6 block font-sans">The Muse — Vol 01</span>
            <h1 className="text-[15vw] lg:text-[7.5vw] leading-[0.85] font-black tracking-tighter mb-8 font-sans">
              Amplify<br />Your<br />Ordinary.
            </h1>
            <p className="text-xl md:text-2xl leading-relaxed max-w-[360px] font-serif italic text-ink/80 border-l border-ink/20 pl-4">
              Transforming the mundane into unique experiences through chrome, steel, and vivid textures.
            </p>
          </div>

          <div className="hidden lg:flex w-full h-[60px] absolute bottom-0 left-0 border-t border-black/10 bg-off-white overflow-hidden items-center z-20">
            <div className="flex whitespace-nowrap animate-marquee">
              {[...Array(6)].map((_, i) => (
                <span key={i} className="text-xs uppercase tracking-widest font-semibold font-sans px-8 flex items-center gap-8">
                  Amplify Your Ordinary <ArrowRight size={14} className="text-orange" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side: Featured Products Grid with softer styling mixed */}
        <section className="flex-[1.2] p-6 lg:p-12 bg-silver/20 overflow-x-auto hide-scrollbar flex items-stretch">
          {featured.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-ink/40 font-serif italic">No featured products selected.</div>
          ) : (
            <div className="grid grid-rows-2 gap-6 auto-cols-[280px] sm:auto-cols-[320px] grid-flow-col w-max min-h-[500px]">
              {featured.map((product, index) => {
                const isTall = index % 3 === 0;
                const isPink = index % 3 === 2;
                
                return (
                  <Link 
                    to={`/product/${product.id}`}
                    key={product.id}
                    className={`group relative p-6 flex flex-col justify-between transition-transform duration-500 hover:-translate-y-2 rounded-[24px] overflow-hidden ${
                      isTall ? 'row-span-2 bg-white border border-black/5 shadow-sm text-ink' : isPink ? 'bg-pink text-ink' : 'bg-cobalt text-white'
                    }`}
                  >
                    <div className="z-10 flex justify-between items-start w-full relative">
                      <span className={`text-[10px] uppercase font-bold mb-1 font-sans ${isPink ? 'text-ink/60' : isTall ? 'text-orange' : 'text-white/60'}`}>
                        {product.category}
                      </span>
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isTall ? 'border-black/10 text-ink' : isPink ? 'border-ink/20 text-ink' : 'border-white/20 text-white'}`}>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex-grow flex flex-col z-10 relative">
                      <div className="text-2xl font-bold font-sans tracking-tight leading-none mb-4">
                        {product.name.split(' ').map((word, i) => (
                          <span key={i}>{word}<br/></span>
                        ))}
                      </div>
                    </div>

                    {/* Background Image Setup */}
                    <div className="absolute inset-0 w-full h-full p-2 z-0">
                      <div className={`w-full h-full rounded-[16px] overflow-hidden bg-black/5 relative`}>
                        <img 
                            src={product.images?.[0] || ''} 
                            alt={product.name} 
                            className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${!isTall && !isPink ? 'opacity-80 mix-blend-luminosity' : 'mix-blend-multiply opacity-90'}`}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-transparent transition-colors"></div>
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
                Amplify Your Ordinary <ArrowRight size={12} className="text-orange" />
              </span>
            ))}
          </div>
        </div>
    </div>
  );
}
