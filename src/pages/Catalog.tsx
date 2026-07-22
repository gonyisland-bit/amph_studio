import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState("");

  useScrollReveal([products, activeCategory, searchQuery]);

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
    getHomeSettings().then(setSettings).catch(console.error);
    document.title = "Catalog — Amph";
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
      {/* Catalog Intro Header */}
      <div className="px-6 md:px-12 py-16 md:py-24 border-b border-black/10 bg-off-white">
        <div className="max-w-4xl">
          <span className="text-[10px] font-black uppercase text-cobalt tracking-[0.2em] block mb-3 font-mono">Product Index</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-6">
            Catalog
          </h1>
          <p className="text-sm md:text-base font-serif italic text-ink/60 max-w-xl">
            A comprehensive list of products, configurations, and core designs available in the studio.
          </p>
        </div>

        {/* Filter and Search controls */}
        <div className="mt-12 flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center border-t border-black/5 pt-8">
          {/* Categories Tab */}
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
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
              className="w-full bg-white border border-black/10 focus:border-cobalt outline-none p-3.5 pl-4 text-[9px] font-black uppercase tracking-wider rounded-none shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid List */}
      {filteredProducts.length === 0 ? (
        <div className="p-24 text-center border-b border-black/5">
          <p className="text-xs uppercase tracking-widest text-ink/40 font-mono">No catalog entries match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 border-b border-black/10 bg-black/[0.03] gap-px">
          {filteredProducts.map(p => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="group bg-white p-6 flex flex-col justify-between hover:bg-off-white/40 transition-colors duration-500 min-w-0"
            >
              {/* Product Thumbnail inside center alignment */}
              <div className="aspect-square w-full bg-silver/5 border border-black/5 overflow-hidden flex items-center justify-center relative mb-6">
                <MediaRenderer
                  src={p.images[0]}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  nopin="nopin"
                />
              </div>

              {/* Specs and Names */}
              <div className="space-y-3 font-sans min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-[9px] font-black text-ink/40 uppercase tracking-widest truncate">{p.category}</span>
                  <span className="text-[9px] font-mono text-ink/30 shrink-0">{p.sku || '-'}</span>
                </div>
                
                <h3 className="text-xs font-black uppercase text-ink group-hover:text-cobalt transition-colors truncate tracking-wide leading-tight">
                  {p.name}
                </h3>
                
                <div className="border-t border-black/[0.06] pt-2 flex justify-between items-center text-[10px]">
                  <span className="text-ink/50 truncate max-w-[70%] font-mono text-[9px]">{p.material?.split(',')[0] || '-'}</span>
                  <span className="font-bold text-ink shrink-0">${Number(p.price).toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
