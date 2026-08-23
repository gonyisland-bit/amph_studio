import React, { useState, useRef } from "react";
import { HotspotPin, Product } from "../lib/data";
import { MediaRenderer } from "./MediaRenderer";
import { X, Plus, Trash2, Check, MapPin, Search, Layers, Eye } from "lucide-react";

interface AdminHotspotEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
  hotspots?: HotspotPin[];
  onSaveHotspots: (updated: HotspotPin[]) => void;
  products: Product[];
  initialAspectMode?: 'story' | 'hero' | 'natural';
}

export function AdminHotspotEditor({
  isOpen,
  onClose,
  imageSrc,
  title = "Manage Hotspot Pins",
  hotspots = [],
  onSaveHotspots,
  products = [],
  initialAspectMode = 'story'
}: AdminHotspotEditorProps) {
  const [pins, setPins] = useState<HotspotPin[]>(() => JSON.parse(JSON.stringify(hotspots || [])));
  const [selectedPinId, setSelectedPinId] = useState<string | null>(() => (hotspots && hotspots[0]?.id) || null);
  const [productSearch, setProductSearch] = useState("");
  const [aspectMode, setAspectMode] = useState<'story' | 'hero' | 'natural'>(initialAspectMode);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 1000) / 10));
    const percentY = Math.max(0, Math.min(100, Math.round((clickY / rect.height) * 1000) / 10));

    const newPin: HotspotPin = {
      id: `pin-${Date.now()}`,
      productId: products[0]?.id || "",
      x: percentX,
      y: percentY,
      label: ""
    };

    setPins(prev => [...prev, newPin]);
    setSelectedPinId(newPin.id);
  };

  const handleUpdatePinProduct = (pinId: string, productId: string) => {
    setPins(prev => prev.map(p => p.id === pinId ? { ...p, productId } : p));
  };

  const handleDeletePin = (pinId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPins(prev => prev.filter(p => p.id !== pinId));
    if (selectedPinId === pinId) {
      const remaining = pins.filter(p => p.id !== pinId);
      setSelectedPinId(remaining[0]?.id || null);
    }
  };

  const handleSave = () => {
    onSaveHotspots(pins);
    onClose();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
    (p.material && p.material.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const selectedPin = pins.find(p => p.id === selectedPinId);

  // Aspect ratio container styles matching public pages
  let aspectContainerClass = "aspect-[4/3] w-full max-w-2xl";
  if (aspectMode === 'hero') {
    aspectContainerClass = "aspect-[16/9] w-full max-w-3xl";
  } else if (aspectMode === 'natural') {
    aspectContainerClass = "max-w-full max-h-[60vh]";
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Editor Modal Window */}
      <div className="relative w-full max-w-6xl bg-white border border-black/15 shadow-2xl z-10 flex flex-col max-h-[94vh] overflow-hidden rounded-none animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 flex flex-wrap items-center justify-between bg-off-white gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-cobalt rounded-full"></div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-ink font-sans">
                {title}
              </h3>
              <p className="text-[10px] text-ink/50 font-serif italic mt-0.5">
                Click on the framed image below to plot product pins with exact coordinate accuracy.
              </p>
            </div>
          </div>

          {/* Aspect Ratio Framing Switcher */}
          <div className="flex items-center gap-1 bg-black/5 p-1 border border-black/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-ink/40 px-2 font-mono hidden sm:inline">
              Framing Ratio:
            </span>
            <button
              type="button"
              onClick={() => setAspectMode('story')}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                aspectMode === 'story' ? 'bg-cobalt text-white shadow-xs' : 'text-ink/60 hover:text-ink'
              }`}
              title="Editorial Story 4:3 Crop (Matches story grid exactly)"
            >
              Story (4:3)
            </button>
            <button
              type="button"
              onClick={() => setAspectMode('hero')}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                aspectMode === 'hero' ? 'bg-cobalt text-white shadow-xs' : 'text-ink/60 hover:text-ink'
              }`}
              title="Hero Cover Wide Crop (Matches hero cover header)"
            >
              Hero (16:9)
            </button>
            <button
              type="button"
              onClick={() => setAspectMode('natural')}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                aspectMode === 'natural' ? 'bg-cobalt text-white shadow-xs' : 'text-ink/60 hover:text-ink'
              }`}
              title="Full Original View"
            >
              Original
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="bg-cobalt hover:bg-ink text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer rounded-none shadow-xs"
            >
              <Check size={13} />
              <span>Apply Pins ({pins.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-ink/50 hover:text-ink hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Workspace Body: Visual Canvas (Left) + Searchable Product Selector (Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Visual Interactive Image Area */}
          <div className="lg:col-span-7 p-4 sm:p-8 bg-silver/15 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-black/10 overflow-hidden select-none">
            <div 
              ref={imageContainerRef}
              onClick={handleImageClick}
              className={`relative overflow-hidden cursor-crosshair border border-black/20 shadow-lg group select-none bg-black/5 ${aspectContainerClass}`}
            >
              <MediaRenderer
                src={imageSrc}
                alt="Hotspot target"
                className={`w-full h-full ${aspectMode === 'natural' ? 'object-contain' : 'object-cover'} block`}
              />

              {/* Pins on top of Image */}
              {pins.map((pin, idx) => {
                const isSelected = selectedPinId === pin.id;
                const prod = products.find(p => p.id === pin.productId);

                return (
                  <div
                    key={pin.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPinId(pin.id);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer z-20"
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-200 shadow-xl border-2 ${
                      isSelected 
                        ? 'bg-cobalt text-white border-white scale-125 ring-4 ring-cobalt/40' 
                        : 'bg-black/85 text-white border-white/80 hover:scale-110'
                    }`}>
                      {idx + 1}
                    </div>
                    {/* Hover Badge */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap bg-black/90 text-white text-[9px] px-2 py-0.5 pointer-events-none font-bold uppercase tracking-wider shadow-md">
                      {prod ? prod.name : `Pin #${idx + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between w-full max-w-2xl mt-3 text-[10px] font-mono text-ink/50 uppercase tracking-wider">
              <span>✦ Click on canvas to drop pin</span>
              <span>Mode: {aspectMode.toUpperCase()}</span>
            </div>
          </div>

          {/* Product Auto-Complete & Pin Management Sidebar */}
          <div className="lg:col-span-5 p-4 sm:p-6 space-y-4 bg-white flex flex-col justify-between overflow-hidden">
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Placed Pins Tabs Strip */}
              <div className="flex items-center justify-between border-b border-black/10 pb-2 shrink-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-ink font-mono">
                  Plotted Pins ({pins.length})
                </span>
                {pins.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPins([]);
                      setSelectedPinId(null);
                    }}
                    className="text-[9px] text-orange hover:underline font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {pins.length === 0 ? (
                <div className="py-16 text-center text-ink/40 space-y-2">
                  <MapPin size={28} className="mx-auto opacity-30 text-cobalt" />
                  <p className="text-xs font-serif italic text-ink/70">No hotspot pins plotted yet.</p>
                  <p className="text-[10px] font-sans">Click on the image to the left to drop your first product pin.</p>
                </div>
              ) : (
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  {/* Pin Selection Pills */}
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {pins.map((pin, idx) => {
                      const isSelected = selectedPinId === pin.id;
                      const boundProd = products.find(p => p.id === pin.productId);
                      return (
                        <button
                          key={pin.id}
                          type="button"
                          onClick={() => setSelectedPinId(pin.id)}
                          className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-cobalt text-white border-cobalt shadow-xs' 
                              : 'bg-off-white text-ink border-black/15 hover:border-black/30'
                          }`}
                        >
                          <span>#{idx + 1}</span>
                          <span className="max-w-[90px] truncate">{boundProd?.name || 'Unassigned'}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Pin Edit Panel */}
                  {selectedPin && (
                    <div className="p-3.5 border border-cobalt/40 bg-cobalt/5 space-y-3 flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between shrink-0">
                        <span className="text-[10px] font-mono font-bold text-cobalt flex items-center gap-1.5">
                          <MapPin size={12} />
                          <span>Pin #{pins.findIndex(p => p.id === selectedPin.id) + 1} (X: {selectedPin.x}%, Y: {selectedPin.y}%)</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePin(selectedPin.id, e)}
                          className="text-orange text-[9px] font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Delete Pin</span>
                        </button>
                      </div>

                      {/* Searchable Product Dropdown / Auto-Complete */}
                      <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                        <label className="block text-[8px] font-black uppercase text-ink/50 tracking-wider">
                          Assign AMPH Product (Search with Live Preview)
                        </label>

                        {/* Search Input Box */}
                        <div className="relative shrink-0">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Type product name, category, or code..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-black/20 text-ink outline-none focus:border-cobalt rounded-none"
                          />
                          {productSearch && (
                            <button
                              type="button"
                              onClick={() => setProductSearch("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-[10px]"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Product List with Mini-Thumbnails */}
                        <div className="flex-1 overflow-y-auto divide-y divide-black/5 border border-black/10 bg-white max-h-[36vh]">
                          {filteredProducts.length === 0 ? (
                            <p className="p-4 text-center text-[10px] text-ink/40 font-serif italic">No matching products found.</p>
                          ) : (
                            filteredProducts.map((p) => {
                              const isBound = selectedPin.productId === p.id;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleUpdatePinProduct(selectedPin.id, p.id)}
                                  className={`p-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                    isBound 
                                      ? 'bg-cobalt/10 border-l-4 border-cobalt' 
                                      : 'hover:bg-off-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="w-9 h-9 bg-silver/20 overflow-hidden flex-shrink-0 border border-black/10 relative">
                                      <MediaRenderer
                                        src={p.images[0]}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="caption-nano text-orange font-bold uppercase block leading-none mb-0.5">{p.category}</span>
                                      <p className="text-xs font-bold text-ink uppercase tracking-tight truncate leading-tight">{p.name}</p>
                                      <p className="text-[10px] font-mono text-ink/50 mt-0.5">${Number(p.price || 0).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  {isBound ? (
                                    <span className="w-5 h-5 bg-cobalt text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                                  ) : (
                                    <span className="text-[9px] text-ink/30 uppercase font-black shrink-0 hover:text-cobalt">Select</span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Tip */}
            <div className="p-3 bg-off-white border border-black/5 text-[9px] text-ink/60 space-y-0.5 shrink-0">
              <p className="font-bold text-ink uppercase font-mono">💡 Framing &amp; Coordinates</p>
              <p>Pins plotted in Story (4:3) mode match the public 2-column editorial story blocks with 100% pixel precision.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
