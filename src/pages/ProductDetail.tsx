import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProducts, Product, ColorOption } from "../lib/data";
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddToCart = () => {
    if (!product || product.cartEnabled === false) return;

    const cartStr = localStorage.getItem('cart') || '[]';
    let cart = [];
    try {
      cart = JSON.parse(cartStr);
    } catch (e) {
      cart = [];
    }

    const defaultColor = product.color
      ? (Array.isArray(product.color)
          ? (product.color[0]?.name || '')
          : product.color.split(',')[0].trim())
      : '';
    const defaultMaterial = product.material ? product.material.split(',')[0].trim() : '';

    const color = selectedColor || defaultColor;
    const material = selectedMaterial || defaultMaterial;

    const existingIndex = cart.findIndex((item: any) => 
      item.productId === product.id && 
      item.color === color && 
      item.material === material
    );

    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        image: (product.images || []).filter(Boolean)[0] || '',
        color: color,
        material: material,
        quantity: 1
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart_change'));
    
    setToastMessage("Added to Cart");
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Grid orientation detection
  const [imageAspects, setImageAspects] = useState<Record<string, 'portrait' | 'landscape'>>({});

  // Fullscreen Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

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

  const displayImages = (product?.images || []).filter(Boolean);

  const storyImages = [
    ...(product?.contentBlocks || [])
      .filter(b => b.type === 'image')
      .map(b => b.value)
  ].filter(Boolean);

  // Unified image deck containing both gallery and story images
  const allDetailImages = [...displayImages, ...storyImages];

  useEffect(() => {
    if (product) {
      let defaultColorName = "";
      if (product.color) {
        if (Array.isArray(product.color)) {
          if (product.color.length > 0) defaultColorName = product.color[0].name;
        } else {
          defaultColorName = product.color.split(',')[0].trim();
        }
      }
      if (defaultColorName) {
        setSelectedColor(defaultColorName);
      }

      if (product.material) {
        setSelectedMaterial(product.material.split(',')[0].trim());
      }

      // Pre-evaluate image aspects for landscape/portrait grid alignment
      allDetailImages.forEach(img => {
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

  // Global Keyboard event handler for lightbox navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
        setZoomScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex]);

  // Auto-scroll thumbnail strip to keep selected thumb centered
  useEffect(() => {
    if (lightboxIndex === null || !thumbnailStripRef.current) return;
    const strip = thumbnailStripRef.current;
    const thumb = strip.children[lightboxIndex] as HTMLElement | undefined;
    if (thumb) {
      const stripCenter = strip.offsetWidth / 2;
      const thumbCenter = thumb.offsetLeft + thumb.offsetWidth / 2;
      strip.scrollTo({ left: thumbCenter - stripCenter, behavior: 'smooth' });
    }
  }, [lightboxIndex]);

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
    if (nextIdx < 0) nextIdx = allDetailImages.length - 1;
    if (nextIdx >= allDetailImages.length) nextIdx = 0;
    setLightboxIndex(nextIdx);
    setZoomScale(1);
  };

  return (
    <div className="flex flex-col flex-grow bg-white">
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-ink text-white px-8 py-4 uppercase text-[10px] tracking-widest font-black shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          {toastMessage}
        </div>
      )}


      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-6 md:px-12 py-2.5 border-b border-black/10 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-ink font-sans">
            <Link to="/collection" className="hover:text-cobalt transition-colors text-ink">Collection</Link>
            <span className="text-ink/30 font-light font-sans">/</span>
            <Link to={`/collection?category=${product.category}`} className="hover:text-cobalt transition-colors text-ink">{product.category}</Link>
            <span className="text-ink/30 font-light font-sans">/</span>
            <span className="text-ink/40 font-normal">{product.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-bold font-sans text-xs md:text-sm">${product.price}</span>
          <button className="bg-ink text-white text-[9px] md:text-[10px] uppercase tracking-widest font-black px-4 py-2.5 rounded-none hover:bg-cobalt transition-colors">
            Add to Cart
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-grow border-b border-black/10">
        {/* Left Side: Media Gallery (Split 60%) - Auto 2-column for portrait, 1-column for landscape, seamless grids */}
        <div className="w-full md:w-[60%] grid grid-cols-1 md:grid-cols-2 gap-px bg-black/10 border-b md:border-b-0 md:border-r border-black/10 auto-rows-min">
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
                className={`${spanClass} bg-silver/5 overflow-hidden relative cursor-zoom-in group border-0 shadow-none rounded-none`}
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
            {(() => {
              const colors: ColorOption[] = [];
              if (product.color) {
                if (Array.isArray(product.color)) {
                  colors.push(...product.color);
                } else {
                  const colorMap: Record<string, string> = {
                    'Oak': '#d7c29d', 'Ash': '#e5dec9', 'Walnut': '#4b382a', 'Steel': '#8a9597',
                    'Black': '#1c1c1c', 'White': '#ffffff', 'Cobalt': '#0047AB', 'Orange': '#FF4500',
                    'Pink': '#F8BBD0', 'Silver': '#E0E0E2', 'Gray': '#808080', 'Charcoal': '#36454F',
                    'Cream': '#FFFDD0', 'Beige': '#F5F5DC', 'Natural': '#e8d8c1'
                  };
                  product.color.split(',').forEach(c => {
                    const name = c.trim();
                    if (name) {
                      colors.push({ name, hex: colorMap[name] || '#888888' });
                    }
                  });
                }
              }

              if (colors.length === 0) return null;

              return (
                <div className="mb-8 border-t border-black/5 pt-6 animate-in fade-in duration-300">
                  <span className="caption-nano text-ink/50 block mb-3 font-bold">Select Color</span>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => {
                      const isSelected = selectedColor === c.name;
                      return (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(c.name)}
                          className={`px-4 py-2 border text-[10px] font-sans font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${
                            isSelected 
                              ? 'bg-ink text-white border-ink scale-102 shadow-sm' 
                              : 'bg-transparent text-ink/60 border-black/10 hover:border-black/30'
                          }`}
                        >
                          <div 
                            className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0" 
                            style={{ backgroundColor: c.hex }} 
                          />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Table Specifications */}
            <div className="border-t border-black/10 mt-8 mb-12">
              <table className="w-full text-left text-xs font-sans">
                <tbody>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-medium text-ink/80 uppercase text-[11px] tracking-wider">Material</td>
                    <td className="text-ink/70 font-semibold">{product.material || '-'}</td>
                  </tr>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-medium text-ink/80 uppercase text-[11px] tracking-wider">Color Options</td>
                    <td className="text-ink/70 font-semibold">
                      {product.color 
                        ? (Array.isArray(product.color)
                            ? product.color.map(c => c.name).join(', ')
                            : product.color)
                        : '-'}
                    </td>
                  </tr>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-medium text-ink/80 uppercase text-[11px] tracking-wider">Dimensions</td>
                    <td className="text-ink/70 font-semibold">{product.dimensions || '-'}</td>
                  </tr>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-medium text-ink/80 uppercase text-[11px] tracking-wider">Shipping</td>
                    <td className="text-ink/70 font-semibold">{product.shipping || '-'}</td>
                  </tr>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-medium text-ink/80 uppercase text-[11px] tracking-wider">제품 코드</td>
                    <td className="text-ink/70 font-mono text-[10px]">{product.sku || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Purchase CTA */}
            {product.cartEnabled === false ? (
              <button 
                disabled 
                className="bg-black/10 text-ink/30 text-[11px] uppercase tracking-[0.2em] font-black py-5 px-8 rounded-none w-full cursor-not-allowed border border-black/5"
              >
                Coming soon
              </button>
            ) : (
              <button 
                onClick={handleAddToCart}
                className="bg-ink hover:bg-cobalt text-white text-[11px] uppercase tracking-[0.2em] font-black py-5 px-8 rounded-none w-full transition-all duration-300 shadow-md cursor-pointer"
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Blocks (Editorial Section - PC 2-Column Grid) */}
      {product.contentBlocks && product.contentBlocks.length > 0 && (
        <div className="px-6 md:px-12 lg:px-20 py-24 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            {product.contentBlocks.map((block, idx) => {
              const textContent = block.caption || (block.type === 'text' ? block.value : '');
              const imageUrl = block.type === 'image' ? block.value : '';

              if (block.type === 'image' && imageUrl) {
                const storyImgIdx = storyImages.indexOf(imageUrl);
                const targetLightboxIdx = storyImgIdx !== -1 ? displayImages.length + storyImgIdx : 0;
                return (
                  <div key={idx} className="flex flex-col reveal group">
                    <div 
                      onClick={() => {
                        setLightboxIndex(targetLightboxIdx);
                        setZoomScale(1);
                      }}
                      className="w-full aspect-[4/3] bg-silver/5 overflow-hidden border border-black/5 cursor-zoom-in relative"
                    >
                      <MediaRenderer 
                        src={imageUrl} 
                        alt={`Editorial view ${idx + 1}`} 
                        className="w-full h-full object-cover rounded-none shadow-none group-hover:scale-105 transition-transform duration-700" 
                        loading="lazy" 
                        nopin="nopin"
                      />
                    </div>
                    {textContent && (
                      <div className="mt-4">
                        <p className="text-sm md:text-base font-sans leading-relaxed text-ink/80">{textContent}</p>
                      </div>
                    )}
                  </div>
                );
              }

              if (block.type === 'text') {
                return (
                  <div key={idx} className="flex flex-col reveal py-4">
                    <p className="text-xl md:text-2xl font-sans leading-relaxed text-ink/80">{block.value}</p>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {/* Amplify With (Recommended Grid 4 Items) - Unified with Collection cards */}
      <div className="border-t border-black/10 py-24 px-6 md:px-12 lg:px-20 bg-white reveal">
        <div className="flex justify-between items-end mb-16">
          <h3 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase font-sans leading-none">Amplify With</h3>
          <Link to="/collection" className="flex items-center gap-2 text-xs uppercase font-black hover:text-cobalt transition-colors group">
            Full Collection <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-b border-black/10 auto-rows-fr">
          {recommendations.slice(0, 4).map(rec => (
             <Link 
              to={`/product/${rec.id}`}
              key={rec.id}
              className="group aspect-[4/5] relative overflow-hidden flex flex-col reveal"
            >
              {/* Category tag overlap on top-left */}
              <div className="absolute top-6 left-6 z-20 pointer-events-none">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/90 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
                  {rec.category}
                </span>
              </div>

              {/* Product Name overlap on bottom-left */}
              <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
                <h4 className="text-sm md:text-base font-bold font-sans tracking-tight leading-tight text-white drop-shadow-md group-hover:text-cobalt transition-colors">
                  {rec.name}
                </h4>
              </div>
              
              {/* Full-bleed Image Container */}
              <div className="absolute inset-0 w-full h-full bg-silver/5 overflow-hidden rounded-none">
                {/* Primary Image */}
                <MediaRenderer 
                  src={rec.images[0]} 
                  alt={rec.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${rec.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`}
                  loading="lazy"
                  nopin="nopin"
                />
                {/* Secondary Hover Image */}
                {rec.hoverImages?.[0] && (
                  <MediaRenderer 
                    src={rec.hoverImages[0]} 
                    alt={`${rec.name} alternative view`}
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

      {/* Fullscreen Lightbox Modal with Gestures */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 bg-black z-[200] flex flex-col select-none touch-none animate-fade-in"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Header Controls */}
          <div className="flex justify-between items-center w-full z-30 text-white/60 px-6 pt-3 pb-2 flex-shrink-0">
            <span className="text-[10px] font-sans font-bold tracking-widest uppercase">
              {product.name} — {lightboxIndex + 1} / {allDetailImages.length}
            </span>
            <div className="flex items-center gap-4">
              {/* FIT button — always visible, left of ZoomIn */}
              <button
                onClick={() => setZoomScale(1)}
                className={`transition-colors cursor-pointer focus:outline-none text-[9px] font-bold tracking-widest uppercase border px-2 py-0.5 rounded-sm ${
                  zoomScale === 1
                    ? 'text-white/20 border-white/10 cursor-default'
                    : 'text-white/70 border-white/30 hover:text-white hover:border-white'
                }`}
                title="Reset to Fit"
                disabled={zoomScale === 1}
              >
                FIT
              </button>
              {/* Zoom In */}
              <button 
                onClick={() => setZoomScale(prev => Math.min(prev + 0.5, 3.5))}
                className="hover:text-white transition-colors cursor-pointer focus:outline-none"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              {/* Zoom Out */}
              <button 
                onClick={() => setZoomScale(prev => Math.max(prev - 0.5, 1))}
                className="hover:text-white transition-colors cursor-pointer focus:outline-none"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              {/* Close */}
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
          <div className="flex-grow flex items-center justify-center relative overflow-hidden w-full">
            {/* Previous Image Button (Desktop) */}
            <button 
              onClick={() => navigateLightbox(-1)}
              className="absolute left-5 z-20 text-white/50 hover:text-white transition-colors hidden md:flex cursor-pointer bg-white/5 p-3 rounded-full hover:bg-white/10 focus:outline-none items-center justify-center"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Image with zoom transform — scale(1) always = viewport-fit baseline */}
            <div 
              className="transition-transform duration-300 ease-out flex items-center justify-center cursor-zoom-in"
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
              onDoubleClick={() => setZoomScale(prev => prev < 3.5 ? Math.min(prev + 1, 3.5) : 1)}
            >
              <img
                src={allDetailImages[lightboxIndex]}
                alt={`${product.name} fullscreen view`}
                style={{
                  maxWidth: 'calc(100vw - 80px)',
                  maxHeight: 'calc(100vh - 150px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                loading="eager"
                data-pin-nopin="true"
                draggable={false}
              />
            </div>

            {/* Next Image Button (Desktop) */}
            <button 
              onClick={() => navigateLightbox(1)}
              className="absolute right-5 z-20 text-white/50 hover:text-white transition-colors hidden md:flex cursor-pointer bg-white/5 p-3 rounded-full hover:bg-white/10 focus:outline-none items-center justify-center"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Thumbnail Strip (Bottom) */}
          <div className="flex-shrink-0 pb-3 pt-2 px-4">
            <div 
              ref={thumbnailStripRef}
              className="flex gap-1.5 overflow-x-auto scrollbar-none scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              {allDetailImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => { setLightboxIndex(idx); setZoomScale(1); }}
                  className={`flex-shrink-0 w-10 h-10 md:w-11 md:h-11 overflow-hidden focus:outline-none transition-all duration-300 ${
                    idx === lightboxIndex
                      ? 'opacity-100 ring-2 ring-white scale-105'
                      : 'opacity-35 hover:opacity-65 ring-1 ring-white/10'
                  }`}
                >
                  <MediaRenderer
                    src={img}
                    alt={`thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    nopin="nopin"
                  />
                </button>
              ))}
            </div>
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
    let colorsList: { name: string; hex: string }[] = [];
    if (Array.isArray(product.color)) {
      colorsList = product.color;
    } else {
      const colorMap: Record<string, string> = {
        'Oak': '#d7c29d', 'Ash': '#e5dec9', 'Walnut': '#4b382a', 'Steel': '#8a9597',
        'Black': '#1c1c1c', 'White': '#ffffff', 'Cobalt': '#0047AB', 'Orange': '#FF4500',
        'Pink': '#F8BBD0', 'Silver': '#E0E0E2', 'Gray': '#808080', 'Charcoal': '#36454F',
        'Cream': '#FFFDD0', 'Beige': '#F5F5DC', 'Natural': '#e8d8c1'
      };
      colorsList = product.color.split(',').map(c => {
        const name = c.trim();
        return {
          name,
          hex: colorMap[name] || '#888888'
        };
      });
    }

    colorsList.forEach(c => {
      const hex = c.hex;
      const col = c.name;
      if (hex && hex !== '#888888') {
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
