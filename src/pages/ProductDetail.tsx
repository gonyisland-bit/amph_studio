import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProducts, Product } from "../lib/data";
import { MoveRight, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  // Grid orientation detection
  const [imageAspects, setImageAspects] = useState<Record<string, 'portrait' | 'landscape'>>({});

  // Fullscreen Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);

  useScrollReveal();

  useEffect(() => {
    if (id) {
      getProductById(id).then(setProduct);
      getProducts().then(all => {
        setRecommendations(all.filter(p => p.id !== id).slice(0, 6));
      });
    }
    setLightboxIndex(null);
    setZoomScale(1);
  }, [id]);

  const displayImages = [
    ...(product?.images || []),
    ...(product?.hoverImages || [])
  ].filter(Boolean);

  useEffect(() => {
    if (product) {
      if (product.color) {
        setSelectedColor(product.color.split(',')[0].trim());
      }
      if (product.material) {
        setSelectedMaterial(product.material.split(',')[0].trim());
      }

      // Pre-evaluate image aspects for landscape/portrait grid alignment
      displayImages.forEach(img => {
        if (!img) return;
        const i = new window.Image();
        i.src = img;
        i.onload = () => {
          const aspect = i.naturalWidth / i.naturalHeight;
          setImageAspects(prev => ({
            ...prev,
            [img]: aspect < 1.0 ? 'portrait' : 'landscape'
          }));
        };
      });
    }
  }, [product]);

  if (!product) return <div className="p-12 font-sans animate-pulse text-[10px] uppercase tracking-widest text-ink/30">Loading...</div>;

  // ETA & Frame Spec Mock mapper
  const getMockedSpecs = () => {
    let frame = "Industrial seamless joint construction";
    let eta = "4-6 weeks (Handcrafted to order)";
    
    const mat = (product.material || "").toLowerCase();
    if (mat.includes("oak")) {
      frame = "Solid white oak frame / Tenon joinery";
    } else if (mat.includes("steel")) {
      frame = "Powder-coated tubular steel / Seamless welding";
    } else if (mat.includes("ash")) {
      frame = "Solid ash wood frame / Hand-finished";
    }
    
    if (product.category === "Objects" || product.category === "Lighting") {
      eta = "3-5 business days";
    }
    
    return { frame, eta };
  };

  const { frame, eta } = getMockedSpecs();

  // Gesture handling for Lightbox (Swipe & Pinch to zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        dist: 0
      };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
        dist
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const startDist = touchStartRef.current.dist;
      if (startDist > 0) {
        const factor = dist / startDist;
        setZoomScale(prev => Math.min(Math.max(prev * factor, 1), 3.5));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (e.changedTouches.length === 1 && zoomScale === 1) {
      const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(diffX) > 60 && Math.abs(diffY) < 100) {
        if (diffX > 0) {
          navigateLightbox(-1);
        } else {
          navigateLightbox(1);
        }
      }
    }
    touchStartRef.current = null;
  };

  const navigateLightbox = (dir: number) => {
    if (lightboxIndex === null) return;
    let nextIdx = lightboxIndex + dir;
    if (nextIdx < 0) nextIdx = displayImages.length - 1;
    if (nextIdx >= displayImages.length) nextIdx = 0;
    setLightboxIndex(nextIdx);
    setZoomScale(1);
  };

  return (
    <div className="flex flex-col flex-grow bg-white">
      {isAuth && (
        <Link to="/admin" className="fixed bottom-12 left-12 z-[100] bg-cobalt text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-orange transition-all scale-100 hover:scale-110">
          Edit Product
        </Link>
      )}
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-6 md:px-12 py-4 border-b border-black/10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/collection" className="text-xs uppercase tracking-widest font-black hover:text-cobalt transition-colors hidden md:block mr-4 border-r border-black/10 pr-4">Collection</Link>
          <div>
            <span className="caption-nano text-orange font-bold block mb-0.5">{product.category}</span>
            <h1 className="text-xl font-bold font-sans tracking-tight leading-tight">{product.name}</h1>
            <p className="text-[10px] font-sans font-normal tracking-wide text-ink/50 mt-0.5">{product.subTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-bold font-sans">${product.price}</span>
          <button className="bg-ink text-white text-[10px] uppercase tracking-widest font-black px-6 py-3.5 rounded-none hover:bg-cobalt transition-colors">
            Add to Cart
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-grow border-b border-black/10">
        {/* Left Side: Media Gallery (Split 60%) - Auto 2-column for portrait, 1-column for landscape */}
        <div className="w-full md:w-[60%] grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-8 bg-silver/5 border-b md:border-b-0 md:border-r border-black/10 auto-rows-min">
          {displayImages.map((img, idx) => {
            const isLandscape = imageAspects[img] === 'landscape';
            const spanClass = isLandscape ? "col-span-1 md:col-span-2 aspect-[16/10]" : "col-span-1 aspect-[3/4] md:aspect-[4/5]";
            return (
              <div 
                key={idx} 
                onClick={() => {
                  setLightboxIndex(idx);
                  setZoomScale(1);
                }}
                className={`${spanClass} bg-black/5 rounded-none overflow-hidden relative cursor-zoom-in group shadow-inner border border-black/5`}
              >
                <MediaRenderer 
                  src={img} 
                  alt={`${product.name} view ${idx + 1}`} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" 
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchpriority={idx === 0 ? "high" : "auto"}
                  nopin="nopin"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 z-10" />
              </div>
            );
          })}
        </div>

        {/* Right Side: Overview & Purchase Controls (Split 40% - Sticky) */}
        <div className="w-full md:w-[40%] p-6 md:p-12 lg:p-16 flex flex-col bg-off-white relative">
          <div className="md:sticky md:top-28 h-fit">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-orange mb-2 block">{product.category}</span>
            <h2 className="text-3xl md:text-4xl font-medium uppercase tracking-tighter mb-2 text-ink font-sans leading-tight">{product.name}</h2>
            <p className="text-xs text-ink/40 tracking-wider mb-8 font-sans uppercase font-normal">{product.subTitle}</p>
            
            <span className="caption-nano text-cobalt mb-3 block font-black">Product Overview</span>
            <p className="text-sm md:text-base leading-relaxed mb-10 text-ink/80 font-sans font-normal reveal">{product.description}</p>
            
            {/* Color Option Selector */}
            {product.color && (
              <div className="mb-8 border-t border-black/5 pt-6">
                <span className="caption-nano text-ink/50 block mb-3 font-bold">Select Color</span>
                <div className="flex gap-3">
                  {product.color.split(',').map(c => c.trim()).map(color => {
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
                    const hex = colorMap[color] || '#888';
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-cobalt scale-110 shadow-md' : 'border-black/10'}`}
                        title={color}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: hex }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Material Option Selector */}
            {product.material && product.material.split(',').length > 1 && (
              <div className="mb-8 border-t border-black/5 pt-6">
                <span className="caption-nano text-ink/50 block mb-3 font-bold">Select Material</span>
                <div className="flex gap-2">
                  {product.material.split(',').map(m => m.trim()).map(mat => {
                    const isSelected = selectedMaterial === mat;
                    return (
                      <button
                        key={mat}
                        onClick={() => setSelectedMaterial(mat)}
                        className={`px-4 py-2 border text-[10px] font-sans font-bold uppercase transition-all tracking-wider ${isSelected ? 'bg-ink text-white border-ink' : 'bg-transparent text-ink/60 border-black/10 hover:border-black/30'}`}
                      >
                        {mat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table Specifications */}
            <div className="border-t border-black/10 mt-8 mb-12">
              <table className="w-full text-left text-xs font-sans">
                <tbody>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">Material</td>
                    <td className="text-ink/80 font-semibold">{product.material}</td>
                  </tr>
                  {product.color && (
                    <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                      <td className="font-bold text-ink/50 uppercase caption-nano">Color Options</td>
                      <td className="text-ink/80 font-semibold">{product.color}</td>
                    </tr>
                  )}
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">Frame Structural</td>
                    <td className="text-ink/80 font-semibold">{frame}</td>
                  </tr>
                  {product.dimensions && (
                    <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                      <td className="font-bold text-ink/50 uppercase caption-nano">Dimensions</td>
                      <td className="text-ink/80 font-semibold">{product.dimensions}</td>
                    </tr>
                  )}
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">Estimated ETA</td>
                    <td className="text-ink/80 font-semibold">{eta}</td>
                  </tr>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">SKU Code</td>
                    <td className="text-ink/80 font-mono text-[10px]">{product.sku || product.id.toUpperCase()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Purchase CTA */}
            <button className="bg-ink hover:bg-cobalt text-white text-[11px] uppercase tracking-[0.2em] font-black py-5 px-8 rounded-none w-full transition-all duration-300 shadow-md">
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Content Blocks */}
      {product.contentBlocks && product.contentBlocks.length > 0 && (
        <div className="px-6 md:px-20 py-24 max-w-6xl mx-auto flex flex-col gap-24 w-full">
          {product.contentBlocks.map((block, idx) => {
            if (block.type === 'text') {
              return (
                <div key={idx} className="reveal max-w-3xl">
                  <p className="text-3xl font-sans leading-relaxed text-ink/80">{block.value}</p>
                </div>
              );
            }
            if (block.type === 'image') {
              return (
                <div key={idx} className="w-full bg-silver/5 p-8 md:p-16 rounded-[40px] reveal">
                  <MediaRenderer src={block.value} className="w-full h-auto rounded-2xl shadow-xl" loading="lazy" />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Amplify With (Recommended Grid 4 Items) */}
      <div className="border-t border-black/10 py-24 px-6 md:px-12 lg:px-20 bg-white reveal">
        <div className="flex justify-between items-end mb-16">
          <h3 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase font-sans leading-none">Amplify With</h3>
          <Link to="/collection" className="flex items-center gap-2 text-xs uppercase font-black hover:text-cobalt transition-colors group">
            Full Collection <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/10 border-t border-b border-black/10">
          {recommendations.slice(0, 4).map(rec => (
             <Link 
              to={`/product/${rec.id}`}
              key={rec.id}
              className="group flex flex-col pt-12 pb-8 px-8 bg-white hover:bg-off-white transition-colors duration-500 reveal"
            >
              <div className="flex justify-between items-start mb-8 z-10 relative">
                <span className="caption-nano text-orange px-3 py-1 border border-orange/30 rounded-full font-bold">
                  {rec.category}
                </span>
                {rec.price > 0 && (
                  <span className="text-xs font-bold font-sans text-ink/70">${rec.price}</span>
                )}
              </div>
              
              <div className="flex-grow w-full aspect-[4/5] bg-silver/10 overflow-hidden rounded-[4px] relative mb-8">
                {/* Primary Image */}
                <MediaRenderer 
                  src={rec.images[0]} 
                  alt={rec.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${rec.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-110'}`}
                  loading="lazy"
                />
                {/* Secondary Hover Image */}
                {rec.hoverImages?.[0] && (
                  <MediaRenderer 
                    src={rec.hoverImages[0]} 
                    alt={`${rec.name} alternative view`}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-1000 ease-in-out group-hover:opacity-100 group-hover:scale-100 scale-95"
                    loading="lazy"
                  />
                )}
              </div>

              <div className="mt-auto z-10 relative">
                <h4 className="text-2xl font-bold font-sans tracking-tight leading-tight group-hover:text-cobalt transition-colors">{rec.name}</h4>
                <p className="text-[10px] text-ink/40 mt-1 font-sans tracking-wide mb-4">{rec.subTitle}</p>
                
                {/* Option Chips Panel */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-black/5 items-center">
                  {renderChips(rec)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal with Gestures */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 bg-black z-[200] flex flex-col justify-between p-6 select-none touch-none animate-fade-in"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Header Controls */}
          <div className="flex justify-between items-center w-full z-30 text-white/70">
            <span className="text-[10px] font-sans font-bold tracking-widest uppercase">
              {product.name} — {lightboxIndex + 1} / {displayImages.length}
            </span>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setZoomScale(prev => Math.min(prev + 0.5, 3))}
                className="hover:text-white transition-colors cursor-pointer focus:outline-none"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              <button 
                onClick={() => setZoomScale(prev => Math.max(prev - 0.5, 1))}
                className="hover:text-white transition-colors cursor-pointer focus:outline-none"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button 
                onClick={() => {
                  setLightboxIndex(null);
                  setZoomScale(1);
                }} 
                className="hover:text-orange transition-colors cursor-pointer focus:outline-none"
                title="Close Lightbox"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Main Image Viewport */}
          <div className="flex-grow flex items-center justify-center relative overflow-hidden w-full h-full">
            {/* Previous Image Button (Desktop) */}
            <button 
              onClick={() => navigateLightbox(-1)}
              className="absolute left-6 z-20 text-white/50 hover:text-white transition-colors hidden md:block cursor-pointer bg-white/5 p-3 rounded-full hover:bg-white/10 focus:outline-none"
            >
              <ChevronLeft size={24} />
            </button>

            <div 
              className="transition-transform duration-300 ease-out max-w-full max-h-[80vh] flex items-center justify-center"
              style={{ transform: `scale(${zoomScale})` }}
            >
              <MediaRenderer 
                src={displayImages[lightboxIndex]} 
                alt={`${product.name} fullscreen view`}
                className="max-w-full max-h-[85vh] object-contain pointer-events-none"
                loading="eager"
                nopin="nopin"
              />
            </div>

            {/* Next Image Button (Desktop) */}
            <button 
              onClick={() => navigateLightbox(1)}
              className="absolute right-6 z-20 text-white/50 hover:text-white transition-colors hidden md:block cursor-pointer bg-white/5 p-3 rounded-full hover:bg-white/10 focus:outline-none"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Lightbox Footer Instruction */}
          <div className="text-center w-full z-30 text-white/30 text-[8px] font-sans tracking-widest uppercase">
            <span>Use pinch-to-zoom & swipe on mobile / click arrows on desktop</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Option Color & Material Chips helper (for recommendations)
function renderChips(product: Product) {
  const chips: React.ReactNode[] = [];
  
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

  return chips.length > 0 ? chips : <span className="text-[9px] text-ink/30 font-sans">Standard options</span>;
}
