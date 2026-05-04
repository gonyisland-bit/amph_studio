import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";

const CATEGORIES: Category[] = ['Chairs', 'Tables', 'Lighting', 'Objects'];

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');

  useEffect(() => {
    getProducts().then(setProducts);
    getHomeSettings().then(setSettings);
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    const aIdx = settings.globalProductOrder.indexOf(a.id);
    const bIdx = settings.globalProductOrder.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const filteredProducts = activeCategory === 'All' 
    ? sortedProducts 
    : sortedProducts.filter(p => p.category === activeCategory);

  return (
    <div className="flex flex-col flex-grow">
      <div className="px-6 md:px-12 py-12 md:py-20 border-b border-black/10 flex flex-col md:flex-row justify-between items-baseline gap-6 bg-off-white">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase font-sans">Collection</h1>
        <div className="flex flex-wrap gap-6 text-xs uppercase tracking-widest font-semibold font-sans">
          <button 
            className={`transition-all border-b pb-1 ${activeCategory === 'All' ? 'border-cobalt text-cobalt' : 'border-transparent hover:text-cobalt hover:border-cobalt/30'}`}
            onClick={() => setActiveCategory('All')}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              className={`transition-all border-b pb-1 ${activeCategory === cat ? 'border-cobalt text-cobalt' : 'border-transparent hover:text-cobalt hover:border-cobalt/30'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-b border-black/10 auto-rows-fr">
        {filteredProducts.map((product) => (
          <Link 
            to={`/product/${product.id}`}
            key={product.id}
            className="group border-b sm:border-b-0 sm:border-r border-black/10 flex flex-col pt-8 pb-6 px-6 relative hover:bg-white transition-colors duration-300 h-full"
          >
            <div className="flex justify-between items-start mb-6 z-10 relative">
              <span className="text-[10px] uppercase font-bold text-orange font-sans px-3 py-1 border border-orange rounded-full">
                {product.category}
              </span>
              <span className="text-xs font-semibold font-sans">${product.price}</span>
            </div>
            
            <div className="flex-grow flex items-center justify-center w-full aspect-[4/5] bg-silver/20 overflow-hidden rounded-[20px] relative mb-6">
              {/* Primary Image */}
              <img 
                src={product.images[0]} 
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover mix-blend-multiply transition-opacity duration-500 ease-in-out group-hover:opacity-0"
                referrerPolicy="no-referrer"
              />
              {/* Secondary Hover Image */}
              {product.hoverImages?.[0] && (
                <img 
                  src={product.hoverImages[0]} 
                  alt={`${product.name} alternative view`}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="mt-auto z-10 relative">
              <h2 className="text-xl font-bold font-sans tracking-tight">{product.name}</h2>
              <p className="text-sm text-ink/60 mt-1 font-serif italic">{product.material}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
