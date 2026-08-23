import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { HotspotPin, Product } from "../lib/data";
import { MediaRenderer } from "./MediaRenderer";
import { Plus, ArrowRight, X } from "lucide-react";

interface ImageHotspotsProps {
  src: string;
  alt?: string;
  hotspots?: HotspotPin[];
  products: Product[];
  className?: string;
  imageClassName?: string;
  onClick?: () => void;
  loading?: "lazy" | "eager";
  nopin?: string;
}

export function ImageHotspots({
  src,
  alt = "",
  hotspots = [],
  products = [],
  className = "",
  imageClassName = "",
  onClick,
  loading = "lazy",
  nopin
}: ImageHotspotsProps) {
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leaveTimerRef = useRef<any>(null);

  // Close active popup when clicking outside (especially on mobile)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePinId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const handlePinMouseEnter = (pinId: string) => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setActivePinId(pinId);
  };

  const handlePinMouseLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    // Grace period of 350ms so user can smoothly move mouse from pin dot into popup card
    leaveTimerRef.current = setTimeout(() => {
      setActivePinId(null);
    }, 350);
  };

  const handlePopupMouseEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  };

  const handlePopupMouseLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setActivePinId(null);
    }, 300);
  };

  const validHotspots = (hotspots || []).filter(h => h && typeof h.x === 'number' && typeof h.y === 'number');

  return (
    <div 
      ref={containerRef}
      className={`relative group/hotspot-container ${className}`}
      onClick={onClick}
    >
      {/* Base Media */}
      <MediaRenderer
        src={src}
        alt={alt}
        className={imageClassName}
        loading={loading}
        nopin={nopin}
      />

      {/* Render Hotspot Pins */}
      {validHotspots.map((pin) => {
        const product = products.find(p => p.id === pin.productId);
        const isActive = activePinId === pin.id;

        // Position alignment calculation to prevent screen overflow
        const isNearRight = pin.x > 60;
        const isNearLeft = pin.x < 30;
        const isNearBottom = pin.y > 60;

        let popupXClass = "-translate-x-1/2 left-1/2";
        if (isNearRight) popupXClass = "right-0 translate-x-0";
        if (isNearLeft) popupXClass = "left-0 translate-x-0";

        let popupYClass = "top-full mt-2";
        if (isNearBottom) popupYClass = "bottom-full mb-2";

        return (
          <div
            key={pin.id || `${pin.x}-${pin.y}`}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onMouseEnter={() => handlePinMouseEnter(pin.id)}
            onMouseLeave={handlePinMouseLeave}
          >
            {/* Interactive Pin Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                setActivePinId(isActive ? null : pin.id);
              }}
              className={`relative group/pin flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'w-7 h-7 bg-cobalt text-white scale-110 shadow-lg ring-4 ring-cobalt/30' 
                  : 'w-6 h-6 bg-black/65 hover:bg-cobalt text-white backdrop-blur-md border border-white/70 hover:border-white shadow-md hover:scale-115'
              }`}
              title={product ? product.name : (pin.label || "Shop Object")}
              aria-label={product ? `View ${product.name}` : "Shop Hotspot"}
            >
              {/* Pulsing Concentric Ripple */}
              <span className="absolute -inset-1 rounded-full bg-white/40 animate-ping opacity-60 pointer-events-none" />
              <Plus size={12} className={`transition-transform duration-300 ${isActive ? 'rotate-45' : 'group-hover/pin:rotate-90'}`} />
            </button>

            {/* Invisible hover bridge zone connecting pin button to popup card so mouse never loses focus */}
            {isActive && (
              <div 
                className={`absolute ${isNearBottom ? 'bottom-full h-4 w-full left-0' : 'top-full h-4 w-full left-0'} z-40`}
                onMouseEnter={handlePopupMouseEnter}
                onMouseLeave={handlePopupMouseLeave}
              />
            )}

            {/* Hotspot Preview Tooltip Card */}
            {(isActive && product) && (
              <div 
                className={`absolute ${popupXClass} ${popupYClass} z-50 w-56 sm:w-64 bg-white/95 backdrop-blur-md p-3 border border-black/15 shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto rounded-none`}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handlePopupMouseEnter}
                onMouseLeave={handlePopupMouseLeave}
              >
                <div className="flex gap-3 items-center">
                  <div className="w-14 h-14 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5 relative">
                    <MediaRenderer
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="caption-nano text-orange font-bold block mb-0.5 uppercase tracking-wider">{product.category}</span>
                    <h4 className="text-[11px] font-bold uppercase tracking-tight text-ink truncate font-sans">
                      {product.name}
                    </h4>
                    {product.price > 0 && (
                      <p className="text-[10px] font-mono font-bold text-ink mt-0.5">
                        ${Number(product.price).toLocaleString()}
                      </p>
                    )}
                    <Link
                      to={`/product/${product.id}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-cobalt hover:text-ink transition-colors font-sans"
                    >
                      <span>View Object</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
