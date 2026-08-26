import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, Layers, Box, BookOpen, Clock, Trash2, CornerDownLeft } from "lucide-react";
import { getProducts, getSpaces, getJournals, Product, SpaceModel, JournalArticle } from "../lib/data";
import { MediaRenderer } from "./MediaRenderer";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_TAGS = ['Chairs', 'Furniture', 'Lighting', 'Objects', 'Oak', 'Steel', 'Ash', 'Leather'];
const RECENT_SEARCHES_KEY = 'amph_recent_searches';

function highlightMatch(text: string, query: string) {
  if (!query.trim() || !text) return text;
  const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-cobalt font-black underline underline-offset-2">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'products' | 'spaces' | 'journals'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      setRecentSearches([]);
    }
  };

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const existing = recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...existing].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter(s => s.toLowerCase() !== term.toLowerCase());
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Load all data on mount
  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
    getSpaces().then(setSpaces).catch(console.error);
    getJournals().then(setJournals).catch(console.error);
    loadRecentSearches();
  }, []);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      loadRecentSearches();
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setActiveFilter('all');
      setSelectedIndex(-1);
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

  // Flatten active visible results for keyboard navigation
  const visibleItems: { type: 'product' | 'space' | 'journal'; id: string; url: string }[] = [];
  if (activeFilter === 'all' || activeFilter === 'products') {
    matchedProducts.forEach(p => visibleItems.push({ type: 'product', id: p.id, url: `/product/${p.id}` }));
  }
  if (activeFilter === 'all' || activeFilter === 'spaces') {
    matchedSpaces.forEach(s => visibleItems.push({ type: 'space', id: s.id, url: `/space/${s.id}` }));
  }
  if (activeFilter === 'all' || activeFilter === 'journals') {
    matchedJournals.forEach(j => visibleItems.push({ type: 'journal', id: j.id, url: `/journal/${j.id}` }));
  }

  const totalResults = matchedProducts.length + matchedSpaces.length + matchedJournals.length;

  const handleSelectQuickTag = (tag: string) => {
    setQuery(tag);
    saveRecentSearch(tag);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSearchSubmit = () => {
    if (selectedIndex >= 0 && selectedIndex < visibleItems.length) {
      const selected = visibleItems[selectedIndex];
      if (q) saveRecentSearch(q);
      navigate(selected.url);
      onClose();
      return;
    }

    if (!q) return;
    saveRecentSearch(q);
    navigate(`/collection?search=${encodeURIComponent(q)}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleItems.length > 0) {
        setSelectedIndex(prev => (prev + 1) % visibleItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleItems.length > 0) {
        setSelectedIndex(prev => (prev - 1 + visibleItems.length) % visibleItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
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
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-sm sm:text-base font-sans font-medium uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-ink/40 text-ink"
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); setSelectedIndex(-1); inputRef.current?.focus(); }}
              className="text-ink/40 hover:text-orange transition-colors p-1 cursor-pointer"
              aria-label="Clear query"
            >
              <X size={16} />
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-2.5 py-1 text-[10px] uppercase font-mono font-bold tracking-widest text-ink/50 hover:text-ink border border-black/10 bg-white cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Quick Tag Chips & Recent Searches */}
        <div className="px-4 sm:px-6 py-3 border-b border-black/5 bg-white space-y-2.5">
          {/* Recent Searches (When Available) */}
          {recentSearches.length > 0 && !query && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-black/5">
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto hide-scrollbar">
                <span className="text-[9px] uppercase tracking-wider font-black text-cobalt flex items-center gap-1 mr-1">
                  <Clock size={11} /> Recent:
                </span>
                {recentSearches.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSelectQuickTag(term)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-none border border-black/10 bg-black/5 text-ink hover:border-cobalt hover:text-cobalt transition-colors cursor-pointer group"
                  >
                    <span>{term}</span>
                    <span 
                      onClick={(e) => removeRecentSearch(term, e)}
                      className="text-ink/30 group-hover:text-orange hover:bg-black/10 p-0.5 rounded-none"
                    >
                      <X size={9} />
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={clearAllRecentSearches}
                className="text-[8.5px] font-mono text-ink/40 hover:text-orange uppercase tracking-wider cursor-pointer flex items-center gap-0.5 shrink-0"
              >
                <Trash2 size={10} /> Clear
              </button>
            </div>
          )}

          {/* Quick Tags & Type Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                  onClick={() => { setActiveFilter('all'); setSelectedIndex(-1); }}
                  className={`px-2 py-0.5 cursor-pointer ${activeFilter === 'all' ? 'text-cobalt font-black' : 'hover:text-ink'}`}
                >
                  All ({totalResults})
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => { setActiveFilter('products'); setSelectedIndex(-1); }}
                  className={`px-2 py-0.5 cursor-pointer ${activeFilter === 'products' ? 'text-cobalt font-black' : 'hover:text-ink'}`}
                >
                  Products ({matchedProducts.length})
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => { setActiveFilter('spaces'); setSelectedIndex(-1); }}
                  className={`px-2 py-0.5 cursor-pointer ${activeFilter === 'spaces' ? 'text-cobalt font-black' : 'hover:text-ink'}`}
                >
                  Spaces ({matchedSpaces.length})
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => { setActiveFilter('journals'); setSelectedIndex(-1); }}
                  className={`px-2 py-0.5 cursor-pointer ${activeFilter === 'journals' ? 'text-cobalt font-black' : 'hover:text-ink'}`}
                >
                  Journals ({matchedJournals.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Results Area */}
        <div ref={resultsContainerRef} className="overflow-y-auto p-4 sm:p-6 space-y-8 divide-y divide-black/5">
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
                    onClick={() => {
                      if (query) saveRecentSearch(query);
                      onClose();
                    }}
                    className="text-[9px] uppercase font-bold tracking-widest text-ink/40 hover:text-cobalt flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight size={10} />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedProducts.map((p) => {
                  const itemIndex = visibleItems.findIndex(v => v.id === p.id);
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <Link
                      key={p.id}
                      to={`/product/${p.id}`}
                      onClick={() => {
                        if (query) saveRecentSearch(query);
                        onClose();
                      }}
                      className={`group flex items-center gap-3 p-2.5 border transition-all ${
                        isSelected 
                          ? 'bg-cobalt/10 border-cobalt ring-1 ring-cobalt shadow-xs' 
                          : 'bg-off-white/60 hover:bg-cobalt/5 border-black/5 hover:border-cobalt/30'
                      }`}
                    >
                      <div className="w-12 h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                        <MediaRenderer src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs uppercase tracking-tight text-ink group-hover:text-cobalt transition-colors truncate">
                            {highlightMatch(p.name, query)}
                          </span>
                          <span className="text-[8px] font-bold uppercase text-orange/80 bg-orange/5 px-1.5 py-0.5 shrink-0">
                            {p.category}
                          </span>
                        </div>
                        {p.subTitle && (
                          <p className="text-[10px] font-serif italic text-ink/50 truncate">
                            {highlightMatch(p.subTitle, query)}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
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
                {matchedSpaces.map((s) => {
                  const itemIndex = visibleItems.findIndex(v => v.id === s.id);
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <Link
                      key={s.id}
                      to={`/space/${s.id}`}
                      onClick={() => {
                        if (query) saveRecentSearch(query);
                        onClose();
                      }}
                      className={`group flex items-center gap-3 p-2.5 border transition-all ${
                        isSelected 
                          ? 'bg-orange/10 border-orange ring-1 ring-orange shadow-xs' 
                          : 'bg-off-white/60 hover:bg-orange/5 border-black/5 hover:border-orange/30'
                      }`}
                    >
                      <div className="w-12 h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                        <MediaRenderer src={s.images?.[0] || ''} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs uppercase tracking-tight text-ink group-hover:text-orange transition-colors truncate block">
                          {highlightMatch(s.title, query)}
                        </span>
                        {s.description && (
                          <p className="text-[10px] font-serif italic text-ink/50 truncate">
                            {highlightMatch(s.description, query)}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
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
                {matchedJournals.map((j) => {
                  const itemIndex = visibleItems.findIndex(v => v.id === j.id);
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <Link
                      key={j.id}
                      to={`/journal/${j.id}`}
                      onClick={() => {
                        if (query) saveRecentSearch(query);
                        onClose();
                      }}
                      className={`group flex items-center gap-3 p-2.5 border transition-all ${
                        isSelected 
                          ? 'bg-cobalt/10 border-cobalt ring-1 ring-cobalt shadow-xs' 
                          : 'bg-off-white/60 hover:bg-cobalt/5 border-black/5 hover:border-cobalt/30'
                      }`}
                    >
                      <div className="w-12 h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                        <MediaRenderer src={j.image || ''} alt={j.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs uppercase tracking-tight text-ink group-hover:text-cobalt transition-colors truncate block">
                          {highlightMatch(j.title, query)}
                        </span>
                        {j.description && (
                          <p className="text-[10px] font-serif italic text-ink/50 truncate">
                            {highlightMatch(j.description, query)}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results Found */}
          {query.trim().length > 0 && totalResults === 0 && (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs uppercase tracking-widest font-black text-ink/40">No matching results found for "{query}"</p>
              <button
                type="button"
                onClick={() => { setQuery(''); setSelectedIndex(-1); }}
                className="text-[10px] font-bold uppercase tracking-wider text-cobalt underline cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>

        {/* Footer Hint with Keyboard shortcuts */}
        <div className="px-6 py-3 bg-off-white border-t border-black/5 flex flex-wrap items-center justify-between text-[9px] uppercase tracking-widest text-ink/40 font-mono gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.5 border border-black/15 bg-white text-[8px]">↑</span>
              <span className="px-1 py-0.5 border border-black/15 bg-white text-[8px]">↓</span> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={10} /> Select
            </span>
            <span>ESC Close</span>
          </div>
          <span>AMPH STUDIO SEARCH</span>
        </div>
      </div>
    </div>
  );
}
