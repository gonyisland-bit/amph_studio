import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings, ColorOption, generateProductCode } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";
import { useWishlist } from "../lib/wishlist";
import { Bookmark } from "lucide-react";
import { FloatingSectionNavigator } from "../components/FloatingSectionNavigator";

export default function Catalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [showSpecs, setShowSpecs] = useState(true);

  // Wishlist Hook
  const { toggle: toggleWishlist, isSaved } = useWishlist();

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
    const orderList = settings.globalProductOrder || [];
    const aIdx = orderList.indexOf(a.id);
    const bIdx = orderList.indexOf(b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col flex-grow bg-white font-sans text-ink">
      {/* Catalogue Intro Header — Aligned with Collection & Space Header layout */}
      <div id="catalogue-header" className="px-6 md:px-12 pt-12 md:pt-24 pb-8 md:pb-12 border-b border-black/10 bg-off-white">
        <div className="max-w-4xl mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase leading-[0.9] mb-4 md:mb-6 font-sans">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Specs Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSpecs(prev => !prev)}
              className="px-4 py-3 border text-[9px] font-black uppercase tracking-widest transition-all duration-300 rounded-none cursor-pointer flex items-center justify-between sm:justify-start gap-2 border-black/10 hover:border-black/30 bg-white hover:bg-black/5"
              title="Toggle Product Specifications View"
            >
              <span className="text-ink/60">SPECS VIEW</span>
              <span className={`px-2 py-0.5 text-[8px] font-bold tracking-wider ${showSpecs ? 'bg-cobalt text-white' : 'bg-black/10 text-ink/40'}`}>
                {showSpecs ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Quick Search */}
            <div className="relative max-w-md w-full">
              <input
                type="text"
                placeholder="QUICK INDEX SEARCH (NAME, PRODUCT CODE, MATERIAL)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-black/10 focus:border-cobalt outline-none p-3 pl-4 text-[9px] font-black uppercase tracking-wider rounded-none shadow-sm transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {filteredProducts.length === 0 ? (
        <div className="p-24 text-center border-b border-black/5">
          <p className="text-xs uppercase tracking-widest text-ink/40 font-mono">No catalogue entries match your search criteria.</p>
        </div>
      ) : (
        <div id="catalogue-content" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 border-b border-black/10 bg-black/[0.03] gap-px">
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

                  {/* Wishlist Bookmark Button on top-right */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(p.id);
                    }}
                    className={`absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-md transition-all duration-300 cursor-pointer ${
                      isSaved(p.id)
                        ? 'bg-cobalt text-white shadow-md'
                        : 'bg-white/90 text-ink/70 hover:text-white hover:bg-cobalt border border-black/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isSaved(p.id) ? "Remove from Saved" : "Save to Wishlist"}
                    aria-label="Save to Wishlist"
                  >
                    <Bookmark size={12} className={isSaved(p.id) ? "fill-current" : ""} />
                  </button>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-tight text-ink group-hover:text-cobalt transition-colors truncate mb-1">
                  {p.name}
                </h3>
                <p className="text-[9px] text-ink/40 font-mono uppercase tracking-wider mb-2">
                  CODE: {p.sku || generateProductCode(p.category, p.name)}
                </p>
              </div>

              <div>
                {/* Product Specifications Section (Toggleable) */}
                {showSpecs && (
                  <div className="my-2.5 pt-2.5 border-t border-black/10 space-y-1.5 text-[9px] animate-in fade-in duration-200">
                    {/* Dimensions */}
                    {p.dimensions && (
                      <div className="flex justify-between items-start text-ink/70">
                        <span className="font-mono text-ink/40 uppercase tracking-wider text-[8px]">DIM</span>
                        <span className="font-mono text-right font-medium truncate max-w-[70%]" title={p.dimensions}>{p.dimensions}</span>
                      </div>
                    )}

                    {/* Material */}
                    <div className="flex justify-between items-start text-ink/70">
                      <span className="font-mono text-ink/40 uppercase tracking-wider text-[8px]">MAT</span>
                      <span className="font-mono text-right font-medium truncate max-w-[70%]" title={p.material || 'Standard'}>{p.material || 'Standard'}</span>
                    </div>

                    {/* Color Options */}
                    {(() => {
                      const colors: ColorOption[] = Array.isArray(p.color) 
                        ? p.color 
                        : (p.color ? [{ name: p.color, hex: '#000000' }] : []);
                      
                      if (colors.length === 0) return null;

                      return (
                        <div className="flex justify-between items-center text-ink/70 pt-0.5">
                          <span className="font-mono text-ink/40 uppercase tracking-wider text-[8px]">CLR</span>
                          <div className="flex items-center gap-1 max-w-[70%] overflow-hidden justify-end">
                            {colors.slice(0, 4).map((c, i) => (
                              <span 
                                key={i} 
                                className="w-2.5 h-2.5 rounded-full border border-black/20 flex-shrink-0 inline-block" 
                                style={{ backgroundColor: c.hex || '#000' }}
                                title={c.name}
                              />
                            ))}
                            {colors.length > 4 && (
                              <span className="text-[8px] font-mono text-ink/40">+{colors.length - 4}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="pt-2 border-t border-black/5 flex justify-end items-center text-[9px]">
                  <span className="font-bold text-ink">
                    ${p.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Floating Smart Section Navigator */}
      <FloatingSectionNavigator sectionIds={['catalogue-header', 'catalogue-content']} />
    </div>
  );
}
