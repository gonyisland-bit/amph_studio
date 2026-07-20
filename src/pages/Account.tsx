import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, Calendar, Tag, User, LogOut, ArrowRight } from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  image: string;
  color: string;
  material: string;
  quantity: number;
}

interface Order {
  id: string;
  customerEmail: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  createdAt: string;
}

export default function Account() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const customerEmail = localStorage.getItem("customer_email");
  const customerToken = localStorage.getItem("customer_token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!customerEmail || !customerToken) {
      navigate("/login");
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      let apiOrders: Order[] = [];
      try {
        const res = await fetch(`/api/orders?customerEmail=${encodeURIComponent(customerEmail)}`);
        if (res.ok) {
          const data = await res.json();
          // Ensure total price is parsed to number
          apiOrders = data.map((o: any) => ({
            ...o,
            totalPrice: Number(o.totalPrice)
          }));
        }
      } catch (err) {
        console.error("Failed to fetch orders from server:", err);
      }

      // Load local backup orders for this customer
      const localOrdersStr = localStorage.getItem("local_orders") || "[]";
      let localOrders: Order[] = [];
      try {
        localOrders = JSON.parse(localOrdersStr).filter(
          (o: any) => o.customerEmail === customerEmail
        );
      } catch (e) {
        localOrders = [];
      }

      // Merge and deduplicate by ID
      const mergedMap = new Map<string, Order>();
      // API orders take precedence
      apiOrders.forEach(o => mergedMap.set(o.id, o));
      // Local orders fall back
      localOrders.forEach(o => {
        if (!mergedMap.has(o.id)) {
          mergedMap.set(o.id, o);
        }
      });

      // Sort by date desc
      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrders(sorted);
      setIsLoading(false);
    };

    fetchOrders();
  }, [customerEmail, customerToken, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_email");
    window.dispatchEvent(new Event("customer_auth_change"));
    navigate("/");
  };

  if (!customerEmail) return null;

  return (
    <div className="min-h-screen bg-off-white font-sans py-16 px-6 md:px-12 lg:px-20">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Profile Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-black/10 pb-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-cobalt/5 text-cobalt border border-cobalt/10 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-ink/40">Customer Account</span>
              <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">{customerEmail}</h2>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange hover:text-ink transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {/* Order History */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-ink">Order History</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40 bg-black/5 px-3 py-1">
              {orders.length} {orders.length === 1 ? "Order" : "Orders"}
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col space-y-4">
              <div className="w-full h-20 bg-white border border-black/5 animate-pulse"></div>
              <div className="w-full h-20 bg-white border border-black/5 animate-pulse"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-black/5 p-12 text-center flex flex-col items-center justify-center space-y-4">
              <Package size={36} className="text-ink/20" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-widest text-ink/70">No orders found</h4>
                <p className="text-[10px] uppercase tracking-widest text-ink/40">You haven't placed any orders yet.</p>
              </div>
              <Link 
                to="/collection" 
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-ink text-white px-6 py-3.5 hover:bg-cobalt transition-colors"
              >
                Explore Collection <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-black/5 rounded-none shadow-sm overflow-hidden flex flex-col">
                  {/* Order Top Summary */}
                  <div className="bg-off-white/80 p-5 px-6 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-[10px] uppercase font-sans tracking-wider text-ink/60">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div>
                        <span className="block text-[8px] text-ink/30 font-bold">Order ID</span>
                        <span className="font-mono text-ink font-bold">{order.id}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-ink/30 font-bold">Date Placed</span>
                        <span className="font-semibold text-ink">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-ink/30 font-bold">Total Amount</span>
                        <span className="font-bold text-ink">${order.totalPrice.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[8px] text-ink/30 font-bold text-left sm:text-right">Status</span>
                      <span className={`inline-block px-2.5 py-0.5 mt-0.5 text-[8px] font-black tracking-widest uppercase border ${
                        order.status.toLowerCase() === 'delivered' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : order.status.toLowerCase() === 'shipped' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-orange/5 text-orange border-orange/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-6 divide-y divide-black/5">
                    {order.items.map((item, itemIdx) => (
                      <div key={`${item.productId}-${itemIdx}`} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-silver/20 flex items-center justify-center text-[8px] text-ink/30 uppercase">No Image</div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-grow flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-[11px] font-bold text-ink uppercase tracking-tight">{item.name}</h5>
                              <p className="text-[9px] uppercase tracking-wider text-ink/40 mt-0.5">{item.category}</p>
                              <div className="flex gap-2 text-[9px] text-ink/50 mt-0.5 uppercase font-semibold">
                                {item.color && <span>Color: {item.color}</span>}
                                {item.material && <span>Mat: {item.material}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] font-bold text-ink">${(item.price).toLocaleString()}</span>
                              <span className="block text-[8px] text-ink/40 font-bold uppercase mt-0.5">QTY {item.quantity}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
