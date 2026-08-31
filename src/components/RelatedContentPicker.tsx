import React, { useState, useMemo } from 'react';
import { Search, Video, X } from 'lucide-react';

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  category?: string;
}

interface RelatedContentPickerProps {
  title: string;
  items: PickerItem[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  searchPlaceholder?: string;
  className?: string;
}

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.ogg');
}

export function RelatedContentPicker({
  title,
  items,
  selectedIds = [],
  onChange,
  searchPlaceholder = "Search by title, category...",
  className = ""
}: RelatedContentPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Safe array
  const safeSelectedIds = useMemo(() => Array.isArray(selectedIds) ? selectedIds : [], [selectedIds]);

  // If showOnlySelected is active but user clears all items, reset back to show all
  const effectiveShowOnlySelected = showOnlySelected && safeSelectedIds.length > 0;

  // Filter items based on search query and showOnlySelected toggle
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      if (effectiveShowOnlySelected && !safeSelectedIds.includes(item.id)) {
        return false;
      }
      if (!q) return true;
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchCategory = item.category?.toLowerCase().includes(q);
      return matchTitle || matchSubtitle || matchCategory;
    });
  }, [items, searchQuery, effectiveShowOnlySelected, safeSelectedIds]);

  const handleToggle = (id: string) => {
    if (safeSelectedIds.includes(id)) {
      onChange(safeSelectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...safeSelectedIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const toAdd = filteredItems.map(i => i.id).filter(id => !safeSelectedIds.includes(id));
    onChange([...safeSelectedIds, ...toAdd]);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredItems.map(i => i.id));
    onChange(safeSelectedIds.filter(id => !filteredIds.has(id)));
  };

  return (
    <div className={`border border-black/10 bg-black/[0.02] p-3 sm:p-4 rounded-none space-y-3 select-none ${className}`}>
      {/* Top Header: Title & Constant Position Segmented Control to Prevent Any Layout Shifts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-black/5 pb-2.5 min-h-[34px]">
        {/* Title */}
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[10.5px] uppercase tracking-wider text-cobalt">{title}</h3>
        </div>

        {/* Action Bar with FIXED Width/Position Segmented Filter & Batch Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 text-[9px] font-mono shrink-0">
          {/* Constant 2-Option Segmented Filter (Never pops in/out, preventing line wrap shifts) */}
          <div className="inline-flex items-center bg-black/5 p-0.5 border border-black/10 rounded-[2px] shrink-0">
            <button
              type="button"
              onClick={() => setShowOnlySelected(false)}
              className={`px-2 py-0.5 font-bold uppercase transition-all cursor-pointer rounded-[2px] ${
                !effectiveShowOnlySelected
                  ? 'bg-white text-cobalt shadow-2xs'
                  : 'text-ink/50 hover:text-ink'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              disabled={safeSelectedIds.length === 0}
              onClick={() => setShowOnlySelected(true)}
              className={`px-2 py-0.5 font-bold uppercase transition-all rounded-[2px] ${
                effectiveShowOnlySelected
                  ? 'bg-cobalt text-white shadow-2xs'
                  : safeSelectedIds.length === 0
                    ? 'text-ink/30 cursor-not-allowed'
                    : 'text-ink/60 hover:text-cobalt cursor-pointer'
              }`}
            >
              Selected ({safeSelectedIds.length})
            </button>
          </div>

          {/* Fixed Batch Text Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-ink/60 hover:text-cobalt underline cursor-pointer px-1 py-0.5"
            >
              Select All
            </button>
            <span className="text-black/20">|</span>
            <button
              type="button"
              onClick={handleDeselectAllFiltered}
              className="text-ink/60 hover:text-red-500 underline cursor-pointer px-1 py-0.5"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar Input */}
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2.5 text-ink/40 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-black/15 outline-none focus:border-cobalt transition-colors placeholder:text-ink/30 font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 text-ink/40 hover:text-ink cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Items Grid: 2-Column Wide Grid for Generous Title Width without Truncation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border border-black/10 bg-white/70">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-8 text-center text-ink/40 text-xs font-mono">
            {searchQuery ? `No matches found for "${searchQuery}"` : "No items available"}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = safeSelectedIds.includes(item.id);
            const isVideo = isVideoUrl(item.image);

            return (
              <label
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className={`flex items-center gap-2.5 p-2 border transition-all cursor-pointer group rounded-[2px] ${
                  isSelected
                    ? 'border-cobalt/70 bg-cobalt/[0.06] shadow-xs ring-1 ring-cobalt/30'
                    : 'border-black/5 bg-white hover:border-black/20 hover:bg-black/[0.02]'
                }`}
                title={item.title}
              >
                {/* Checkbox indicator */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(item.id)}
                  className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt cursor-pointer shrink-0"
                />

                {/* Compact Still Thumbnail */}
                <div className="w-8 h-8 bg-black/5 border border-black/10 overflow-hidden relative shrink-0 flex items-center justify-center rounded-[2px]">
                  {item.image ? (
                    isVideo ? (
                      <>
                        <video
                          src={`${item.image}#t=0.1`}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-none pointer-events-none">
                          <Video size={7} />
                        </div>
                      </>
                    ) : (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    )
                  ) : (
                    <span className="text-[9px] font-bold text-ink/30 font-mono">
                      {item.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Generous Text Area: 2-column gives ample horizontal room */}
                <div className="flex-1 min-w-0 pr-1">
                  <p 
                    className={`text-[11px] leading-tight font-bold uppercase line-clamp-2 transition-colors break-words ${
                      isSelected ? 'text-cobalt' : 'text-ink group-hover:text-cobalt'
                    }`}
                  >
                    {item.title}
                  </p>
                  {(item.category || item.subtitle) && (
                    <p className="text-[8.5px] leading-tight text-ink/45 truncate font-mono mt-0.5">
                      {item.category || item.subtitle}
                    </p>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
