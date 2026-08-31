import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";
import { resolveColorHex } from "../lib/colorUtils";
import { useWishlist } from "../lib/wishlist";
import { LayoutGrid, Columns2, List, ArrowRight, SlidersHorizontal, ChevronDown, ChevronUp, X, RotateCcw, Bookmark } from "lucide-react";
import { FloatingSectionNavigator } from "../components/FloatingSectionNavigator";

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
  
  // Quick Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'curated' | 'newest' | 'name'>('curated');

  // Wishlist Hook
  const { toggle: toggleWishlist, isSaved } = useWishlist();

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  const categoryQuery = searchParams.get('category');
  const wishlistQuery = searchParams.get('wishlist');
  const wishlistIds = React.useMemo(() => wishlistQuery ? wishlistQuery.split(',').filter(Boolean) : [], [wishlistQuery]);

  useEffect(() => {
    getProducts().then(setProducts);
    getHomeSettings().then(setSettings);
    document.title = "Collection — Amph";
  }, []);

  // Helper to format material name consistently (e.g. "plastic" -> "Plastic")
  const formatMaterialName = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  // Dynamically extract materials that actually exist in the products of the active category
  const availableMaterials = React.useMemo(() => {
    const relevantProducts = activeCategory === 'All'
      ? products
      : products.filter(p => {
          const cat = (p.category as string) === 'Tables' ? 'Furniture' : p.category;
          return cat === activeCategory;
        });

    const materialMap = new Map<string, string>();
    relevantProducts.forEach(p => {
      if (p.material) {
        p.material.split(',').forEach(m => {
          const formatted = formatMaterialName(m);
          if (formatted) {
            const key = formatted.toLowerCase();
            if (!materialMap.has(key)) {
              materialMap.set(key, formatted);
            }
          }
        });
      }
    });
    return ['All', ...Array.from(materialMap.values())];
  }, [products, activeCategory]);

  // Dynamically extract colors that actually exist in the products of the active category
  const availableColors = React.useMemo(() => {
    const relevantProducts = activeCategory === 'All'
      ? products
      : products.filter(p => {
          const cat = (p.category as string) === 'Tables' ? 'Furniture' : p.category;
          return cat === activeCategory;
        });

    const colorItemsMap = new Map<string, { name: string; hex: string }>();
    relevantProducts.forEach(p => {
      const addColor = (nameStr: string, customHex?: string) => {
        if (!nameStr) return;
        const formatted = nameStr.trim().charAt(0).toUpperCase() + nameStr.trim().slice(1);
        const key = formatted.toLowerCase();
        if (formatted && !colorItemsMap.has(key)) {
          colorItemsMap.set(key, {
            name: formatted,
            hex: resolveColorHex(formatted, customHex)
          });
        }
      };

      if (p.bodyColors && Array.isArray(p.bodyColors)) {
        p.bodyColors.forEach((c: any) => {
          const name = typeof c === 'string' ? c : c?.name;
          const hex = typeof c === 'object' ? c?.hex : undefined;
          if (name) addColor(name, hex);
        });
      }
      if (p.fabricColors && Array.isArray(p.fabricColors)) {
        p.fabricColors.forEach((c: any) => {
          const name = typeof c === 'string' ? c : c?.name;
          const hex = typeof c === 'object' ? c?.hex : undefined;
          if (name) addColor(name, hex);
        });
      }
      if (p.color) {
        if (Array.isArray(p.color)) {
          p.color.forEach((c: any) => {
            if (c?.name) addColor(c.name, c.hex);
          });
        } else if (typeof p.color === 'string') {
          p.color.split(',').forEach(c => addColor(c));
        }
      }
    });

    return [{ name: 'All', hex: '' }, ...Array.from(colorItemsMap.values())];
  }, [products, activeCategory]);

  // If active filter is no longer available in current category, auto reset to 'All'
  useEffect(() => {
    if (selectedMaterial !== 'All' && !availableMaterials.includes(selectedMaterial)) {
      setSelectedMaterial('All');
    }
  }, [availableMaterials, selectedMaterial]);

  useEffect(() => {
    if (selectedColor !== 'All' && !availableColors.some(c => c.name.toLowerCase() === selectedColor.toLowerCase())) {
      setSelectedColor('All');
    }
  }, [availableColors, selectedColor]);

  const handleViewModeChange = (mode: 'grid4' | 'grid2' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('amph_collection_view_mode', mode);
  };

  const handleResetFilters = () => {
    setSelectedMaterial('All');
    setSelectedColor('All');
    setSortBy('curated');
  };

  const activeFilterCount = (selectedMaterial !== 'All' ? 1 : 0) + (selectedColor !== 'All' ? 1 : 0) + (sortBy !== 'curated' ? 1 : 0);

  // Sync category query from search submit
  useEffect(() => {
    if (categoryQuery && CATEGORIES.includes(categoryQuery as Category)) {
      setActiveCategory(categoryQuery as Category);
    }
  }, [categoryQuery]);

  const filteredProducts = products.filter(p => {
    // 0. Shared Wishlist filter (if url has ?wishlist=id1,id2)
    if (wishlistIds.length > 0 && !wishlistIds.includes(p.id)) return false;

    // 1. Category filter
    const cat = (p.category as string) === 'Tables' ? 'Furniture' : p.category;
    const categoryMatches = activeCategory === 'All' || cat === activeCategory;

    // 2. Search query filter
    let searchMatches = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatches = p.name.toLowerCase().includes(q);
      const subMatches = p.subTitle?.toLowerCase().includes(q) || false;
      const matMatches = p.material?.toLowerCase().includes(q) || false;
      const catMatches = cat.toLowerCase().includes(q);
      searchMatches = nameMatches || subMatches || matMatches || catMatches;
    }

    // 3. Material filter
    const materialMatches = selectedMaterial === 'All' || 
      (p.material && p.material.toLowerCase().includes(selectedMaterial.toLowerCase()));

    // 4. Color filter
    const colorMatches = selectedColor === 'All' || (() => {
      const qColor = selectedColor.toLowerCase();
      if (p.bodyColors && Array.isArray(p.bodyColors)) {
        if (p.bodyColors.some((c: any) => (typeof c === 'string' ? c : c?.name)?.toLowerCase().includes(qColor))) return true;
      }
      if (p.fabricColors && Array.isArray(p.fabricColors)) {
        if (p.fabricColors.some((c: any) => (typeof c === 'string' ? c : c?.name)?.toLowerCase().includes(qColor))) return true;
      }
      if (p.color) {
        if (Array.isArray(p.color)) {
          if (p.color.some((c: any) => (c?.name || '')?.toLowerCase().includes(qColor))) return true;
        } else if (typeof p.color === 'string') {
          if (p.color.toLowerCase().includes(qColor)) return true;
        }
      }
      return false;
    })();

    return categoryMatches && searchMatches && materialMatches && colorMatches;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.id || '').localeCompare(a.id || '');
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    // Default Curated
    const orderList = settings.globalProductOrder || [];
    const aIdx = orderList.indexOf(a.id);
    const bIdx = orderList.indexOf(b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });

  useScrollReveal([filteredProducts, viewMode, activeCategory, selectedMaterial, selectedColor, sortBy]);

  return (
    <div className="flex flex-col flex-grow">
      {/* Header & View Mode Switcher */}
      <div id="collection-header" className="px-6 md:px-12 pt-12 md:pt-24 pb-8 border-b border-black/10 bg-off-white">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase font-sans leading-[0.9] mb-4 md:mb-6">
              {settings.hubSettings?.collection?.title || 'Collection'}
            </h1>
            <p className="text-lg md:text-xl font-serif italic text-ink/60 max-w-2xl">{settings.hubSettings?.collection?.description}</p>
          </div>

          {/* Action Group: View Mode Toggle & Filter Toggle Button (Single-line on mobile & desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-auto w-full md:w-auto justify-between md:justify-end shrink-0">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest border transition-all cursor-pointer shrink-0 ${
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-ink text-white border-ink shadow-xs'
                  : 'bg-black/5 text-ink/70 border-black/10 hover:bg-black/10'
              }`}
            >
              <SlidersHorizontal size={12} className="sm:w-[13px] sm:h-[13px]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-cobalt text-white text-[7.5px] sm:text-[8px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center font-mono">
                  {activeFilterCount}
                </span>
              )}
              {isFilterOpen ? <ChevronUp size={11} className="sm:w-3 sm:h-3" /> : <ChevronDown size={11} className="sm:w-3 sm:h-3" />}
            </button>

            {/* View Mode Toggle Controls */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/5 p-0.5 sm:p-1 rounded-none border border-black/10 shrink-0">
              <button
                type="button"
                onClick={() => handleViewModeChange('grid4')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all cursor-pointer rounded-none ${
                  viewMode === 'grid4'
                    ? 'bg-cobalt text-white shadow-xs'
                    : 'text-ink/60 hover:text-ink hover:bg-black/5'
                }`}
                title="Grid View (모바일 2열 / 데스크탑 4열)"
              >
                <LayoutGrid size={11} className="sm:w-[13px] sm:h-[13px]" />
                <span>GRID</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('grid2')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all cursor-pointer rounded-none ${
                  viewMode === 'grid2'
                    ? 'bg-cobalt text-white shadow-xs'
                    : 'text-ink/60 hover:text-ink hover:bg-black/5'
                }`}
                title="Wide View (2-Wide)"
              >
                <Columns2 size={11} className="sm:w-[13px] sm:h-[13px]" />
                <span>WIDE</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all cursor-pointer rounded-none ${
                  viewMode === 'list'
                    ? 'bg-cobalt text-white shadow-xs'
                    : 'text-ink/60 hover:text-ink hover:bg-black/5'
                }`}
                title="List View"
              >
                <List size={11} className="sm:w-[13px] sm:h-[13px]" />
                <span>LIST</span>
              </button>
            </div>
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

      {/* Collapsible Quick Filter Drawer Panel */}
      {isFilterOpen && (
        <div className="bg-white border-b border-black/10 px-6 md:px-12 py-6 animate-in slide-in-from-top-2 duration-300">
          <div className="max-w-[1800px] mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12 divide-y md:divide-y-0 md:divide-x divide-black/5">
              {/* 1. Material Filter */}
              <div className="space-y-3">
                <span className="caption-nano text-cobalt font-black block">Material</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableMaterials.map((mat) => (
                    <button
                      key={mat}
                      type="button"
                      onClick={() => setSelectedMaterial(mat)}
                      className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-none border transition-all cursor-pointer ${
                        selectedMaterial === mat
                          ? 'bg-cobalt text-white border-cobalt shadow-xs'
                          : 'bg-off-white text-ink/70 border-black/10 hover:border-black/30'
                      }`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Color Filter */}
              <div className="space-y-3 pt-6 md:pt-0 md:pl-6 lg:pl-12">
                <span className="caption-nano text-orange font-black block">Color Tone</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableColors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-none border transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedColor === c.name
                          ? 'bg-ink text-white border-ink shadow-xs'
                          : 'bg-off-white text-ink/70 border-black/10 hover:border-black/30'
                      }`}
                    >
                      {c.hex && (
                        <div 
                          className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" 
                          style={{ backgroundColor: c.hex }} 
                        />
                      )}
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Sort Filter */}
              <div className="space-y-3 pt-6 md:pt-0 md:pl-6 lg:pl-12">
                <span className="caption-nano text-ink/60 font-black block">Sort By</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'curated', label: 'Curated' },
                    { id: 'newest', label: 'Newest' },
                    { id: 'name', label: 'Name (A-Z)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortBy(s.id as any)}
                      className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-none border transition-all cursor-pointer ${
                        sortBy === s.id
                          ? 'bg-cobalt text-white border-cobalt shadow-xs'
                          : 'bg-off-white text-ink/70 border-black/10 hover:border-black/30'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions of Filter Panel */}
            {activeFilterCount > 0 && (
              <div className="border-t border-black/5 pt-4 flex items-center justify-between">
                <span className="text-[10px] text-ink/50 uppercase font-mono tracking-wider">
                  {filteredProducts.length} object{filteredProducts.length === 1 ? '' : 's'} found
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-orange hover:underline cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Chips Strip (When active) */}
      {activeFilterCount > 0 && !isFilterOpen && (
        <div className="bg-white border-b border-black/5 px-6 md:px-12 py-2.5 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <span className="text-[9px] uppercase font-bold text-ink/40 tracking-wider mr-1">Active:</span>
          {selectedMaterial !== 'All' && (
            <button
              onClick={() => setSelectedMaterial('All')}
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase font-bold bg-cobalt/10 text-cobalt border border-cobalt/20 hover:bg-cobalt/20 transition-colors"
            >
              <span>Material: {selectedMaterial}</span>
              <X size={10} />
            </button>
          )}
          {selectedColor !== 'All' && (
            <button
              onClick={() => setSelectedColor('All')}
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase font-bold bg-ink/10 text-ink border border-black/20 hover:bg-ink/20 transition-colors"
            >
              <span>Color: {selectedColor}</span>
              <X size={10} />
            </button>
          )}
          {sortBy !== 'curated' && (
            <button
              onClick={() => setSortBy('curated')}
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase font-bold bg-orange/10 text-orange border border-orange/20 hover:bg-orange/20 transition-colors"
            >
              <span>Sort: {sortBy}</span>
              <X size={10} />
            </button>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-[9px] font-mono text-ink/40 hover:text-orange underline uppercase tracking-wider ml-2"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Shared Wishlist Notification Banner (When ?wishlist=id1,id2 is active) */}
      {wishlistIds.length > 0 && (
        <div className="bg-cobalt/10 border-b border-cobalt/20 px-6 md:px-12 py-3 flex items-center justify-between flex-wrap gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Bookmark size={14} className="text-cobalt fill-cobalt" />
            <span className="text-[10px] font-black uppercase tracking-wider text-cobalt">
              Shared Wishlist Archive // Showing {filteredProducts.length} curated objects
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                wishlistIds.forEach(id => {
                  if (!isSaved(id)) toggleWishlist(id);
                });
              }}
              className="px-3 py-1 bg-cobalt text-white text-[9px] font-black uppercase tracking-wider hover:bg-ink transition-colors cursor-pointer"
            >
              + Save All to My Archive
            </button>
            <Link
              to="/collection"
              className="text-[9px] font-bold uppercase tracking-wider text-ink/50 hover:text-ink underline"
            >
              View Full Collection
            </Link>
          </div>
        </div>
      )}

      {/* Main Collection Product Grid / List Section */}
      <div id="collection-grid" className="w-full">
        {/* 1. 4-GRID & 2-LARGE (WIDE) GRID VIEW MODES */}
        {(viewMode === 'grid4' || viewMode === 'grid2') && (
        <div 
          key={`grid-${viewMode}-${activeCategory}`}
          className={`grid ${viewMode === 'grid2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} border-t border-l border-black/10 auto-rows-fr`}
        >
          {filteredProducts.map((product) => (
            <Link 
              to={`/product/${product.id}`}
              key={product.id}
              className={`group border-b border-r border-black/10 ${viewMode === 'grid2' ? 'aspect-[16/11] md:aspect-[4/3]' : 'aspect-[4/5]'} relative overflow-hidden flex flex-col reveal`}
            >
              {/* Category tag overlap on top-left */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 pointer-events-none">
                <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-white/90 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
                  {product.category}
                </span>
              </div>

              {/* Wishlist Bookmark Button on top-right */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWishlist(product.id);
                }}
                className={`absolute top-3 right-3 sm:top-5 sm:right-5 z-30 p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-300 cursor-pointer ${
                  isSaved(product.id)
                    ? 'bg-cobalt text-white shadow-md'
                    : 'bg-black/30 text-white/80 hover:text-white hover:bg-black/60 border border-white/10 opacity-80 sm:opacity-0 group-hover:opacity-100'
                }`}
                title={isSaved(product.id) ? "Remove from Saved" : "Save to Wishlist"}
                aria-label="Save to Wishlist"
              >
                <Bookmark size={12} className={isSaved(product.id) ? "fill-current" : ""} />
              </button>

              {/* Product Name & Subtitle on bottom-left */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-20 pointer-events-none">
                <h2 className="text-sm sm:text-base md:text-xl font-bold font-sans tracking-tight leading-tight text-white drop-shadow-md group-hover:text-cobalt transition-colors truncate">
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
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 2. MINIMALIST LIST VIEW MODE */}
      {viewMode === 'list' && (
        <div className="flex flex-col border-t border-black/10 divide-y divide-black/10 bg-white">
          {filteredProducts.map((product, idx) => (
            <ProductListItem 
              key={product.id} 
              product={product} 
              idx={idx} 
              isSavedProduct={isSaved(product.id)}
              onToggleWishlist={() => toggleWishlist(product.id)}
            />
          ))}
        </div>
      )}
      </div>

      {/* Floating Smart Sub Navigator (Viewport Grid Paging) */}
      <FloatingSectionNavigator mode="viewport" />
    </div>
  );
}

// Subcomponent: ProductListItem with Expandable Options Accordion & Fixed Right Arrow Action
function ProductListItem({ 
  product, 
  idx, 
  isSavedProduct, 
  onToggleWishlist 
}: { 
  key?: React.Key;
  product: Product; 
  idx: number; 
  isSavedProduct: boolean; 
  onToggleWishlist: () => void;
}) {
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);

  // Extract materials
  const materials = React.useMemo(() => {
    if (!product.material) return [];
    return product.material.split(',').map(m => m.trim()).filter(Boolean);
  }, [product.material]);

  // Extract unique colors
  const colorItems = React.useMemo(() => {
    const items: { name: string; hex: string }[] = [];
    const seen = new Set<string>();

    const addCol = (c: any) => {
      if (!c) return;
      const name = typeof c === 'string' ? c.trim() : c.name?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const customHex = typeof c === 'object' ? c.hex : undefined;
      items.push({ name, hex: resolveColorHex(name, customHex) });
    };

    if (product.bodyColors && Array.isArray(product.bodyColors)) product.bodyColors.forEach(addCol);
    if (product.fabricColors && Array.isArray(product.fabricColors)) product.fabricColors.forEach(addCol);
    if (product.color) {
      if (Array.isArray(product.color)) product.color.forEach(addCol);
      else if (typeof product.color === 'string') product.color.split(',').forEach(addCol);
    }
    return items;
  }, [product.bodyColors, product.fabricColors, product.color]);

  const totalOptions = materials.length + colorItems.length;
  const shouldShowAccordion = totalOptions > 3;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-row items-center justify-between p-3.5 sm:p-6 hover:bg-off-white transition-colors duration-200 reveal gap-3 sm:gap-6 relative"
    >
      {/* Left Column: Number, Thumbnail, Name, Category, Subtitle */}
      <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
        <span className="text-[9.5px] sm:text-[10px] font-mono font-bold text-cobalt tracking-widest shrink-0 w-6 sm:w-8">
          {String(idx + 1).padStart(2, '0')}
        </span>
        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-silver/10 overflow-hidden shrink-0 border border-black/5 relative">
          <MediaRenderer
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
            <h2 className="text-sm sm:text-xl font-bold font-sans tracking-tight text-ink group-hover:text-cobalt transition-colors truncate max-w-[200px] sm:max-w-md">
              {product.name}
            </h2>
            <span className="caption-nano text-orange px-1.5 sm:px-2 py-0.5 border border-orange/30 rounded-full font-bold shrink-0 text-[7.5px] sm:text-[9px]">
              {product.category}
            </span>
          </div>
          {product.subTitle && (
            <p className="text-[11px] sm:text-xs font-serif italic text-ink/50 truncate max-w-xs sm:max-w-md">
              {product.subTitle}
            </p>
          )}

          {/* Inline Options (Materials & Colors) with Accordion Expansion */}
          {totalOptions > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 flex-wrap">
              {/* Materials */}
              {(isOptionsExpanded ? materials : materials.slice(0, 2)).map(mat => (
                <span key={`mat-${mat}`} className="text-[8px] sm:text-[9px] font-sans font-bold tracking-wider uppercase bg-ink/5 text-ink/60 px-1.5 sm:px-2 py-0.5 rounded-[2px] border border-black/5">
                  {mat}
                </span>
              ))}

              {/* Colors */}
              {(isOptionsExpanded ? colorItems : colorItems.slice(0, materials.length > 0 ? 2 : 4)).map(c => (
                <div 
                  key={`col-${c.name}`} 
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-black/15 shadow-2xs shrink-0" 
                  style={{ backgroundColor: c.hex }} 
                  title={c.name}
                />
              ))}

              {/* Accordion Toggle Button for Many Options */}
              {shouldShowAccordion && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOptionsExpanded(!isOptionsExpanded);
                  }}
                  className="text-[8px] sm:text-[9px] font-mono font-bold uppercase text-cobalt hover:underline px-1 py-0.5 cursor-pointer shrink-0"
                >
                  {isOptionsExpanded ? '[- 접기]' : `[+${totalOptions - 2} more]`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Always Fixed Position (Wishlist + View Arrow) */}
      <div className="shrink-0 ml-auto self-center flex items-center gap-1.5 sm:gap-4 pl-2">
        {/* Wishlist button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWishlist();
          }}
          className={`p-1.5 sm:p-2 transition-colors rounded-none cursor-pointer ${
            isSavedProduct ? 'text-cobalt' : 'text-ink/30 hover:text-cobalt'
          }`}
          title={isSavedProduct ? "Remove from Saved" : "Save to Wishlist"}
          aria-label="Save to Wishlist"
        >
          <Bookmark size={15} className={isSavedProduct ? "fill-cobalt" : ""} />
        </button>

        {/* View Action (On desktop: "View Object ->", On mobile: only "->") */}
        <div className="flex items-center gap-1.5 text-ink/40 group-hover:text-cobalt text-[10px] uppercase font-black tracking-widest shrink-0">
          <span className="hidden sm:inline">View Object</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
