import React, { useState, useRef, useEffect } from "react";
import { HotspotPin, Product } from "../lib/data";
import { MediaRenderer } from "./MediaRenderer";
import { X, Plus, Trash2, Check, MapPin, Search, Layers, Eye, Move } from "lucide-react";

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
  initialAspectMode = 'natural'
}: AdminHotspotEditorProps) {
  const [pins, setPins] = useState<HotspotPin[]>(() => JSON.parse(JSON.stringify(hotspots || [])));
  const [selectedPinId, setSelectedPinId] = useState<string | null>(() => (hotspots && hotspots[0]?.id) || null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [aspectMode, setAspectMode] = useState<'story' | 'hero' | 'natural'>(initialAspectMode);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Load natural aspect ratio of the underlying image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new window.Image();
    img.src = imageSrc;
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNaturalAspect(img.naturalWidth / img.naturalHeight);
      }
    };
  }, [imageSrc]);

  // Convert canonical natural image coordinates (0% ~ 100%) to display coordinates on the cropped canvas box
  const getDisplayCoords = (canonicalX: number, canonicalY: number) => {
    if (aspectMode === 'natural' || !naturalAspect) {
      return { displayX: canonicalX, displayY: canonicalY, isVisible: true };
    }
    const aImg = naturalAspect;
    const aBox = aspectMode === 'story' ? (4 / 3) : (16 / 9);

    let dX = canonicalX;
    let dY = canonicalY;

    if (aBox < aImg) {
      // Container is narrower than image: left/right are cropped in object-cover
      dX = 50 + (canonicalX - 50) * (aImg / aBox);
      dY = canonicalY;
    } else if (aBox > aImg) {
      // Container is wider than image: top/bottom are cropped in object-cover
      dX = canonicalX;
      dY = 50 + (canonicalY - 50) * (aBox / aImg);
    }

    const isVisible = dX >= -3 && dX <= 103 && dY >= -3 && dY <= 103;
    return { 
      displayX: Math.max(0, Math.min(100, dX)), 
      displayY: Math.max(0, Math.min(100, dY)), 
      isVisible 
    };
  };

  // Convert click/drag percentage on the cropped canvas box back to canonical natural image coordinates
  const getCanonicalCoords = (clickPercentX: number, clickPercentY: number) => {
    if (aspectMode === 'natural' || !naturalAspect) {
      return { 
        canonicalX: Math.max(0, Math.min(100, Math.round(clickPercentX * 10) / 10)), 
        canonicalY: Math.max(0, Math.min(100, Math.round(clickPercentY * 10) / 10)) 
      };
    }
    const aImg = naturalAspect;
    const aBox = aspectMode === 'story' ? (4 / 3) : (16 / 9);

    let cX = clickPercentX;
    let cY = clickPercentY;

    if (aBox < aImg) {
      cX = 50 + (clickPercentX - 50) * (aBox / aImg);
      cY = clickPercentY;
    } else if (aBox > aImg) {
      cX = clickPercentX;
      cY = 50 + (clickPercentY - 50) * (aImg / aBox);
    }

    return { 
      canonicalX: Math.max(0, Math.min(100, Math.round(cX * 10) / 10)), 
      canonicalY: Math.max(0, Math.min(100, Math.round(cY * 10) / 10)) 
    };
  };

  // Global mousemove and mouseup listeners for smooth pin dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !draggingPinId) return;
      const container = imageContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const clickPercentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const clickPercentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      const { canonicalX, canonicalY } = getCanonicalCoords(clickPercentX, clickPercentY);

      setPins(prev => prev.map(p => p.id === draggingPinId ? { ...p, x: canonicalX, y: canonicalY } : p));
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setDraggingPinId(null);
      }
    };

    if (draggingPinId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingPinId, aspectMode, naturalAspect]);

  if (!isOpen) return null;

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If just finished dragging, prevent adding a new pin
    if (isDraggingRef.current) return;

    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickPercentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const clickPercentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const { canonicalX, canonicalY } = getCanonicalCoords(clickPercentX, clickPercentY);

    const newPin: HotspotPin = {
      id: `pin-${Date.now()}`,
      productId: products[0]?.id || "",
      x: canonicalX,
      y: canonicalY,
      label: ""
    };

    setPins(prev => [...prev, newPin]);
    setSelectedPinId(newPin.id);
  };

  const handlePinMouseDown = (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
    isDraggingRef.current = true;
  };

  const handleUpdatePinProduct = (pinId: string, productId: string) => {
    setPins(prev => prev.map(p => p.id === pinId ? { ...p, productId } : p));
  };

  const handleUpdatePinCoordinates = (pinId: string, x: number, y: number) => {
    setPins(prev => prev.map(p => p.id === pinId ? { 
      ...p, 
      x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)), 
      y: Math.max(0, Math.min(100, Math.round(y * 10) / 10)) 
    } : p));
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

  // Calculate 4:3 Safe Zone bounding box for wide images
  const aImg = naturalAspect || (16 / 9);
  const isWideImage = aImg > (4 / 3);
  const safeZoneWidthPercent = isWideImage ? ((4 / 3) / aImg) * 100 : 100;
  const safeZoneLeftPercent = isWideImage ? (100 - safeZoneWidthPercent) / 2 : 0;

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
                Click to drop new pins, or <strong className="text-cobalt font-semibold">drag any pin</strong> to adjust its position seamlessly.
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
                className={`w-full h-full ${aspectMode === 'natural' ? 'object-contain' : 'object-cover'} block pointer-events-none`}
              />

              {/* 4:3 Story Crop Safe Zone Guide Overlay on Wide / Original screens */}
              {isWideImage && (aspectMode === 'natural' || aspectMode === 'hero') && (
                <div 
                  className="absolute inset-y-0 border-x-2 border-dashed border-cobalt/60 pointer-events-none z-10 bg-cobalt/[0.03]"
                  style={{ left: `${safeZoneLeftPercent}%`, width: `${safeZoneWidthPercent}%` }}
                >
                  <span className="absolute top-2 left-2 bg-cobalt/85 text-white text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded-none shadow-xs tracking-wider">
                    4:3 Story Safe Zone (스토리 크롭 유효 영역)
                  </span>
                </div>
              )}

              {/* Pins on top of Image (Draggable & Calibrated) */}
              {pins.map((pin, idx) => {
                const isSelected = selectedPinId === pin.id;
                const isDragging = draggingPinId === pin.id;
                const prod = products.find(p => p.id === pin.productId);
                const { displayX, displayY, isVisible } = getDisplayCoords(pin.x, pin.y);

                return (
                  <div
                    key={pin.id}
                    onMouseDown={(e) => handlePinMouseDown(pin.id, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPinId(pin.id);
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group/pin z-20 transition-transform ${
                      isDragging ? 'cursor-grabbing scale-125 z-40' : 'cursor-grab hover:scale-115'
                    } ${!isVisible ? 'opacity-40' : 'opacity-100'}`}
                    style={{ left: `${displayX}%`, top: `${displayY}%` }}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-150 shadow-xl border-2 select-none ${
                      isDragging 
                        ? 'bg-orange text-white border-white scale-125 ring-4 ring-orange/50'
                        : isSelected 
                        ? 'bg-cobalt text-white border-white scale-110 ring-4 ring-cobalt/40' 
                        : 'bg-black/85 text-white border-white/80 hover:bg-cobalt'
                    }`}>
                      {idx + 1}
                    </div>

                    {/* Drag indicator & coordinate pill */}
                    <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap bg-black/90 text-white text-[9px] px-2 py-0.5 pointer-events-none font-mono font-bold tracking-wider shadow-md ${
                      isDragging || isSelected ? 'opacity-100' : 'opacity-0 group-hover/pin:opacity-100 transition-opacity'
                    }`}>
                      {isDragging ? `(X: ${pin.x}%, Y: ${pin.y}%)` : (prod ? prod.name : `Pin #${idx + 1}`)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between w-full max-w-2xl mt-3 text-[10px] font-mono text-ink/50 uppercase tracking-wider">
              <span>✦ Click to drop pin • <strong className="text-cobalt">Drag pin to reposition</strong></span>
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
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-cobalt flex items-center gap-1">
                            <Move size={11} />
                            <span>Pin #{pins.findIndex(p => p.id === selectedPin.id) + 1}</span>
                          </span>
                          <span className="text-[9px] font-mono text-ink/50">
                            (X: {selectedPin.x}%, Y: {selectedPin.y}%)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePin(selectedPin.id, e)}
                          className="text-orange text-[9px] font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Delete Pin</span>
                        </button>
                      </div>

                      {/* Position Fine-Tuner Controls */}
                      <div className="grid grid-cols-2 gap-2 bg-white p-2 border border-black/10 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold text-ink/60">X:</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={selectedPin.x}
                            onChange={(e) => handleUpdatePinCoordinates(selectedPin.id, Number(e.target.value), selectedPin.y)}
                            className="w-full text-[10px] font-mono p-1 border border-black/15 outline-none rounded-none focus:border-cobalt"
                          />
                          <span className="text-[8px] text-ink/40">%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold text-ink/60">Y:</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={selectedPin.y}
                            onChange={(e) => handleUpdatePinCoordinates(selectedPin.id, selectedPin.x, Number(e.target.value))}
                            className="w-full text-[10px] font-mono p-1 border border-black/15 outline-none rounded-none focus:border-cobalt"
                          />
                          <span className="text-[8px] text-ink/40">%</span>
                        </div>
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
                        <div className="flex-1 overflow-y-auto divide-y divide-black/5 border border-black/10 bg-white max-h-[30vh]">
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
              <p className="font-bold text-ink uppercase font-mono">💡 Drag &amp; Drop Hotspot Pins</p>
              <p>Drag any pin directly on the canvas, or use the X/Y number inputs to fine-tune exact placement.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
