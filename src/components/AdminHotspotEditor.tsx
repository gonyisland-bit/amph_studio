import React, { useState, useRef } from "react";
import { HotspotPin, Product } from "../lib/data";
import { MediaRenderer } from "./MediaRenderer";
import { X, Plus, Trash2, Check, MapPin, Search } from "lucide-react";

interface AdminHotspotEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  title?: string;
  hotspots?: HotspotPin[];
  onSaveHotspots: (updated: HotspotPin[]) => void;
  products: Product[];
}

export function AdminHotspotEditor({
  isOpen,
  onClose,
  imageSrc,
  title = "Manage Hotspot Pins",
  hotspots = [],
  onSaveHotspots,
  products = []
}: AdminHotspotEditorProps) {
  const [pins, setPins] = useState<HotspotPin[]>(() => JSON.parse(JSON.stringify(hotspots || [])));
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
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
    if (selectedPinId === pinId) setSelectedPinId(null);
  };

  const handleSave = () => {
    onSaveHotspots(pins);
    onClose();
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Editor Modal Window */}
      <div className="relative w-full max-w-5xl bg-white border border-black/15 shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden rounded-none animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 flex items-center justify-between bg-off-white">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-cobalt rounded-full"></div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-ink font-sans">
                {title}
              </h3>
              <p className="text-[10px] text-ink/50 font-serif italic mt-0.5">
                Click anywhere on the image below to drop an interactive product pin.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="bg-cobalt hover:bg-ink text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer rounded-none"
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

        {/* Workspace Body: Image Area (Left) + Pin Details (Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Visual Interactive Image Area */}
          <div className="lg:col-span-8 p-4 sm:p-6 bg-silver/10 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-black/10">
            <div 
              ref={imageContainerRef}
              onClick={handleImageClick}
              className="relative max-w-full max-h-[58vh] overflow-hidden cursor-crosshair border border-black/15 shadow-md group select-none"
            >
              <MediaRenderer
                src={imageSrc}
                alt="Hotspot target"
                className="w-full h-auto max-h-[58vh] object-contain block"
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-200 shadow-lg border-2 ${
                      isSelected 
                        ? 'bg-cobalt text-white border-white scale-125 ring-4 ring-cobalt/40' 
                        : 'bg-black text-white border-white hover:scale-110'
                    }`}>
                      {idx + 1}
                    </div>
                    {/* Hover Badge */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap bg-black text-white text-[9px] px-2 py-0.5 pointer-events-none font-bold uppercase tracking-wider">
                      {prod ? prod.name : `Pin #${idx + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] font-mono text-ink/40 mt-3 uppercase tracking-wider">
              ✦ Click on image to add pin • Click pin to select &amp; edit
            </p>
          </div>

          {/* Pin Management Sidebar */}
          <div className="lg:col-span-4 p-4 sm:p-6 space-y-5 bg-white flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
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
                    className="text-[9px] text-orange hover:underline font-bold uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {pins.length === 0 ? (
                <div className="py-12 text-center text-ink/40 space-y-2">
                  <MapPin size={24} className="mx-auto opacity-40" />
                  <p className="text-xs font-serif italic">No pins placed yet.</p>
                  <p className="text-[10px] font-sans">Click on the image to drop your first product pin.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                  {pins.map((pin, idx) => {
                    const isSelected = selectedPinId === pin.id;
                    const boundProduct = products.find(p => p.id === pin.productId);

                    return (
                      <div 
                        key={pin.id}
                        onClick={() => setSelectedPinId(pin.id)}
                        className={`p-3 border transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-cobalt bg-cobalt/5 shadow-xs' 
                            : 'border-black/10 hover:border-black/30 bg-off-white/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-cobalt flex items-center gap-1.5">
                            <span className="w-4 h-4 bg-ink text-white rounded-full flex items-center justify-center text-[9px]">
                              {idx + 1}
                            </span>
                            <span>Pos: {pin.x}%, {pin.y}%</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeletePin(pin.id, e)}
                            className="text-ink/30 hover:text-orange transition-colors p-1"
                            title="Delete pin"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Product Selector for this pin */}
                        <div className="space-y-1">
                          <label className="block text-[8px] font-black uppercase text-ink/40">Bound AMPH Product</label>
                          <select
                            value={pin.productId}
                            onChange={(e) => handleUpdatePinProduct(pin.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-[11px] font-bold border border-black/15 p-1.5 bg-white text-ink rounded-none outline-none focus:border-cobalt"
                          >
                            <option value="">-- Select Product --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                [{p.category.toUpperCase()}] {p.name} - ${p.price || 0}
                              </option>
                            ))}
                          </select>
                        </div>

                        {boundProduct && (
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-ink/60 font-sans">
                            <div className="w-6 h-6 bg-silver/20 overflow-hidden flex-shrink-0 border border-black/5">
                              <MediaRenderer src={boundProduct.images[0]} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="truncate font-bold">{boundProduct.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Help */}
            <div className="p-3 bg-off-white border border-black/5 text-[9px] text-ink/50 space-y-1">
              <p className="font-bold text-ink/70 uppercase font-mono">💡 Hotspot Tips</p>
              <p>Hotspot pins will display interactive hover &amp; tap preview cards on the Space and Journal public pages.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
