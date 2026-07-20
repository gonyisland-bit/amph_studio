import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Check } from "lucide-react";

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

export default function Checkout() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const customerEmail = localStorage.getItem("customer_email");
  const customerToken = localStorage.getItem("customer_token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!customerEmail || !customerToken) {
      navigate("/login");
      return;
    }

    // Load Cart
    const cartStr = localStorage.getItem("cart") || "[]";
    try {
      const items = JSON.parse(cartStr);
      setCartItems(items);
      if (items.length === 0) {
        navigate("/");
      }
    } catch (e) {
      navigate("/");
    }

    // Load Customer Profile to pre-fill form
    fetch(`/api/auth?action=profile&email=${encodeURIComponent(customerEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) setName(data.name);
        if (data.phone) setPhone(data.phone);
        if (data.address) setAddress(data.address);
      })
      .catch(err => console.error("Error pre-filling profile:", err));
  }, [customerEmail, customerToken, navigate]);

  const subtotalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Calculate mock discount (e.g. 10% off for total over $500, or a flat $20 discount for objects/lighting)
  const discount = subtotalPrice > 500 ? subtotalPrice * 0.1 : 0;
  const totalPrice = subtotalPrice - discount;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg("Please fill out all billing and shipping fields.");
      return;
    }
    setErrorMsg(null);
    setShowModal(true);
  };

  const confirmOrder = async () => {
    setIsOrdering(true);
    setShowModal(false);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail,
          items: cartItems,
          totalPrice,
          name,
          phone,
          address
        })
      });

      if (!res.ok) {
        throw new Error("Failed to place order on server");
      }

      const data = await res.json();
      if (data.success) {
        // Clear Cart
        localStorage.setItem("cart", "[]");
        window.dispatchEvent(new Event("cart_change"));
        navigate("/account");
      } else {
        throw new Error(data.error || "Order failed");
      }
    } catch (err: any) {
      console.error("API Error - placing order locally in localStorage:", err);
      
      // Fallback
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const newOrder = {
        id: orderId,
        customerEmail,
        items: cartItems,
        totalPrice,
        status: 'Pending',
        name,
        phone,
        address,
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

      // Clear Cart
      localStorage.setItem("cart", "[]");
      window.dispatchEvent(new Event("cart_change"));
      navigate("/account");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white font-sans py-16 px-6 md:px-12 lg:px-20 relative">
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border border-black/10 max-w-md w-full p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-cobalt/5 text-cobalt flex items-center justify-center rounded-full mx-auto">
              <ShoppingBag size={20} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-ink">Confirm Purchase</h3>
              <p className="text-[10px] text-ink/50 uppercase tracking-widest leading-relaxed">
                Are you sure you want to place this order? You will be charged ${totalPrice.toLocaleString()}.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-black/10 hover:border-black/30 transition-colors text-ink bg-transparent"
              >
                No
              </button>
              <button 
                onClick={confirmOrder}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-ink text-white hover:bg-cobalt transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-ink/40 hover:text-ink transition-colors">
          <ArrowLeft size={10} /> Back to Home
        </Link>

        <h1 className="text-3xl font-black tracking-tighter uppercase text-ink">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Billing Form */}
          <div className="lg:col-span-7 bg-white p-8 md:p-10 border border-black/5 shadow-sm space-y-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-ink border-b border-black/5 pb-3">Shipping & Billing Information</h3>
            
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              <div>
                <label className="block text-[9px] font-bold uppercase text-ink/50 mb-2">Recipient Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full border-b border-black/10 focus:border-cobalt outline-none py-2 text-xs transition-colors bg-transparent rounded-none"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-ink/50 mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border-b border-black/10 focus:border-cobalt outline-none py-2 text-xs transition-colors bg-transparent rounded-none"
                  placeholder="010-1234-5678"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-ink/50 mb-2">Shipping Address</label>
                <textarea 
                  value={address} 
                  onChange={e => setAddress(e.target.value)}
                  className="w-full border-b border-black/10 focus:border-cobalt outline-none py-2 text-xs transition-colors bg-transparent rounded-none resize-none"
                  placeholder="Full delivery address, including postal code"
                  rows={3}
                  required
                />
              </div>

              {errorMsg && (
                <p className="text-[9px] text-orange uppercase tracking-wider font-bold bg-orange/5 p-3 text-center">
                  {errorMsg}
                </p>
              )}

              <button 
                type="submit"
                disabled={isOrdering}
                className="w-full bg-ink hover:bg-cobalt text-white py-4 rounded-none font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer"
              >
                {isOrdering ? "Placing Order..." : "Place Order"}
              </button>
            </form>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-5 bg-white p-8 border border-black/5 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-ink border-b border-black/5 pb-3">Order Summary</h3>

            {/* Cart Items */}
            <div className="divide-y divide-black/5 max-h-80 overflow-y-auto pr-2">
              {cartItems.map((item, idx) => (
                <div key={idx} className="py-3 flex gap-3 first:pt-0 last:pb-0">
                  <div className="w-12 h-12 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-silver/20 flex items-center justify-center text-[8px] text-ink/30 uppercase">No Img</div>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div className="flex justify-between items-start text-[11px] font-sans">
                      <div>
                        <h4 className="font-bold text-ink uppercase tracking-tight">{item.name}</h4>
                        <span className="text-[8px] uppercase tracking-wider text-ink/40 block mt-0.5">
                          {item.color} / {item.material}
                        </span>
                      </div>
                      <span className="font-semibold text-ink">${(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                    <div className="text-[8px] text-ink/40 font-bold uppercase">QTY {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-black/10 pt-4 space-y-2 text-[10px] uppercase font-sans tracking-wider text-ink/60">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">${subtotalPrice.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-cobalt">
                  <span>Special Discount (10% Off)</span>
                  <span className="font-semibold">-${discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-black/10 pt-4 mt-2">
                <span className="font-black text-ink">Total Price</span>
                <span className="text-lg font-black text-ink">${totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
