import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProducts, getSpaces, getJournals, Product, SpaceModel, JournalArticle, ColorOption, generateProductCode } from "../lib/data";
import { MoveRight, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { MediaRenderer, normalizeMediaUrl } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [linkedSpaces, setLinkedSpaces] = useState<SpaceModel[]>([]);
  const [linkedJournals, setLinkedJournals] = useState<JournalArticle[]>([]);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [spacesSliderPos, setSpacesSliderPos] = useState({ canLeft: false, canRight: true });
  const [journalsSliderPos, setJournalsSliderPos] = useState({ canLeft: false, canRight: true });

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
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const lastTouchTapTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchPanStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1);
  const dragDistanceRef = useRef<number>(0);

  // Clamps panOffset so zoomed image boundary never leaves the stage viewport
  const clampPan = (px: number, py: number, scale: number) => {
    if (scale <= 1) return { x: 0, y: 0 };
    const stage = stageRef.current;
    const media = mediaRef.current;
    if (!stage) return { x: px, y: py };
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    const mediaW = media ? media.clientWidth : stageW;
    const mediaH = media ? media.clientHeight : stageH;

    const scaledW = mediaW * scale;
    const scaledH = mediaH * scale;

    const maxPanX = Math.max(0, (scaledW - stageW) / 2);
    const maxPanY = Math.max(0, (scaledH - stageH) / 2);
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, px)),
      y: Math.min(maxPanY, Math.max(-maxPanY, py))
    };
  };

  // Toggle zoom between 1x and 2.5x with smooth transition
  const toggleZoom = () => {
    setIsDragging(false);
    setZoomScale(prev => {
      const next = prev > 1 ? 1 : 2.5;
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  // Desktop Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    if (zoomScale > 1) {
      setIsDragging(true);
      setDragStartPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      dragDistanceRef.current = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    if (isDragging && zoomScale > 1) {
      e.preventDefault();
      dragDistanceRef.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      const nextX = e.clientX - dragStartPos.x;
      const nextY = e.clientY - dragStartPos.y;
      setPanOffset(clampPan(nextX, nextY, zoomScale));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    e.stopPropagation();
    toggleZoom();
  };

  useScrollReveal();

  useEffect(() => {
    if (id) {
      getProductById(id).then(p => {
        setProduct(p || null);
        if (p) {
          document.title = `${p.name} — Amph`;
          getProducts().then(allProds => {
            const otherProds = allProds.filter(prod => prod.id !== id);
            // 1등: 본 제품이 지목하거나 나를 지목한 연관 추천 상품
            const explicitRelatedIds = p.relatedProductIds || [];
            const related = otherProds.filter(prod => 
              explicitRelatedIds.includes(prod.id) || (prod.relatedProductIds || []).includes(p.id)
            );
            // 2등: 별표 선택 메인 상품 (featured)
            const featured = otherProds.filter(prod =>
              prod.featured && !related.some(r => r.id === prod.id)
            );
            // 3등: 같은 카테고리 상품
            const sameCategory = otherProds.filter(prod => 
              prod.category === p.category && 
              !related.some(r => r.id === prod.id) && 
              !featured.some(f => f.id === prod.id)
            );
            // 4등: 나머지 상품
            const others = otherProds.filter(prod => 
              !related.some(r => r.id === prod.id) && 
              !featured.some(f => f.id === prod.id) && 
              !sameCategory.some(c => c.id === prod.id)
            );

            setRecommendations([...related, ...featured, ...sameCategory, ...others]);
          });

          // Bidirectional auto-linking for Spaces
          getSpaces().then(allSpaces => {
            const matches = allSpaces.filter(s => 
              (p.relatedSpaceIds || []).includes(s.id) ||
              (s.appliedProductIds || []).includes(p.id)
            );
            setLinkedSpaces(matches);
          });

          // Bidirectional auto-linking for Journals
          getJournals().then(allJournals => {
            const matches = allJournals.filter(j => 
              (p.relatedJournalIds || []).includes(j.id) ||
              (j.appliedProductIds || j.relatedJournalIds || []).includes(p.id)
            );
            setLinkedJournals(matches);
          });
        }
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
        const normKey = normalizeMediaUrl(img);
        if (imageAspects[normKey]) return;
        const i = new window.Image();
        i.src = normKey;
        i.onload = () => {
          const aspect = i.naturalWidth / i.naturalHeight;
          setImageAspects(prev => ({
            ...prev,
            [normKey]: aspect < 1.0 ? 'portrait' : 'landscape',
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

  const getFormattedShipping = (shipping?: string) => {
    if (!shipping) return 'Delivery (Free)';
    if (shipping.includes('Pickup') || shipping.includes('현장') || shipping.includes('수령')) return 'Pickup';
    if (shipping.includes('Freight') || shipping.includes('화물') || shipping.includes('별도')) return 'Freight (Excl.)';
    if (shipping.includes('Delivery') || shipping.includes('택배') || shipping.includes('포함') || shipping.includes('Free')) return 'Delivery (Free)';
    return shipping;
  };

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

  // Mobile / Tablet Touch Handlers (1-finger pan, 2-finger pinch, double-tap zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();
    setIsDragging(false);

    if (e.touches.length === 1) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      touchPanStartRef.current = { ...panOffset };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = zoomScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();

    if (e.touches.length === 2 && pinchStartDistRef.current > 0) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / pinchStartDistRef.current;
      const nextScale = Math.min(Math.max(pinchStartScaleRef.current * ratio, 1), 3.5);
      setZoomScale(nextScale);
      setPanOffset(prev => clampPan(prev.x, prev.y, nextScale));
      return;
    }

    if (e.touches.length === 1 && touchStartPosRef.current) {
      const dx = e.touches[0].clientX - touchStartPosRef.current.x;
      const dy = e.touches[0].clientY - touchStartPosRef.current.y;

      if (zoomScale > 1) {
        e.preventDefault();
        const nextX = touchPanStartRef.current.x + dx;
        const nextY = touchPanStartRef.current.y + dy;
        setPanOffset(clampPan(nextX, nextY, zoomScale));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();

    if (pinchStartDistRef.current > 0 && e.touches.length < 2) {
      pinchStartDistRef.current = 0;
      if (zoomScale <= 1.05) {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      }
      return;
    }

    if (e.changedTouches.length === 1 && touchStartPosRef.current) {
      const dx = e.changedTouches[0].clientX - touchStartPosRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartPosRef.current.y;
      const distMoved = Math.hypot(dx, dy);

      if (distMoved < 10) {
        const now = Date.now();
        if (now - lastTouchTapTimeRef.current < 280) {
          e.preventDefault();
          toggleZoom();
          lastTouchTapTimeRef.current = 0;
          touchStartPosRef.current = null;
          return;
        } else {
          lastTouchTapTimeRef.current = now;
        }
      }

      if (zoomScale === 1) {
        if (Math.abs(dx) > 60 && Math.abs(dy) < 100) {
          if (dx > 0) {
            navigateLightbox(-1);
          } else {
            navigateLightbox(1);
          }
        } else if (Math.abs(dy) > 100) {
          setLightboxIndex(null);
          setZoomScale(1);
          setPanOffset({ x: 0, y: 0 });
          setIsDragging(false);
        }
      }
    }
    touchStartPosRef.current = null;
  };

  const navigateLightbox = (dir: number) => {
    if (lightboxIndex === null) return;
    let nextIdx = lightboxIndex + dir;
    if (nextIdx < 0) nextIdx = allDetailImages.length - 1;
    if (nextIdx >= allDetailImages.length) nextIdx = 0;
    setLightboxIndex(nextIdx);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
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
        <div className="w-full md:w-[60%] bg-[#f2f2f2] grid grid-cols-1 md:grid-cols-2 gap-px border-b md:border-b-0 md:border-r border-black/10 auto-rows-min self-start md:self-stretch">
          {(() => {
            const portraitList = product.portraitImages || [];
            const gridItems: Array<{ type: 'image'; src: string; originalIndex: number; isLandscape: boolean } | { type: 'blank' }> = [];
            let col = 0;
            
            displayImages.forEach((img, idx) => {
              const normImg = normalizeMediaUrl(img);
              const normalizedPortraitList = portraitList.map(normalizeMediaUrl);
              const isForcedPortrait = normalizedPortraitList.includes(normImg) || portraitList.includes(img);
              const physicalAspect = imageAspects[normImg] || imageAspects[img] || (isForcedPortrait ? 'portrait' : 'landscape');
              const isLandscape = !isForcedPortrait && physicalAspect === 'landscape';
              
              if (isLandscape) {
                if (col === 1) {
                  gridItems.push({ type: 'blank' });
                  col = 0;
                }
                gridItems.push({ type: 'image', src: img, originalIndex: idx, isLandscape: true });
              } else {
                gridItems.push({ type: 'image', src: img, originalIndex: idx, isLandscape: false });
                col = (col + 1) % 2;
              }
            });
            
            if (col === 1) {
              gridItems.push({ type: 'blank' });
            }
            
            return gridItems.map((item, gridIdx) => {
              if (item.type === 'blank') {
                return (
                  <div key={`blank-${gridIdx}`} className="col-span-1 aspect-[3/4] md:aspect-[4/5] bg-[#f2f2f2]" />
                );
              }
              
              const spanClass = item.isLandscape ? "col-span-1 md:col-span-2 aspect-[16/10]" : "col-span-1 aspect-[3/4] md:aspect-[4/5]";
              return (
                <div 
                  key={`img-${gridIdx}`} 
                  onClick={() => {
                    setLightboxIndex(item.originalIndex);
                    setZoomScale(1);
                  }}
                  className={`${spanClass} bg-silver/5 overflow-hidden relative cursor-zoom-in group border-0 shadow-none rounded-none`}
                >
                  <MediaRenderer 
                    src={item.src} 
                    alt={`${product.name} view ${item.originalIndex + 1}`} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" 
                    loading={item.originalIndex === 0 ? "eager" : "lazy"}
                    fetchpriority={item.originalIndex === 0 ? "high" : "auto"}
                    nopin="nopin"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 z-10" />
                </div>
              );
            });
          })()}
        </div>

        {/* Right Side: Overview & Purchase Controls (Split 40% - Sticky) */}
        <div className="w-full md:w-[40%] p-6 md:p-12 lg:p-16 flex flex-col bg-off-white relative">
          <div className="md:sticky md:top-28 h-fit">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-orange mb-2 block">{product.category}</span>
            <h2 className="text-3xl md:text-4xl font-medium uppercase tracking-tighter mb-2 text-ink font-sans leading-tight">{product.name}</h2>
            <p className="text-xs text-ink/40 tracking-wider mb-8 font-sans uppercase font-normal">{product.subTitle}</p>
            
            <span className="caption-nano text-cobalt mb-3 block font-black">Product Overview</span>
            <p className="text-sm md:text-base leading-relaxed mb-10 text-ink/80 font-sans font-normal reveal">{product.description}</p>
            
            {/* Color Option Selector (Separated Body & Fabric Color Options) */}
            {(() => {
              const bodyColorsList: ColorOption[] = [];
              const fabricColorsList: ColorOption[] = [];
              const legacyColorsList: ColorOption[] = [];

              const colorMap: Record<string, string> = {
                'Oak': '#d7c29d', 'Ash': '#e5dec9', 'Walnut': '#4b382a', 'Steel': '#8a9597',
                'Black': '#1c1c1c', 'White': '#ffffff', 'Cobalt': '#0047AB', 'Orange': '#FF4500',
                'Pink': '#F8BBD0', 'Silver': '#E0E0E2', 'Gray': '#808080', 'Charcoal': '#36454F',
                'Cream': '#FFFDD0', 'Beige': '#F5F5DC', 'Natural': '#e8d8c1'
              };

              // Process Body Colors
              if (product.bodyColors && Array.isArray(product.bodyColors)) {
                product.bodyColors.forEach(c => {
                  const name = typeof c === 'string' ? c : c?.name;
                  const hex = typeof c === 'string' ? (colorMap[c] || '#888888') : (c?.hex || '#888888');
                  if (name && !bodyColorsList.some(b => b.name.toLowerCase() === name.toLowerCase())) {
                    bodyColorsList.push({ name, hex, group: 'body' });
                  }
                });
              }

              // Process Fabric Colors
              if (product.fabricColors && Array.isArray(product.fabricColors)) {
                product.fabricColors.forEach(c => {
                  const name = typeof c === 'string' ? c : c?.name;
                  const hex = typeof c === 'string' ? (colorMap[c] || '#888888') : (c?.hex || '#888888');
                  if (name && !fabricColorsList.some(f => f.name.toLowerCase() === name.toLowerCase())) {
                    fabricColorsList.push({ name, hex, group: 'fabric' });
                  }
                });
              }

              // Legacy Color fallback
              if (product.color) {
                if (Array.isArray(product.color)) {
                  product.color.forEach(c => {
                    if (c.group === 'body' && !bodyColorsList.some(b => b.name.toLowerCase() === c.name.toLowerCase())) {
                      bodyColorsList.push(c);
                    } else if (c.group === 'fabric' && !fabricColorsList.some(f => f.name.toLowerCase() === c.name.toLowerCase())) {
                      fabricColorsList.push({ ...c, group: 'fabric' });
                    }
                  });
                }
              }

              const hasBody = bodyColorsList.length > 0;
              const hasFabric = fabricColorsList.length > 0;
              const hasLegacy = legacyColorsList.length > 0 && !hasBody && !hasFabric;

              // If no colors are selected or defined for both body and fabric, do not display (표기 X)
              if (!hasBody && !hasFabric && !hasLegacy) return null;

              return (
                <div className="mb-8 border-t border-black/5 pt-6 animate-in fade-in duration-300 space-y-6">
                  {/* Body Color Swatches (Only rendered when colors exist) */}
                  {hasBody && (
                    <div>
                      <span className="caption-nano text-cobalt block mb-3 font-black uppercase tracking-wider">
                        Body Color
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {bodyColorsList.map((c) => {
                          const isSelected = selectedColor === c.name;
                          return (
                            <button
                              key={`body-${c.name}`}
                              type="button"
                              onClick={() => setSelectedColor(c.name)}
                              className={`px-3.5 py-1.5 border text-[10px] font-sans font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${
                                isSelected 
                                  ? 'bg-cobalt text-white border-cobalt shadow-xs' 
                                  : 'bg-white text-ink/70 border-black/15 hover:border-black/30'
                              }`}
                            >
                              <div 
                                className="w-3 h-3 rounded-full border border-black/20 flex-shrink-0" 
                                style={{ backgroundColor: c.hex }} 
                              />
                              <span>{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fabric Color Swatches (Only rendered when colors exist) */}
                  {hasFabric && (
                    <div>
                      <span className="caption-nano text-orange block mb-3 font-black uppercase tracking-wider">
                        Fabric Color
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {fabricColorsList.map((c) => {
                          const isSelected = selectedColor === c.name;
                          return (
                            <button
                              key={`fabric-${c.name}`}
                              type="button"
                              onClick={() => setSelectedColor(c.name)}
                              className={`px-3.5 py-1.5 border text-[10px] font-sans font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${
                                isSelected 
                                  ? 'bg-ink text-white border-ink shadow-xs' 
                                  : 'bg-white text-ink/70 border-black/15 hover:border-black/30'
                              }`}
                            >
                              <div 
                                className="w-3 h-3 rounded-full border border-black/20 flex-shrink-0" 
                                style={{ backgroundColor: c.hex }} 
                              />
                              <span>{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Legacy General Swatches */}
                  {hasLegacy && (
                    <div>
                      <span className="caption-nano text-ink/50 block mb-3 font-bold uppercase tracking-wider">
                        Select Color
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {legacyColorsList.map((c) => {
                          const isSelected = selectedColor === c.name;
                          return (
                            <button
                              key={`legacy-${c.name}`}
                              type="button"
                              onClick={() => setSelectedColor(c.name)}
                              className={`px-3.5 py-1.5 border text-[10px] font-sans font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${
                                isSelected 
                                  ? 'bg-ink text-white border-ink shadow-xs' 
                                  : 'bg-white text-ink/70 border-black/15 hover:border-black/30'
                              }`}
                            >
                              <div 
                                className="w-3 h-3 rounded-full border border-black/20 flex-shrink-0" 
                                style={{ backgroundColor: c.hex }} 
                              />
                              <span>{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                    <td className="text-ink/70 font-semibold">{getFormattedShipping(product.shipping)}</td>
                  </tr>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-medium text-ink/80 uppercase text-[11px] tracking-wider">Product Code</td>
                    <td className="text-ink/70 font-semibold font-mono tracking-wider">{product.sku || generateProductCode(product.category, product.name)}</td>
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

      {/* Editorial Section Subtitle */}
      {product.contentBlocks && product.contentBlocks.length > 0 && (
        <div className="pt-20 pb-8 px-6 md:px-12 lg:px-16 w-full flex items-center justify-between border-b border-black/10 reveal">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-cobalt rounded-full"></div>
            <h3 className="text-lg md:text-xl font-black tracking-[0.2em] uppercase text-ink font-sans">
              EDITORIAL STORY
            </h3>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-ink/40 font-mono">
            {product.name}
          </span>
        </div>
      )}

      {/* Content Blocks (Editorial Section - Full-Width 2-Column Grid) */}
      {product.contentBlocks && product.contentBlocks.length > 0 && (
        <div className="px-4 md:px-8 lg:px-12 py-16 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-start w-full">
            {product.contentBlocks.map((block, idx) => {
              const textContent = block.caption || (block.type === 'text' ? block.value : '');
              const imageUrl = block.type === 'image' ? block.value : '';

              if (block.type === 'image' && imageUrl) {
                const storyImgIdx = storyImages.indexOf(imageUrl);
                const targetLightboxIdx = storyImgIdx !== -1 ? displayImages.length + storyImgIdx : 0;
                return (
                  <div key={idx} className="flex flex-col reveal group w-full">
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
                        <p className="text-xs sm:text-sm md:text-base font-sans leading-relaxed text-ink/80 break-words max-w-full px-2">{textContent}</p>
                      </div>
                    )}
                  </div>
                );
              }

              if (block.type === 'text') {
                const len = block.value ? block.value.trim().length : 0;
                const textStyleClass = len < 40 
                  ? "text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-snug md:leading-tight"
                  : len < 120 
                    ? "text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold tracking-tight leading-snug"
                    : "text-sm sm:text-base md:text-lg font-medium leading-relaxed";

                return (
                  <div key={idx} className="flex flex-col reveal py-4 w-full overflow-hidden max-w-full">
                    <p className={`w-full max-w-full [word-break:break-all] sm:[word-break:break-word] [overflow-wrap:anywhere] break-words whitespace-pre-wrap font-sans text-ink/80 ${textStyleClass}`}>{block.value}</p>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {/* Amplify With (Recommended Products Grid) - Unified Layout */}
      <div className="w-full px-4 md:px-8 lg:px-12 py-20 border-t border-black/10 reveal bg-white">
        <div className="flex justify-between items-end mb-8 border-b border-black/10 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cobalt block mb-1 font-mono">
              SELECTED COLLECTION
            </span>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter uppercase font-sans leading-none">
              Amplify With
            </h3>
          </div>
          <Link to="/collection" className="flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase text-ink hover:text-cobalt transition-colors tracking-widest group">
            <span>SEE ALL COLLECTION</span>
            <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {recommendations.slice(0, 4).map(rec => (
            <Link 
              to={`/product/${rec.id}`}
              key={rec.id}
              className="group block"
            >
              <div className="aspect-[4/5] bg-silver/20 rounded-none overflow-hidden mb-4 border border-black/5 relative">
                {/* Primary Image */}
                <MediaRenderer 
                  src={rec.images[0]} 
                  alt={rec.name}
                  className={`w-full h-full object-cover transition-all duration-700 ease-in-out scale-100 ${rec.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`}
                  loading="lazy"
                  nopin="nopin"
                />
                {/* Secondary Hover Image */}
                {rec.hoverImages?.[0] && (
                  <MediaRenderer 
                    src={rec.hoverImages[0]} 
                    alt={`${rec.name} alternative view`}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-700 ease-in-out scale-100 group-hover:opacity-100 group-hover:scale-105"
                    loading="lazy"
                    nopin="nopin"
                  />
                )}
              </div>
              <h4 className="text-base font-bold tracking-tight mb-1 group-hover:text-cobalt transition-colors uppercase truncate">{rec.name}</h4>
              <p className="text-[10px] font-bold text-ink/30 uppercase tracking-widest">{rec.category}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Linked Spaces Carousel Slider Section (Bidirectional Auto-Link) */}
      {linkedSpaces.length > 0 && (
        <div className="w-full px-4 md:px-8 lg:px-12 py-20 border-t border-black/10 reveal bg-off-white/40">
          {(() => {
            const checkScrollPos = (el: HTMLElement) => {
              const canLeft = el.scrollLeft > 5;
              const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 5;
              setSpacesSliderPos({ canLeft, canRight });
            };

            const scrollSpacesSlider = (dir: 'left' | 'right') => {
              const el = document.getElementById('linked-spaces-slider');
              if (el) {
                el.scrollBy({ left: dir === 'left' ? -350 : 350, behavior: 'smooth' });
                setTimeout(() => checkScrollPos(el), 350);
              }
            };

            return (
              <>
                <div className="flex justify-between items-end mb-8 border-b border-black/10 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cobalt block mb-1 font-mono">
                      LINKED SPACES ({linkedSpaces.length})
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tighter font-sans">
                      Spaces to Explore
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={!spacesSliderPos.canLeft}
                        onClick={() => scrollSpacesSlider('left')} 
                        className={`p-2 border transition-all rounded-none ${
                          spacesSliderPos.canLeft 
                            ? 'border-black/10 hover:bg-black/5 text-ink cursor-pointer opacity-100' 
                            : 'border-black/5 text-ink/20 opacity-30 cursor-not-allowed pointer-events-none'
                        }`}
                        title="Scroll Left"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        disabled={!spacesSliderPos.canRight}
                        onClick={() => scrollSpacesSlider('right')} 
                        className={`p-2 border transition-all rounded-none ${
                          spacesSliderPos.canRight 
                            ? 'border-black/10 hover:bg-black/5 text-ink cursor-pointer opacity-100' 
                            : 'border-black/5 text-ink/20 opacity-30 cursor-not-allowed pointer-events-none'
                        }`}
                        title="Scroll Right"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <Link to="/space" className="flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase text-ink hover:text-cobalt transition-colors tracking-widest group">
                      <span>SEE ALL SPACES</span>
                      <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>

                <div 
                  id="linked-spaces-slider"
                  className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth snap-x pb-4"
                  onScroll={(e) => checkScrollPos(e.currentTarget)}
                >
                  {linkedSpaces.map(s => (
                    <Link key={s.id} to={`/space/${s.id}`} className="group block w-[280px] md:w-[350px] flex-shrink-0 snap-start">
                      <div className="aspect-[4/3] bg-silver/20 rounded-none overflow-hidden mb-3 border border-black/5 relative">
                        <MediaRenderer src={s.images?.[0] || ''} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                      <h4 className="text-base font-bold tracking-tight mb-1 group-hover:text-cobalt transition-colors uppercase truncate">{s.title}</h4>
                      {s.description && <p className="text-xs font-serif text-ink/60 italic line-clamp-2">{s.description}</p>}
                    </Link>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Linked Journals Carousel Slider Section (Bidirectional Auto-Link) */}
      {linkedJournals.length > 0 && (
        <div className="w-full px-4 md:px-8 lg:px-12 py-20 border-t border-black/10 reveal bg-off-white/40">
          {(() => {
            const checkScrollPos = (el: HTMLElement) => {
              const canLeft = el.scrollLeft > 5;
              const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 5;
              setJournalsSliderPos({ canLeft, canRight });
            };

            const scrollJournalsSlider = (dir: 'left' | 'right') => {
              const el = document.getElementById('linked-journals-slider');
              if (el) {
                el.scrollBy({ left: dir === 'left' ? -350 : 350, behavior: 'smooth' });
                setTimeout(() => checkScrollPos(el), 350);
              }
            };

            return (
              <>
                <div className="flex justify-between items-end mb-8 border-b border-black/10 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange block mb-1 font-mono">
                      LINKED JOURNAL STORIES ({linkedJournals.length})
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tighter font-sans">
                      Stories to Explore
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={!journalsSliderPos.canLeft}
                        onClick={() => scrollJournalsSlider('left')} 
                        className={`p-2 border transition-all rounded-none ${
                          journalsSliderPos.canLeft 
                            ? 'border-black/10 hover:bg-black/5 text-ink cursor-pointer opacity-100' 
                            : 'border-black/5 text-ink/20 opacity-30 cursor-not-allowed pointer-events-none'
                        }`}
                        title="Scroll Left"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        disabled={!journalsSliderPos.canRight}
                        onClick={() => scrollJournalsSlider('right')} 
                        className={`p-2 border transition-all rounded-none ${
                          journalsSliderPos.canRight 
                            ? 'border-black/10 hover:bg-black/5 text-ink cursor-pointer opacity-100' 
                            : 'border-black/5 text-ink/20 opacity-30 cursor-not-allowed pointer-events-none'
                        }`}
                        title="Scroll Right"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <Link to="/journal" className="flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase text-ink hover:text-cobalt transition-colors tracking-widest group">
                      <span>SEE ALL JOURNALS</span>
                      <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>

                <div 
                  id="linked-journals-slider"
                  className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth snap-x pb-4"
                  onScroll={(e) => checkScrollPos(e.currentTarget)}
                >
                  {linkedJournals.map(j => (
                    <Link key={j.id} to={`/journal/${j.id}`} className="group block w-[280px] md:w-[350px] flex-shrink-0 snap-start">
                      <div className="aspect-[4/3] bg-silver/20 rounded-none overflow-hidden mb-3 border border-black/5 relative">
                        <MediaRenderer src={j.image} alt={j.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                      <h4 className="text-base font-bold tracking-tight mb-1 group-hover:text-cobalt transition-colors uppercase truncate">{j.title}</h4>
                      {j.description && <p className="text-xs font-serif text-ink/60 italic line-clamp-2">{j.description}</p>}
                    </Link>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

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
              {/* FIT button — always visible, left of ZoomIn */}
              <button
                type="button"
                onClick={() => {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                  setIsDragging(false);
                }}
                className={`transition-colors cursor-pointer focus:outline-none text-[9px] font-bold tracking-widest uppercase border px-2 py-0.5 rounded-none ${
                  zoomScale === 1
                    ? 'text-white/30 border-white/10 opacity-40 pointer-events-none'
                    : 'text-white border-white/40 hover:bg-white/20 opacity-100'
                }`}
                title="Fit to Screen (1x)"
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
                onClick={() => {
                  setZoomScale(prev => {
                    const next = Math.max(prev - 0.5, 1);
                    if (next === 1) setPanOffset({ x: 0, y: 0 });
                    return next;
                  });
                }}
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
                  setPanOffset({ x: 0, y: 0 });
                  setIsDragging(false);
                }} 
                className="hover:text-orange transition-colors cursor-pointer focus:outline-none"
                title="Close Lightbox"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Main Image Viewport */}
          <div className="flex-grow flex items-center justify-center relative overflow-hidden w-full px-0 md:px-16 py-1 md:py-2">
            {/* Previous Image Button */}
            <button 
              onClick={() => navigateLightbox(-1)}
              className="absolute left-2 md:left-5 z-30 text-white/80 hover:text-white p-2.5 md:p-3 transition-all hover:scale-110 cursor-pointer flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full shadow-lg"
              title="Previous"
            >
              <ChevronLeft size={22} className="md:w-7 md:h-7" />
            </button>

            {/* Image with zoom & pan transform */}
            <div 
              ref={stageRef}
              className="w-full h-full flex items-center justify-center select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                transformOrigin: 'center center',
                cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            >
              <div ref={mediaRef} className="flex items-center justify-center max-w-full max-h-full">
                <MediaRenderer
                  src={allDetailImages[lightboxIndex]}
                  alt={`${product.name} fullscreen view`}
                  style={{
                    maxWidth: '100vw',
                    maxHeight: 'calc(100vh - 100px)',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    pointerEvents: zoomScale > 1 ? 'none' : 'auto',
                    userSelect: 'none',
                  }}
                  loading="eager"
                />
              </div>
            </div>

            {/* Next Image Button */}
            <button 
              onClick={() => navigateLightbox(1)}
              className="absolute right-2 md:right-5 z-30 text-white/80 hover:text-white p-2.5 md:p-3 transition-all hover:scale-110 cursor-pointer flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full shadow-lg"
              title="Next"
            >
              <ChevronRight size={22} className="md:w-7 md:h-7" />
            </button>
          </div>

          {/* Thumbnail Strip (Bottom) */}
          <div className="flex-shrink-0 pb-3 pt-2 px-4 w-full flex justify-center">
            <div 
              ref={thumbnailStripRef}
              className="flex gap-1.5 overflow-x-auto scrollbar-none scroll-smooth justify-center max-w-full"
              style={{ scrollbarWidth: 'none' }}
            >
              {allDetailImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => { setLightboxIndex(idx); setZoomScale(1); setPanOffset({ x: 0, y: 0 }); setIsDragging(false); }}
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
