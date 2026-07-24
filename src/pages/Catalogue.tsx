import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function Catalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState("");

  useScrollReveal([products, activeCategory, searchQuery]);

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
    getHomeSettings().then(setSettings).catch(console.error);
    document.title = "Catalogue — Amph";
  }, []);

  const filteredProducts = products.filter(p => {
    const cat = (p.category as string) === 'Tables' ? 'Furniture' : p.category;
    const categoryMatches = activeCategory === 'All' || cat === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.material?.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatches && matchesSearch;
  }).sort((a, b) => {
    const aIdx = settings.globalProductOrder.indexOf(a.id);
    const bIdx = settings.globalProductOrder.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="flex flex-col flex-grow bg-white font-sans text-ink">
      {/* Catalogue Intro Header — Aligned with Collection & Space Header layout */}
      <div className="px-6 md:px-12 pt-12 md:pt-24 pb-8 md:pb-12 border-b border-black/10 bg-off-white">
        <div className="max-w-4xl mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-light tracking-tighter uppercase leading-[0.9] mb-4 md:mb-6 font-sans">
            Catalogue
          </h1>
          <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">
            Comprehensive index of architectural objects, material specifications, and design configurations.
          </p>
        </div>

        {/* Filter and Search controls — Tight, balanced margins */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-stretch md:items-center border-t border-black/10 pt-6">
          {/* Categories Tab */}
          <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest">
            {['All', 'Chairs', 'Furniture', 'Lighting', 'Objects'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className="px-4 py-2 border transition-all duration-300 rounded-none cursor-pointer border-black/10 hover:border-black/30 text-ink/50 hover:text-ink data-[active=true]:bg-ink data-[active=true]:text-white data-[active=true]:border-ink"
                data-active={activeCategory === cat}
              >
                {cat === 'All' ? 'ALL INDEX' : cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="QUICK INDEX SEARCH (NAME, SKU, MATERIAL)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-black/10 focus:border-cobalt outline-none p-3 pl-4 text-[9px] font-black uppercase tracking-wider rounded-none shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid List */}
      {filteredProducts.length === 0 ? (
        <div className="p-24 text-center border-b border-black/5">
          <p className="text-xs uppercase tracking-widest text-ink/40 font-mono">No catalogue entries match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 border-b border-black/10 bg-black/[0.03] gap-px">
          {filteredProducts.map(p => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="bg-white p-4 flex flex-col justify-between group hover:bg-silver/10 transition-colors relative reveal"
            >
              <div>
                <div className="aspect-square bg-silver/5 mb-3 overflow-hidden border border-black/5 rounded-none relative">
                  <MediaRenderer
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 z-10">
                    <span className="text-[8px] uppercase font-bold tracking-widest text-ink/60 bg-white/90 backdrop-blur-md px-1.5 py-0.5 border border-black/10">
                      {p.category}
                    </span>
                  </div>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-tight text-ink group-hover:text-cobalt transition-colors truncate mb-1">
                  {p.name}
                </h3>
                <p className="text-[9px] text-ink/40 font-mono uppercase tracking-wider mb-2">
                  SKU: {p.sku || p.id}
                </p>
              </div>

              <div className="pt-2 border-t border-black/5 flex justify-between items-center text-[9px]">
                <span className="text-ink/60 font-mono truncate max-w-[60%]">
                  {p.material || 'Standard'}
                </span>
                <span className="font-bold text-ink">
                  ${p.price.toLocaleString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
