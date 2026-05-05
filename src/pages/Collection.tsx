import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";

const CATEGORIES: Category[] = ['Chairs', 'Furniture', 'Lighting', 'Objects'];
const CATEGORY_LABELS: Record<string, string> = {
  'All': 'ALL',
  'Chairs': 'CHAIR',
  'Furniture': 'FURNITURE',
  'Lighting': 'LIGHTING',
  'Objects': 'OBJECT'
};

export default function Collection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');

  useEffect(() => {
    getProducts().then(setProducts);
    getHomeSettings().then(setSettings);
    document.title = "Collection — Amph";
  }, []);

  const filteredProducts = products.filter(p => {
    // Migration: Treat 'Tables' as 'Furniture'
    const cat = (p.category as string) === 'Tables' ? 'Furniture' : p.category;
    return activeCategory === 'All' || cat === activeCategory;
  }).sort((a, b) => {
    const aIdx = settings.globalProductOrder.indexOf(a.id);
    const bIdx = settings.globalProductOrder.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="flex flex-col flex-grow">
      <div className="px-6 md:px-12 pt-12 md:pt-24 pb-8 border-b border-black/10 bg-off-white">
        <div className="max-w-4xl mb-12">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase font-sans leading-[0.85] mb-6">
            {settings.hubSettings?.collection?.title || 'Collection'}
          </h1>
          <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">{settings.hubSettings?.collection?.description}</p>
        </div>

        <div className="flex flex-nowrap overflow-x-auto hide-scrollbar gap-5 md:gap-12 text-[10px] uppercase tracking-[0.2em] font-black font-sans border-t border-black/5 pt-8 -mb-8 pr-8 md:pr-0">
          <button 
            className={`transition-all pb-4 border-b-2 whitespace-nowrap ${activeCategory === 'All' ? 'border-cobalt text-cobalt' : 'border-transparent text-ink/40 hover:text-ink'}`}
            onClick={() => setActiveCategory('All')}
          >
            {CATEGORY_LABELS['All']}
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              className={`transition-all pb-4 border-b-2 whitespace-nowrap ${activeCategory === cat ? 'border-cobalt text-cobalt' : 'border-transparent text-ink/40 hover:text-ink'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-b border-black/10 auto-rows-fr">
        {filteredProducts.map((product) => (
          <Link 
            to={`/product/${product.id}`}
            key={product.id}
            className="group border-b sm:border-b-0 sm:border-r border-black/10 flex flex-col pt-8 pb-6 px-6 relative hover:bg-white transition-colors duration-300 h-full reveal"
          >
            <div className="flex justify-between items-start mb-6 z-10 relative">
              <span className="text-[10px] uppercase font-bold text-orange font-sans px-3 py-1 border border-orange rounded-full">
                {product.category}
              </span>
              {product.price > 0 && (
                <span className="text-xs font-semibold font-sans">${product.price}</span>
              )}
            </div>
            
            <div className="flex-grow flex items-center justify-center w-full aspect-[4/5] bg-silver/20 overflow-hidden rounded-[20px] relative mb-6">
              {/* Primary Image */}
              <img 
                src={product.images[0]} 
                alt={product.name}
                className={`absolute inset-0 w-full h-full object-cover mix-blend-multiply transition-all duration-700 ease-in-out ${product.hoverImages?.[0] ? 'group-hover:opacity-0' : 'group-hover:scale-110'}`}
                referrerPolicy="no-referrer"
              />
              {/* Secondary Hover Image */}
              {product.hoverImages?.[0] && (
                <img 
                  src={product.hoverImages[0]} 
                  alt={`${product.name} alternative view`}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-0 transition-opacity duration-700 ease-in-out group-hover:opacity-100 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="mt-auto z-10 relative">
              <h2 className="text-xl font-bold font-sans tracking-tight">{product.name}</h2>
              <p className="text-sm text-ink/60 mt-1 font-serif italic">{product.subTitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
