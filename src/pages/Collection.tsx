import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProducts, Product, Category, getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

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
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');
  const categoryQuery = searchParams.get('category');

  useScrollReveal();

  useEffect(() => {
    getProducts().then(setProducts);
    getHomeSettings().then(setSettings);
    document.title = "Collection — Amph";
  }, []);

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
          <h1 className="text-4xl md:text-6xl font-medium tracking-tighter uppercase font-sans leading-[0.9] mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-black/10 auto-rows-fr">
        {filteredProducts.map((product) => (
          <Link 
            to={`/product/${product.id}`}
            key={product.id}
            className="group border-b border-r border-black/10 aspect-[4/5] relative overflow-hidden flex flex-col reveal"
          >
            {/* Category tag overlap on top-left */}
            <div className="absolute top-6 left-6 z-20 pointer-events-none">
              <span className="text-[9px] uppercase font-bold tracking-widest text-white/90 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
                {product.category}
              </span>
            </div>

            {/* Product Name overlap on bottom-left */}
            <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
              <h2 className="text-sm md:text-base font-bold font-sans tracking-tight leading-tight text-white drop-shadow-md group-hover:text-cobalt transition-colors">
                {product.name}
              </h2>
            </div>
            
            {/* Full-bleed Image Container */}
            <div className="absolute inset-0 w-full h-full bg-silver/5 overflow-hidden rounded-none">
              {/* Primary Image */}
              <MediaRenderer 
                src={product.images[0]} 
                alt={product.name}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${product.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`}
                loading="lazy"
                nopin="nopin"
              />
              {/* Secondary Hover Image */}
              {product.hoverImages?.[0] && (
                <MediaRenderer 
                  src={product.hoverImages[0]} 
                  alt={`${product.name} alternative view`}
                  className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-1000 ease-in-out group-hover:opacity-100 group-hover:scale-100 scale-95"
                  loading="lazy"
                  nopin="nopin"
                />
              )}
              {/* Subtle hover tint layer for text readability */}
              <div className="absolute inset-0 bg-black/[0.08] group-hover:bg-black/30 transition-all duration-700 z-10 pointer-events-none" />
            </div>
          </Link>
        ))}
      </div>
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
    const colorMap: Record<string, string> = {
      'Oak': '#d7c29d',
      'Ash': '#e5dec9',
      'Walnut': '#4b382a',
      'Steel': '#8a9597',
      'Black': '#1c1c1c',
      'White': '#ffffff',
      'Cobalt': '#0047AB',
      'Orange': '#FF4500',
      'Pink': '#F8BBD0',
      'Silver': '#E0E0E2',
      'Gray': '#808080',
      'Charcoal': '#36454F',
      'Cream': '#FFFDD0',
      'Beige': '#F5F5DC',
      'Natural': '#e8d8c1'
    };

    const colors = product.color.split(',').map(c => c.trim());
    colors.forEach(col => {
      const hex = colorMap[col] || colorMap[col.charAt(0).toUpperCase() + col.slice(1).toLowerCase()];
      if (hex) {
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
