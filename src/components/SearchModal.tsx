import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Layers, Box, BookOpen } from "lucide-react";
import { getProducts, getSpaces, getJournals, Product, SpaceModel, JournalArticle, Category } from "../lib/data";
import { MediaRenderer } from "./MediaRenderer";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_TAGS = ['Chairs', 'Furniture', 'Lighting', 'Objects', 'Oak', 'Steel', 'Ash', 'Leather'];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'products' | 'spaces' | 'journals'>('all');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load all data on mount
  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
    getSpaces().then(setSpaces).catch(console.error);
    getJournals().then(setJournals).catch(console.error);
  }, []);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setActiveFilter('all');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Global ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Filtered matching items
  const matchedProducts = q
    ? products.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subTitle && p.subTitle.toLowerCase().includes(q)) ||
        (p.material && p.material.toLowerCase().includes(q))
      )
    : products.slice(0, 4);

  const matchedSpaces = q
    ? spaces.filter(s => 
        s.title.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
      )
    : spaces.slice(0, 2);

  const matchedJournals = q
    ? journals.filter(j => 
        j.title.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q)) ||
        (j.category && j.category.toLowerCase().includes(q))
      )
    : journals.slice(0, 2);

  const totalResults = matchedProducts.length + matchedSpaces.length + matchedJournals.length;

  const handleSelectQuickTag = (tag: string) => {
    setQuery(tag);
    inputRef.current?.focus();
  };

  const handleSearchSubmit = () => {
    if (!q) return;
    navigate(`/collection?search=${encodeURIComponent(q)}`);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 md:pt-20 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-3xl bg-white border border-black/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-6 border-b border-black/10 flex items-center gap-3.5 bg-off-white/80">
          <Search size={20} className="text-cobalt shrink-0" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search products, spaces, materials, journals..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit();
            }}
            className="w-full bg-transparent border-none outline-none text-sm sm:text-base font-sans font-medium uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-ink/40 text-ink"
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="text-ink/40 hover:text-orange transition-colors p-1"
              aria-label="Clear query"
            >
              <X size={16} />
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-2.5 py-1 text-[10px] uppercase font-mono font-bold tracking-widest text-ink/50 hover:text-ink border border-black/10 bg-white"
          >
            ESC
          </button>
        </div>

        {/* Quick Tag Chips & Filter Tabs */}
        <div className="px-4 sm:px-6 py-3 border-b border-black/5 bg-white flex flex-wrap items-center justify-between gap-2">
          {/* Quick Tags */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto hide-scrollbar">
            <span className="text-[9px] uppercase tracking-wider font-bold text-ink/40 mr-1">Popular:</span>
            {QUICK_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSelectQuickTag(tag)}
                className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-none border transition-colors cursor-pointer ${
                  query.toLowerCase() === tag.toLowerCase()
                    ? 'bg-cobalt text-white border-cobalt'
                    : 'bg-off-white text-ink/70 border-black/10 hover:border-black/30'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          {query.trim().length > 0 && (
            <div className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-ink/50">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 ${activeFilter === 'all' ? 'text-cobalt font-black' : 'hover:text-ink'}`}
              >
                All ({totalResults})
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setActiveFilter('products')}
                className={`px-2 py-0.5 ${activeFilter === 'products' ? 'text-cobalt font-black' : 'hover:text-ink'}`}
              >
                Products ({matchedProducts.length})
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setActiveFilter('spaces')}
                className={`px-2 py-0.5 ${activeFilter === 'spaces' ? 'text-cobalt font-black' : 'hover:text-ink'}`}
              >
                Spaces ({matchedSpaces.length})
              </button>
            </div>
          )}
        </div>

        {/* Search Results Area */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-8 divide-y divide-black/5">
          {/* 1. Products Section */}
          {(activeFilter === 'all' || activeFilter === 'products') && matchedProducts.length > 0 && (
            <div className="space-y-3 first:pt-0">
              <div className="flex items-center justify-between">
                <span className="caption-nano text-cobalt font-black flex items-center gap-1.5">
                  <Box size={12} />
                  <span>Objects & Collection ({matchedProducts.length})</span>
                </span>
                {matchedProducts.length > 4 && (
                  <Link
                    to={`/collection?search=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="text-[9px] uppercase font-bold tracking-widest text-ink/40 hover:text-cobalt flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight size={10} />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedProducts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 p-2.5 bg-off-white/60 hover:bg-cobalt/5 border border-black/5 hover:border-cobalt/30 transition-all"
                  >
                    <div className="w-12 h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                      <MediaRenderer src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs uppercase tracking-tight text-ink group-hover:text-cobalt transition-colors truncate">
                          {p.name}
                        </span>
                        <span className="text-[8px] font-bold uppercase text-orange/80 bg-orange/5 px-1.5 py-0.5 shrink-0">
                          {p.category}
                        </span>
                      </div>
                      {p.subTitle && (
                        <p className="text-[10px] font-serif italic text-ink/50 truncate">
                          {p.subTitle}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 2. Spaces Section */}
          {(activeFilter === 'all' || activeFilter === 'spaces') && matchedSpaces.length > 0 && (
            <div className="space-y-3 pt-6">
              <span className="caption-nano text-orange font-black flex items-center gap-1.5">
                <Layers size={12} />
                <span>Spaces ({matchedSpaces.length})</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedSpaces.map((s) => (
                  <Link
                    key={s.id}
                    to={`/space/${s.id}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 p-2.5 bg-off-white/60 hover:bg-orange/5 border border-black/5 hover:border-orange/30 transition-all"
                  >
                    <div className="w-12 h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                      <MediaRenderer src={s.images?.[0] || ''} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs uppercase tracking-tight text-ink group-hover:text-orange transition-colors truncate block">
                        {s.title}
                      </span>
                      {s.description && (
                        <p className="text-[10px] font-serif italic text-ink/50 truncate">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. Journals Section */}
          {(activeFilter === 'all' || activeFilter === 'journals') && matchedJournals.length > 0 && (
            <div className="space-y-3 pt-6">
              <span className="caption-nano text-cobalt font-black flex items-center gap-1.5">
                <BookOpen size={12} />
                <span>Journal Articles ({matchedJournals.length})</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedJournals.map((j) => (
                  <Link
                    key={j.id}
                    to={`/journal/${j.id}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 p-2.5 bg-off-white/60 hover:bg-cobalt/5 border border-black/5 hover:border-cobalt/30 transition-all"
                  >
                    <div className="w-12 h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                      <MediaRenderer src={j.image || ''} alt={j.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs uppercase tracking-tight text-ink group-hover:text-cobalt transition-colors truncate block">
                        {j.title}
                      </span>
                      {j.description && (
                        <p className="text-[10px] font-serif italic text-ink/50 truncate">
                          {j.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No Results Found */}
          {query.trim().length > 0 && totalResults === 0 && (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs uppercase tracking-widest font-black text-ink/40">No matching results found for "{query}"</p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[10px] font-bold uppercase tracking-wider text-cobalt underline cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-6 py-3 bg-off-white border-t border-black/5 flex items-center justify-between text-[9px] uppercase tracking-widest text-ink/40 font-mono">
          <span>Press ESC or Click Outside to Close</span>
          <span>AMPH STUDIO SEARCH</span>
        </div>
      </div>
    </div>
  );
}
