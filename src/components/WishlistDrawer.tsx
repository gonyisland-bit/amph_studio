import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, Product } from "../lib/data";
import { useWishlist } from "../lib/wishlist";
import { MediaRenderer } from "./MediaRenderer";
import { X, Bookmark, ArrowRight, ShoppingBag, Trash2, Check } from "lucide-react";

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WishlistDrawer({ isOpen, onClose }: WishlistDrawerProps) {
  const { wishlist, toggle, clear } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      getProducts().then(setProducts);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const savedProducts = products.filter(p => wishlist.includes(p.id));

  const addProductToCart = (product: Product) => {
    const cartStr = localStorage.getItem("cart") || "[]";
    let cart: any[] = [];
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

    const existingIndex = cart.findIndex((item: any) => 
      item.productId === product.id && 
      item.color === defaultColor && 
      item.material === defaultMaterial
    );

    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price || 0,
        image: (product.images || []).filter(Boolean)[0] || '',
        color: defaultColor,
        material: defaultMaterial,
        quantity: 1
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart_change"));
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addProductToCart(product);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  const handleMoveAllToBag = () => {
    savedProducts.forEach(product => {
      addProductToCart(product);
    });
    clear();
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-md bg-off-white h-full shadow-2xl z-10 flex flex-col justify-between border-l border-black/10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-black/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <Bookmark size={16} className="text-cobalt fill-cobalt" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-ink font-sans">
              Saved Objects ({savedProducts.length})
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink/50 hover:text-ink hover:bg-black/5 transition-colors rounded-none cursor-pointer"
            aria-label="Close saved drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {savedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-4">
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-ink/30 mb-2">
                <Bookmark size={20} />
              </div>
              <p className="text-sm font-sans font-bold uppercase tracking-wider text-ink">Your Saved Archive is Empty</p>
              <p className="text-xs font-serif italic text-ink/50 max-w-xs">
                Browse our collection and tap the bookmark icon on any object to curate your personal styling wishlist.
              </p>
              <Link
                to="/collection"
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-cobalt text-white text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-colors rounded-none shadow-xs"
              >
                <span>Explore Collection</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-black/10 border-y border-black/10">
              {savedProducts.map((product) => {
                const isAdded = addedIds[product.id];
                return (
                  <div key={product.id} className="py-4 flex gap-4 items-center justify-between group">
                    <Link 
                      to={`/product/${product.id}`} 
                      onClick={onClose}
                      className="flex gap-4 items-center flex-1 min-w-0"
                    >
                      <div className="w-16 h-16 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5 relative">
                        <MediaRenderer
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="caption-nano text-orange font-bold block mb-0.5">{product.category}</span>
                        <h3 className="text-xs font-bold uppercase tracking-tight text-ink group-hover:text-cobalt transition-colors truncate">
                          {product.name}
                        </h3>
                        {product.material && (
                          <p className="text-[10px] text-ink/40 font-mono truncate mt-0.5">{product.material}</p>
                        )}
                        {product.price > 0 && (
                          <p className="text-[11px] font-black text-ink mt-1">${Number(product.price).toLocaleString()}</p>
                        )}
                      </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(product, e)}
                        className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all rounded-none cursor-pointer ${
                          isAdded 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-black/5 text-ink hover:bg-cobalt hover:text-white'
                        }`}
                        title="Add to Bag"
                      >
                        {isAdded ? (
                          <>
                            <Check size={11} />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={11} />
                            <span>Bag</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(product.id)}
                        className="p-2 text-ink/30 hover:text-orange hover:bg-orange/10 transition-colors rounded-none cursor-pointer"
                        title="Remove from saved"
                        aria-label="Remove item from saved"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {savedProducts.length > 0 && (
          <div className="p-6 md:p-8 bg-white border-t border-black/10 space-y-3">
            <button
              type="button"
              onClick={handleMoveAllToBag}
              className="w-full bg-cobalt text-white py-3.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-ink transition-colors flex items-center justify-center gap-2 rounded-none shadow-md cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>Move All to Bag ({savedProducts.length})</span>
            </button>
            <button
              type="button"
              onClick={clear}
              className="w-full text-center text-[9px] font-black uppercase tracking-widest text-ink/40 hover:text-orange transition-colors cursor-pointer py-1"
            >
              Clear Saved Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
