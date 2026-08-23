import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings, ColorOption } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";
import { LayoutGrid, Grid2X2, List, ArrowRight } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<'grid4' | 'grid2' | 'list'>(() => {
    return (localStorage.getItem('amph_collection_view_mode') as 'grid4' | 'grid2' | 'list') || 'grid4';
  });
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  const categoryQuery = searchParams.get('category');

  useEffect(() => {
    getProducts().then(setProducts);
    getHomeSettings().then(setSettings);
    document.title = "Collection — Amph";
  }, []);

  const handleViewModeChange = (mode: 'grid4' | 'grid2' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('amph_collection_view_mode', mode);
  };

  // Sync category query from search submit
  useEffect(() => {
    if (categoryQuery && CATEGORIES.includes(categoryQuery as Category)) {
      setActiveCategory(categoryQuery as Category);
    }
  }, [categoryQuery]);

  const filteredProducts = products.filter(p => {
    // Migration: Treat 'Tables' as 'Furniture'
    const cat = (p.category as string) === 'Tables' ? 'Furniture' : p.category;
    const categoryMatches = activeCategory === 'All' || cat === activeCategory;

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatches = p.name.toLowerCase().includes(q);
      const subMatches = p.subTitle?.toLowerCase().includes(q) || false;
      const matMatches = p.material?.toLowerCase().includes(q) || false;
      const catMatches = cat.toLowerCase().includes(q);
      return categoryMatches && (nameMatches || subMatches || matMatches || catMatches);
    }

    return categoryMatches;
  }).sort((a, b) => {
    const orderList = settings.globalProductOrder || [];
    const aIdx = orderList.indexOf(a.id);
    const bIdx = orderList.indexOf(b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  useScrollReveal([filteredProducts, viewMode, activeCategory]);

  return (
    <div className="flex flex-col flex-grow">
      {/* Header & View Mode Switcher */}
      <div className="px-6 md:px-12 pt-12 md:pt-24 pb-8 border-b border-black/10 bg-off-white">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase font-sans leading-[0.9] mb-4 md:mb-6">
              {settings.hubSettings?.collection?.title || 'Collection'}
            </h1>
            <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">{settings.hubSettings?.collection?.description}</p>
          </div>

          {/* View Mode Toggle Controls */}
          <div className="flex items-center gap-1 self-start md:self-auto bg-black/5 p-1 rounded-none border border-black/10">
            <button
              type="button"
              onClick={() => handleViewModeChange('grid4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer rounded-none ${
                viewMode === 'grid4'
                  ? 'bg-cobalt text-white shadow-xs'
                  : 'text-ink/60 hover:text-ink hover:bg-black/5'
              }`}
              title="4-Column Grid View"
            >
              <LayoutGrid size={13} />
              <span>4-GRID</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('grid2')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer rounded-none ${
                viewMode === 'grid2'
                  ? 'bg-cobalt text-white shadow-xs'
                  : 'text-ink/60 hover:text-ink hover:bg-black/5'
              }`}
              title="2-Column Large View"
            >
              <Grid2X2 size={13} />
              <span>2-LARGE</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer rounded-none ${
                viewMode === 'list'
                  ? 'bg-cobalt text-white shadow-xs'
                  : 'text-ink/60 hover:text-ink hover:bg-black/5'
              }`}
              title="List View"
            >
              <List size={13} />
              <span>LIST</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
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

      {/* 1. 4-GRID & 2-LARGE GRID VIEW MODES */}
      {(viewMode === 'grid4' || viewMode === 'grid2') && (
        <div 
          key={`grid-${viewMode}-${activeCategory}`}
          className={`grid ${viewMode === 'grid2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} border-t border-l border-black/10 auto-rows-fr`}
        >
          {filteredProducts.map((product) => (
            <Link 
              to={`/product/${product.id}`}
              key={product.id}
              className={`group border-b border-r border-black/10 ${viewMode === 'grid2' ? 'aspect-[16/11] md:aspect-[4/3]' : 'aspect-[4/5]'} relative overflow-hidden flex flex-col reveal`}
            >
              {/* Category tag overlap on top-left */}
              <div className="absolute top-6 left-6 z-20 pointer-events-none">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/90 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
                  {product.category}
                </span>
              </div>

              {/* Product Name & Subtitle on bottom-left */}
              <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none">
                <h2 className="text-base sm:text-lg md:text-xl font-bold font-sans tracking-tight leading-tight text-white drop-shadow-md group-hover:text-cobalt transition-colors">
                  {product.name}
                </h2>
                {viewMode === 'grid2' && product.subTitle && (
                  <p className="text-xs font-serif italic text-white/80 mt-1 truncate">
                    {product.subTitle}
                  </p>
                )}
              </div>
              
              {/* Full-bleed Image Container */}
              <div className="absolute inset-0 w-full h-full bg-silver/5 overflow-hidden rounded-none">
                {/* Primary Image */}
                <MediaRenderer 
                  src={product.images[0]} 
                  alt={product.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out scale-100 ${product.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`}
                  loading="lazy"
                  nopin="nopin"
                />
                {/* Secondary Hover Image */}
                {product.hoverImages?.[0] && (
                  <MediaRenderer 
                    src={product.hoverImages[0]} 
                    alt={`${product.name} alternative view`}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-1000 ease-in-out scale-100 group-hover:opacity-100 group-hover:scale-105"
                    loading="lazy"
                    nopin="nopin"
                  />
                )}
                {/* Refined gradient for 100% crystal-clear text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent z-10 pointer-events-none" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 2. MINIMALIST LIST VIEW MODE */}
      {viewMode === 'list' && (
        <div className="flex flex-col border-t border-black/10 divide-y divide-black/10 bg-white">
          {filteredProducts.map((product, idx) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 hover:bg-off-white transition-colors duration-200 reveal gap-4"
            >
              {/* Left info & media */}
              <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
                <span className="text-[10px] font-mono font-bold text-cobalt tracking-widest shrink-0 w-8">
                  0{idx + 1}
                </span>
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5 relative">
                  <MediaRenderer
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-base sm:text-xl font-bold font-sans tracking-tight text-ink group-hover:text-cobalt transition-colors truncate">
                      {product.name}
                    </h2>
                    <span className="caption-nano text-orange px-2 py-0.5 border border-orange/30 rounded-full font-bold shrink-0">
                      {product.category}
                    </span>
                  </div>
                  {product.subTitle && (
                    <p className="text-xs font-serif italic text-ink/50 truncate max-w-md">
                      {product.subTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Details & Action */}
              <div className="flex items-center gap-6 sm:gap-12 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-black/5 pt-3 sm:pt-0">
                <div className="flex items-center gap-2">
                  {renderChips(product)}
                </div>
                <div className="flex items-center gap-2 text-ink/40 group-hover:text-cobalt text-[10px] uppercase font-black tracking-widest shrink-0">
                  <span>View Object</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Option Color & Material Chips helper
function renderChips(product: Product) {
  const chips: React.ReactNode[] = [];
  
  // 1. Material chips (Oak, Steel, Ash, etc.)
  if (product.material) {
    const materials = product.material.split(',').map(m => m.trim());
    materials.forEach(mat => {
      chips.push(
        <span key={`mat-${mat}`} className="text-[9px] font-sans font-bold tracking-wider uppercase bg-ink/5 text-ink/60 px-2 py-0.5 rounded-[2px] border border-black/5">
          {mat}
        </span>
      );
    });
  }

  // 2. Color chips
  if (product.color) {
    let colorsList: { name: string; hex: string }[] = [];
    if (Array.isArray(product.color)) {
      colorsList = product.color;
    } else {
      const colorMap: Record<string, string> = {
        'Oak': '#d7c29d', 'Ash': '#e5dec9', 'Walnut': '#4b382a', 'Steel': '#8a9597',
        'Black': '#1c1c1c', 'White': '#ffffff', 'Cobalt': '#0047AB', 'Orange': '#FF4500',
        'Pink': '#F8BBD0', 'Silver': '#E0E0E2', 'Gray': '#808080', 'Charcoal': '#36454F',
        'Cream': '#FFFDD0', 'Beige': '#F5F5DC', 'Natural': '#e8d8c1'
      };
      colorsList = product.color.split(',').map(c => {
        const name = c.trim();
        return {
          name,
          hex: colorMap[name] || '#888888'
        };
      });
    }

    colorsList.forEach(c => {
      const hex = c.hex;
      const col = c.name;
      if (hex && hex !== '#888888') {
        chips.push(
          <div 
            key={`col-${col}`} 
            className="w-3 h-3 rounded-full border border-black/15 shadow-sm shrink-0" 
            style={{ backgroundColor: hex }}
            title={col}
          />
        );
      } else {
        chips.push(
          <span key={`col-${col}`} className="text-[9px] font-sans font-bold tracking-wider uppercase bg-cobalt/5 text-cobalt/70 px-2 py-0.5 rounded-[2px] border border-cobalt/10">
            {col}
          </span>
        );
      }
    });
  }

  return chips.length > 0 ? chips : <span className="text-[9px] text-ink/30 italic">Standard options</span>;
}
