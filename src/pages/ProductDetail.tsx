import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProducts, getSpaces, getJournals, updateProduct, Product, SpaceModel, JournalArticle, ColorOption, generateProductCode, HotspotPin } from "../lib/data";
import { resolveColorHex } from "../lib/colorUtils";
import { useWishlist } from "../lib/wishlist";
import { MoveRight, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ArrowUpRight, Bookmark, Sparkles, Copy, Check, Edit3 } from "lucide-react";
import { MediaRenderer, normalizeMediaUrl } from "../components/MediaRenderer";
import { ImageHotspots } from "../components/ImageHotspots";
import { useScrollReveal } from "../lib/useScrollReveal";
import { ReadingProgressBar } from "../components/ReadingProgressBar";

export interface SpatialLookbookShot {
  id: string;
  sourceType: 'space' | 'journal';
  sourceId: string;
  sourceTitle: string;
  image: string;
  title: string;
  description?: string;
  hotspots: HotspotPin[];
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [linkedSpaces, setLinkedSpaces] = useState<SpaceModel[]>([]);
  const [linkedJournals, setLinkedJournals] = useState<JournalArticle[]>([]);
  const [spatialLookbookShots, setSpatialLookbookShots] = useState<SpatialLookbookShot[]>([]);
  const [activeLookbookIdx, setActiveLookbookIdx] = useState(0);
  const [isEditingLookbookTitle, setIsEditingLookbookTitle] = useState(false);
  const [lookbookTitleInput, setLookbookTitleInput] = useState('');
  const [copiedSpecs, setCopiedSpecs] = useState(false);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const { toggle: toggleWishlist, isSaved } = useWishlist();

  const [spacesSliderPos, setSpacesSliderPos] = useState({ canLeft: false, canRight: true });
  const [journalsSliderPos, setJournalsSliderPos] = useState({ canLeft: false, canRight: true });

  // Scroll listener to toggle Sticky Bottom Purchase Bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 450) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    
    setToastMessage(`Added "${product.name}" to cart`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopySpecs = () => {
    if (!product) return;
    const colorText = product.color 
      ? (Array.isArray(product.color) ? product.color.map(c => c.name).join(', ') : product.color)
      : '-';
    const specText = `[AMPH STUDIO OBJECT SPECIFICATION]\nName: ${product.name} ${product.subTitle ? `(${product.subTitle})` : ''}\nCategory: ${product.category}\nDimensions: ${product.dimensions || 'Standard Dimensions'}\nMaterial: ${product.material || 'Standard'}\nColors: ${colorText}\nProduct Code: ${product.sku || generateProductCode(product.category, product.name)}\nShipping: ${getFormattedShipping(product.shipping)}\nURL: ${window.location.href}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(specText).then(() => {
        setCopiedSpecs(true);
        setTimeout(() => setCopiedSpecs(false), 2500);
      });
    }
  };

  const handleSaveLookbookTitle = async () => {
    if (!product) return;
    const titleVal = lookbookTitleInput.trim();
    const updated = await updateProduct(product.id, { lookbookTitle: titleVal || undefined });
    if (updated) {
      setProduct(updated);
      setIsEditingLookbookTitle(false);
      setToastMessage("Lookbook title updated");
      setTimeout(() => setToastMessage(null), 2500);
    }
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

            setAllProducts(allProds);
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

          // Collect all spatial lookbook shots containing this product
          Promise.all([getSpaces(), getJournals()]).then(([allSpaces, allJournals]) => {
            const shots: SpatialLookbookShot[] = [];
            const seenImages = new Set<string>();

            // 1. From Spaces
            allSpaces.forEach(s => {
              const isApplied = (s.appliedProductIds || []).includes(p.id) || (p.relatedSpaceIds || []).includes(s.id);
              
              // Story blocks with pins
              (s.contentBlocks || []).forEach((b: any, bIdx: number) => {
                if (b.type === 'image' && b.value) {
                  const normUrl = normalizeMediaUrl(b.value);
                  const hasProductPin = b.hotspots && b.hotspots.some((h: any) => h.productId === p.id);
                  if (hasProductPin) {
                    if (!seenImages.has(normUrl)) {
                      seenImages.add(normUrl);
                      shots.push({
                        id: `${s.id}-block-${bIdx}`,
                        sourceType: 'space',
                        sourceId: s.id,
                        sourceTitle: s.title,
                        image: b.value,
                        title: b.title || s.title,
                        description: b.caption || s.description,
                        hotspots: b.hotspots || []
                      });
                    }
                  }
                }
              });

              // Space main image if it has pin on main image
              if (s.image) {
                const normUrl = normalizeMediaUrl(s.image);
                const hasProductPin = s.hotspots && s.hotspots.some((h: any) => h.productId === p.id);
                if (hasProductPin && !seenImages.has(normUrl)) {
                  seenImages.add(normUrl);
                  shots.push({
                    id: `${s.id}-main`,
                    sourceType: 'space',
                    sourceId: s.id,
                    sourceTitle: s.title,
                    image: s.image,
                    title: s.title,
                    description: s.description,
                    hotspots: s.hotspots || []
                  });
                }
              }

              // Fallback: If space is applied but no shots were added for it, add at most 1 scene
              if (isApplied && shots.filter(shot => shot.sourceId === s.id).length === 0) {
                const fallbackImg = s.image || (s.contentBlocks || []).find((b: any) => b.type === 'image')?.value;
                if (fallbackImg) {
                  const normUrl = normalizeMediaUrl(fallbackImg);
                  if (!seenImages.has(normUrl)) {
                    seenImages.add(normUrl);
                    shots.push({
                      id: `${s.id}-fallback`,
                      sourceType: 'space',
                      sourceId: s.id,
                      sourceTitle: s.title,
                      image: fallbackImg,
                      title: s.title,
                      description: s.description,
                      hotspots: s.hotspots || []
                    });
                  }
                }
              }
            });

            // 2. From Journals
            allJournals.forEach(j => {
              const isApplied = (j.appliedProductIds || []).includes(p.id) || (p.relatedJournalIds || []).includes(j.id);
              
              // Story blocks with pins
              (j.contentBlocks || []).forEach((b: any, bIdx: number) => {
                if (b.type === 'image' && b.value) {
                  const normUrl = normalizeMediaUrl(b.value);
                  const hasProductPin = b.hotspots && b.hotspots.some((h: any) => h.productId === p.id);
                  if (hasProductPin) {
                    if (!seenImages.has(normUrl)) {
                      seenImages.add(normUrl);
                      shots.push({
                        id: `${j.id}-block-${bIdx}`,
                        sourceType: 'journal',
                        sourceId: j.id,
                        sourceTitle: j.title,
                        image: b.value,
                        title: b.title || j.title,
                        description: b.caption || j.description,
                        hotspots: b.hotspots || []
                      });
                    }
                  }
                }
              });

              if (j.image) {
                const normUrl = normalizeMediaUrl(j.image);
                const hasProductPin = j.hotspots && j.hotspots.some((h: any) => h.productId === p.id);
                if (hasProductPin && !seenImages.has(normUrl)) {
                  seenImages.add(normUrl);
                  shots.push({
                    id: `${j.id}-main`,
                    sourceType: 'journal',
                    sourceId: j.id,
                    sourceTitle: j.title,
                    image: j.image,
                    title: j.title,
                    description: j.description,
                    hotspots: j.hotspots || []
                  });
                }
              }

              // Fallback for journal
              if (isApplied && shots.filter(shot => shot.sourceId === j.id).length === 0) {
                const fallbackImg = j.image || (j.contentBlocks || []).find((b: any) => b.type === 'image')?.value;
                if (fallbackImg) {
                  const normUrl = normalizeMediaUrl(fallbackImg);
                  if (!seenImages.has(normUrl)) {
                    seenImages.add(normUrl);
                    shots.push({
                      id: `${j.id}-fallback`,
                      sourceType: 'journal',
                      sourceId: j.id,
                      sourceTitle: j.title,
                      image: fallbackImg,
                      title: j.title,
                      description: j.description,
                      hotspots: j.hotspots || []
                    });
                  }
                }
              }
            });

            setSpatialLookbookShots(shots);
            setActiveLookbookIdx(0);
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
      <ReadingProgressBar />
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
            <p className="text-xs text-ink/40 tracking-wider mb-4 font-sans uppercase font-normal">{product.subTitle}</p>
            
            {/* Spatial Lookbook Shortcut Badge */}
            {spatialLookbookShots.length > 0 && (
              <div className="mb-8">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('spatial-lookbook-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-cobalt/10 hover:bg-cobalt hover:text-white text-cobalt border border-cobalt/25 transition-all text-[9px] font-black uppercase tracking-wider rounded-none cursor-pointer group"
                >
                  <Sparkles size={11} className="text-cobalt group-hover:text-white shrink-0" />
                  <span>Styled in {spatialLookbookShots.length} Architectural {spatialLookbookShots.length === 1 ? 'Lookbook' : 'Lookbooks'} ↓</span>
                </button>
              </div>
            )}
            
            <span className="caption-nano text-cobalt mb-3 block font-black">Product Overview</span>
            <p className="text-sm md:text-base leading-relaxed mb-10 text-ink/80 font-sans font-normal reveal">{product.description}</p>
            
            {/* Color Option Selector (Separated Body & Fabric Color Options) */}
            {(() => {
              const bodyColorsList: ColorOption[] = [];
              const fabricColorsList: ColorOption[] = [];
              const legacyColorsList: ColorOption[] = [];

              // Process Body Colors
              if (product.bodyColors && Array.isArray(product.bodyColors)) {
                product.bodyColors.forEach(c => {
                  const name = typeof c === 'string' ? c : c?.name;
                  const customHex = typeof c === 'object' ? c?.hex : undefined;
                  const hex = resolveColorHex(name || '', customHex);
                  if (name && !bodyColorsList.some(b => b.name.toLowerCase() === name.toLowerCase())) {
                    bodyColorsList.push({ name, hex, group: 'body' });
                  }
                });
              }

              // Process Fabric Colors
              if (product.fabricColors && Array.isArray(product.fabricColors)) {
                product.fabricColors.forEach(c => {
                  const name = typeof c === 'string' ? c : c?.name;
                  const customHex = typeof c === 'object' ? c?.hex : undefined;
                  const hex = resolveColorHex(name || '', customHex);
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

              {/* Quick Spec Sheet Copy Action */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleCopySpecs}
                  className="text-[9px] font-bold uppercase font-mono tracking-wider text-ink/50 hover:text-cobalt flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy formatted object specifications"
                >
                  {copiedSpecs ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Specs Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Full Spec Sheet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Purchase CTA & Wishlist Bookmark */}
            <div className="flex gap-2 w-full">
              {product.cartEnabled === false ? (
                <button 
                  disabled 
                  className="bg-black/10 text-ink/30 text-[11px] uppercase tracking-[0.2em] font-black py-5 px-8 rounded-none flex-1 cursor-not-allowed border border-black/5"
                >
                  Coming soon
                </button>
              ) : (
                <button 
                  onClick={handleAddToCart}
                  className="bg-ink hover:bg-cobalt text-white text-[11px] uppercase tracking-[0.2em] font-black py-5 px-8 rounded-none flex-1 transition-all duration-300 shadow-md cursor-pointer"
                >
                  Add to Cart
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`p-5 border transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0 rounded-none ${
                  isSaved(product.id)
                    ? 'bg-cobalt text-white border-cobalt shadow-sm'
                    : 'bg-white text-ink/70 border-black/15 hover:border-black/40 hover:text-ink hover:bg-black/5'
                }`}
                title={isSaved(product.id) ? "Remove from Saved" : "Save to Wishlist"}
                aria-label="Save to Wishlist"
              >
                <Bookmark size={18} className={isSaved(product.id) ? "fill-current" : ""} />
              </button>
            </div>
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
      {(() => {
        const validBlocks = (product.contentBlocks || []).filter(b => b && typeof b.value === 'string' && b.value.trim().length > 0);
        if (validBlocks.length === 0) return null;

        return (
          <div className="px-4 md:px-8 lg:px-12 py-16 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-start w-full">
              {validBlocks.map((block, idx) => {
                const textContent = block.caption || (block.type === 'text' ? block.value : '');
                const imageUrl = block.type === 'image' ? block.value : '';

                if (block.type === 'image' && imageUrl) {
                  const storyImgIdx = storyImages.indexOf(imageUrl);
                  const targetLightboxIdx = storyImgIdx !== -1 ? displayImages.length + storyImgIdx : 0;
                  return (
                    <div key={block.id || idx} className="flex flex-col reveal group w-full">
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

                if (block.type === 'text' && block.value && block.value.trim().length > 0) {
                  const len = block.value.trim().length;
                  const textStyleClass = len < 40 
                    ? "text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-snug md:leading-tight"
                    : len < 120 
                      ? "text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold tracking-tight leading-snug"
                      : "text-sm sm:text-base md:text-lg font-medium leading-relaxed";

                  return (
                    <div key={block.id || idx} className="flex flex-col reveal py-4 w-full overflow-hidden max-w-full">
                      <p className={`w-full max-w-full [word-break:break-all] sm:[word-break:break-word] [overflow-wrap:anywhere] break-words whitespace-pre-wrap font-sans text-ink/80 ${textStyleClass}`}>{block.value}</p>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        );
      })()}

      {/* Spatial Lookbook Showcase (Full-Bleed Interactive Hotspot Pins & Architectural Context) */}
      {spatialLookbookShots.length > 0 && (() => {
        const safeIdx = Math.min(Math.max(0, activeLookbookIdx), spatialLookbookShots.length - 1);
        const activeShot = spatialLookbookShots[safeIdx] || spatialLookbookShots[0];
        
        return (
          <div id="spatial-lookbook-section" className="w-full bg-black text-white border-t border-black/10 reveal relative overflow-hidden">
            {/* Header Bar with Counter */}
            <div className="w-full px-6 md:px-12 py-5 sm:py-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 bg-black/95">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={13} className="text-cobalt" />
                  <span className="text-[10px] uppercase font-black tracking-[0.25em] text-cobalt font-mono">
                    SPATIAL CONTEXT // {activeShot.sourceType.toUpperCase()}
                  </span>
                </div>
                {isEditingLookbookTitle ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={lookbookTitleInput}
                      onChange={(e) => setLookbookTitleInput(e.target.value)}
                      placeholder="Seen in Architectural Context"
                      className="bg-white/10 text-white border border-cobalt px-3 py-1 text-sm font-sans font-bold uppercase focus:outline-none focus:ring-1 focus:ring-cobalt min-w-[260px] sm:min-w-[320px]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLookbookTitle();
                        if (e.key === 'Escape') setIsEditingLookbookTitle(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveLookbookTitle}
                      className="px-3 py-1 bg-cobalt text-white text-[10px] font-black uppercase tracking-wider hover:bg-white hover:text-ink transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingLookbookTitle(false);
                        setLookbookTitleInput(product?.lookbookTitle || "Seen in Architectural Context");
                      }}
                      className="px-2 py-1 text-white/50 hover:text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/title">
                    <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight font-sans">
                      {product?.lookbookTitle || "Seen in Architectural Context"}
                    </h3>
                    {isAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          setLookbookTitleInput(product?.lookbookTitle || "Seen in Architectural Context");
                          setIsEditingLookbookTitle(true);
                        }}
                        className="opacity-40 group-hover/title:opacity-100 hover:text-cobalt text-white/80 transition-opacity p-1 cursor-pointer"
                        title="Edit Spatial Lookbook Title"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Switcher & Counter (If multiple shots) */}
              <div className="flex items-center gap-4">
                {spatialLookbookShots.length > 1 && (
                  <div className="flex items-center gap-3 bg-white/10 px-3 py-1.5 border border-white/15">
                    <button
                      type="button"
                      onClick={() => setActiveLookbookIdx(prev => Math.max(0, prev - 1))}
                      disabled={safeIdx === 0}
                      className="text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Previous Spatial Shot"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-white/90">
                      {String(safeIdx + 1).padStart(2, '0')} / {String(spatialLookbookShots.length).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLookbookIdx(prev => Math.min(spatialLookbookShots.length - 1, prev + 1))}
                      disabled={safeIdx === spatialLookbookShots.length - 1}
                      className="text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Next Spatial Shot"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 16:9 Full-Bleed Interactive Hotspot Showcase Container */}
            <div 
              key={`spatial-shot-${activeShot.id}-${safeIdx}`}
              className="w-full aspect-[16/9] md:aspect-[16/9] max-h-[85vh] relative overflow-hidden bg-black animate-in fade-in duration-500"
            >
              <ImageHotspots 
                src={activeShot.image}
                alt={activeShot.title}
                hotspots={activeShot.hotspots}
                products={allProducts}
                className="w-full h-full"
                imageClassName="w-full h-full object-cover transition-opacity duration-700"
                loading="lazy"
              />

              {/* Floating Bottom Info & Full Space Link */}
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 md:bottom-10 md:left-12 z-20 pointer-events-none">
                <span className="text-[8.5px] sm:text-[9.5px] uppercase font-mono font-bold tracking-widest text-white/70 block mb-2 drop-shadow-md">
                  {activeShot.sourceType.toUpperCase()} // {activeShot.sourceTitle}
                </span>
                <Link
                  to={activeShot.sourceType === 'space' ? `/space/${activeShot.sourceId}` : `/journal/${activeShot.sourceId}`}
                  className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2.5 bg-white text-ink text-[9.5px] font-black uppercase tracking-widest hover:bg-cobalt hover:text-white transition-all rounded-none shadow-xl group/btn pointer-events-auto"
                >
                  <span>Explore Full {activeShot.sourceType === 'space' ? 'Space' : 'Journal'}</span>
                  <MoveRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

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
            <span>SEE ALL</span>
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
                      <span>SEE ALL</span>
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
                      <span>SEE ALL</span>
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

      {/* Sticky Bottom Purchase Bar (Floating Action Bar on Scroll) */}
      {product && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/10 px-4 sm:px-8 md:px-12 py-3 sm:py-3.5 shadow-2xl transition-all duration-300 flex items-center justify-between gap-4 ${
            showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          {/* Left: Thumbnail & Info */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
              <MediaRenderer src={displayImages[0]} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm uppercase tracking-tight text-ink truncate font-sans">{product.name}</span>
                <span className="caption-nano text-orange px-2 py-0.5 border border-orange/30 rounded-full font-bold hidden sm:inline-block">{product.category}</span>
              </div>
              <div className="text-[10px] text-ink/50 uppercase tracking-wider truncate flex items-center gap-1.5 font-medium">
                {selectedColor && <span>Color: {selectedColor}</span>}
                {selectedColor && selectedMaterial && <span>•</span>}
                {selectedMaterial && <span>{selectedMaterial}</span>}
                {!selectedColor && !selectedMaterial && <span>{product.subTitle || 'Crafted Edition'}</span>}
              </div>
            </div>
          </div>

          {/* Right: Action Button & Wishlist */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className={`p-2.5 sm:p-3 border transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0 rounded-none ${
                isSaved(product.id)
                  ? 'bg-cobalt text-white border-cobalt shadow-xs'
                  : 'bg-white text-ink/70 border-black/15 hover:border-black/40 hover:text-ink'
              }`}
              title={isSaved(product.id) ? "Remove from Saved" : "Save to Wishlist"}
              aria-label="Save to Wishlist"
            >
              <Bookmark size={14} className={isSaved(product.id) ? "fill-current" : ""} />
            </button>
            {product.cartEnabled === false ? (
              <button 
                disabled 
                className="bg-black/10 text-ink/30 text-[10px] uppercase tracking-widest font-black px-5 sm:px-8 py-2.5 sm:py-3 cursor-not-allowed border border-black/5"
              >
                Coming soon
              </button>
            ) : (
              <button 
                onClick={handleAddToCart}
                className="bg-ink hover:bg-cobalt text-white text-[10px] uppercase tracking-widest font-black px-5 sm:px-8 py-2.5 sm:py-3 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                Add to Cart
              </button>
            )}
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
    const materials = product.material.split(',').map(m => m.trim()).filter(Boolean);
    materials.forEach(mat => {
      chips.push(
        <span key={`mat-${mat}`} className="text-[9px] font-sans font-bold tracking-wider uppercase bg-ink/5 text-ink/60 px-2 py-0.5 rounded-[2px] border border-black/5">
          {mat}
        </span>
      );
    });
  }

  const colorItems: { name: string; hex: string }[] = [];
  const seenNames = new Set<string>();

  const processColor = (c: any) => {
    if (!c) return;
    const name = typeof c === 'string' ? c.trim() : c.name?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);

    const customHex = typeof c === 'object' ? c.hex : undefined;
    const hex = resolveColorHex(name, customHex);
    colorItems.push({ name, hex });
  };

  if (product.bodyColors && Array.isArray(product.bodyColors)) {
    product.bodyColors.forEach(processColor);
  }
  if (product.fabricColors && Array.isArray(product.fabricColors)) {
    product.fabricColors.forEach(processColor);
  }
  if (product.color) {
    if (Array.isArray(product.color)) {
      product.color.forEach(processColor);
    } else if (typeof product.color === 'string') {
      product.color.split(',').forEach(processColor);
    }
  }

  colorItems.forEach(c => {
    chips.push(
      <div 
        key={`col-${c.name}`} 
        className="w-3 h-3 rounded-full border border-black/15 shadow-sm shrink-0" 
        style={{ backgroundColor: c.hex }} 
        title={c.name}
      />
    );
  });

  return chips.length > 0 ? chips : <span className="text-[9px] text-ink/30 font-sans">Standard options</span>;
}
