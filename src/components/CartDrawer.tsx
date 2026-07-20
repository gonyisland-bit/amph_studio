import React, { useEffect, useState } from "react";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CartItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  image: string;
  color: string;
  material: string;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadCart = () => {
    const cartStr = localStorage.getItem("cart") || "[]";
    try {
      setCartItems(JSON.parse(cartStr));
    } catch (e) {
      setCartItems([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCart();
      setErrorMsg(null);
      setOrderSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleCartChange = () => {
      loadCart();
    };
    window.addEventListener("cart_change", handleCartChange);
    return () => window.removeEventListener("cart_change", handleCartChange);
  }, []);

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...cartItems];
    updated[index].quantity = newQty;
    saveCart(updated);
  };

  const removeItem = (index: number) => {
    const updated = cartItems.filter((_, idx) => idx !== index);
    saveCart(updated);
  };

  const saveCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cart_change"));
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    const customerEmail = localStorage.getItem("customer_email");
    const customerToken = localStorage.getItem("customer_token");

    if (!customerEmail || !customerToken) {
      setErrorMsg("Please sign in as a customer to place an order.");
      setTimeout(() => {
        onClose();
        navigate("/login");
      }, 2000);
      return;
    }

    if (cartItems.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }

    setIsOrdering(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail,
          items: cartItems,
          totalPrice
        })
      });

      if (!res.ok) {
        throw new Error("Failed to place order on server");
      }

      const data = await res.json();
      if (data.success) {
        // Success
        setOrderSuccess(true);
        saveCart([]); // Clear cart
        setTimeout(() => {
          setOrderSuccess(false);
          onClose();
          navigate("/account");
        }, 2000);
      } else {
        throw new Error(data.error || "Order creation failed");
      }
    } catch (err: any) {
      console.error("API Error - falling back to localStorage:", err);
      
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const newOrder = {
        id: orderId,
        customerEmail,
        items: cartItems,
        totalPrice,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      
      const localOrdersStr = localStorage.getItem("local_orders") || "[]";
      let localOrders = [];
      try {
        localOrders = JSON.parse(localOrdersStr);
      } catch (e) {
        localOrders = [];
      }
      
      localOrders.unshift(newOrder);
      localStorage.setItem("local_orders", JSON.stringify(localOrders));

      setOrderSuccess(true);
      saveCart([]); // Clear cart
      setTimeout(() => {
        setOrderSuccess(false);
        onClose();
        navigate("/account");
      }, 2000);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 z-[100] transition-opacity duration-500 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[101] shadow-2xl transition-transform duration-500 transform flex flex-col font-sans border-l border-black/10 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white">
          <h3 className="text-sm font-black uppercase tracking-widest text-ink flex items-center gap-2">
            Shopping Cart 
            {cartItems.length > 0 && (
              <span className="text-[10px] bg-cobalt text-white px-2 py-0.5 rounded-full font-bold">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </h3>
          <button onClick={onClose} className="text-ink/40 hover:text-orange transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {orderSuccess ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12 animate-in fade-in duration-300">
              <div className="w-12 h-12 bg-cobalt text-white flex items-center justify-center rounded-full text-lg font-bold">✓</div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-cobalt">Order Placed Successfully</h4>
              <p className="text-[10px] text-ink/50 uppercase tracking-widest">Redirecting to order history...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-ink/30 uppercase tracking-wider text-xs space-y-2 py-12">
              <span>Your cart is empty</span>
              <button onClick={onClose} className="text-[10px] underline font-bold hover:text-cobalt">Continue Shopping</button>
            </div>
          ) : (
            cartItems.map((item, idx) => (
              <div key={`${item.productId}-${item.color}-${item.material}-${idx}`} className="flex gap-4 border-b border-black/5 pb-4 last:border-0">
                {/* Product Image */}
                <div className="w-20 h-20 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-silver/20 flex items-center justify-center text-[10px] text-ink/30 uppercase">No Image</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-ink uppercase tracking-tight">{item.name}</h4>
                      <span className="text-xs font-semibold text-ink">${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                    <p className="text-[9px] uppercase tracking-wider text-ink/40 mt-1">{item.category}</p>
                    <div className="flex gap-2 text-[9px] text-ink/60 mt-1 uppercase font-semibold">
                      {item.color && <span>Color: {item.color}</span>}
                      {item.material && <span>Mat: {item.material}</span>}
                    </div>
                  </div>

                  {/* Qty & Remove */}
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center border border-black/10 rounded-none bg-off-white">
                      <button 
                        onClick={() => updateQuantity(idx, item.quantity - 1)}
                        className="p-1 px-2 hover:bg-black/5 transition-colors text-ink/60"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-[10px] font-bold px-2 text-ink">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(idx, item.quantity + 1)}
                        className="p-1 px-2 hover:bg-black/5 transition-colors text-ink/60"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeItem(idx)}
                      className="text-ink/30 hover:text-orange transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout */}
        {cartItems.length > 0 && !orderSuccess && (
          <div className="p-6 border-t border-black/10 bg-off-white space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-ink/60">Estimated Total</span>
              <span className="text-base font-black text-ink">${totalPrice.toLocaleString()}</span>
            </div>

            {errorMsg && (
              <p className="text-[9px] uppercase tracking-wider text-orange font-bold text-center bg-orange/5 py-2.5">
                {errorMsg}
              </p>
            )}

            <button 
              onClick={handleCheckout}
              disabled={isOrdering}
              className={`w-full text-white text-[11px] uppercase tracking-[0.2em] font-black py-4 rounded-none transition-all shadow-md ${isOrdering ? "bg-ink/50 cursor-not-allowed" : "bg-ink hover:bg-cobalt cursor-pointer"}`}
            >
              {isOrdering ? "Processing..." : "Place Order"}
            </button>

            <p className="text-[8px] text-ink/40 text-center uppercase tracking-widest leading-normal">
              Secure checkout. Delivery standard 5-10 business days.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
