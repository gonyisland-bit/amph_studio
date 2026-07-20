import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, Calendar, Tag, User, LogOut, ArrowRight, Settings, ShieldCheck } from "lucide-react";

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
  
  // Profile state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const customerEmail = localStorage.getItem("customer_email");
  const customerToken = localStorage.getItem("customer_token");
  const navigate = useNavigate();

  const fetchOrders = async () => {
    if (!customerEmail) return;
    let apiOrders: Order[] = [];
    try {
      const res = await fetch(`/api/orders?customerEmail=${encodeURIComponent(customerEmail)}`);
      if (res.ok) {
        const data = await res.json();
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
    apiOrders.forEach(o => mergedMap.set(o.id, o));
    localOrders.forEach(o => {
      if (!mergedMap.has(o.id)) {
        mergedMap.set(o.id, o);
      }
    });

    const sorted = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setOrders(sorted);
  };

  useEffect(() => {
    if (!customerEmail || !customerToken) {
      navigate("/login");
      return;
    }

    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchOrders();

      // Load Profile
      try {
        const res = await fetch(`/api/auth?action=profile&email=${encodeURIComponent(customerEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) setName(data.name);
          if (data.phone) setPhone(data.phone);
          if (data.address) setAddress(data.address);
        }
      } catch (err) {
        // Fallback simulation profile load
        const mockAccountsStr = localStorage.getItem("mock_customer_accounts") || "[]";
        let mockAccounts = [];
        try { mockAccounts = JSON.parse(mockAccountsStr); } catch(e) {}
        const matched = mockAccounts.find((acc: any) => acc.email === customerEmail);
        if (matched) {
          if (matched.name) setName(matched.name);
          if (matched.phone) setPhone(matched.phone);
          if (matched.address) setAddress(matched.address);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [customerEmail, customerToken, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_email");
    window.dispatchEvent(new Event("customer_auth_change"));
    navigate("/");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail) return;

    setIsUpdating(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetch('/api/auth?action=update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          name,
          phone,
          address,
          currentPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileSuccess("Profile updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setProfileError(data.error || "Failed to update profile.");
      }
    } catch (err) {
      // Fallback local simulation update
      const mockAccountsStr = localStorage.getItem("mock_customer_accounts") || "[]";
      let mockAccounts = [];
      try { mockAccounts = JSON.parse(mockAccountsStr); } catch(e) {}

      const idx = mockAccounts.findIndex((acc: any) => acc.email === customerEmail);
      if (idx > -1) {
        if (newPassword) {
          if (currentPassword !== mockAccounts[idx].password) {
            setProfileError("Incorrect current password (Local simulation).");
            setIsUpdating(false);
            return;
          }
          mockAccounts[idx].password = newPassword;
        }
        mockAccounts[idx].name = name;
        mockAccounts[idx].phone = phone;
        mockAccounts[idx].address = address;
        localStorage.setItem("mock_customer_accounts", JSON.stringify(mockAccounts));
        setProfileSuccess("Profile updated! (Local Simulation)");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setProfileSuccess("Profile updated (Local session backup).");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusStep = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending' || s === '대기') return 1;
    if (s === 'confirmed' || s === '주문확인') return 2;
    if (s === 'processing' || s === '발주') return 3;
    if (s === 'shipping' || s === '배송') return 4;
    if (s === 'completed' || s === '완료' || s === 'delivered') return 5;
    return 1;
  };

  const getStatusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return '대기';
    return status; // Return the saved text directly for other statuses
  };

  if (!customerEmail) return null;

  return (
    <div className="min-h-screen bg-off-white font-sans py-16 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-black/10 pb-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-cobalt/5 text-cobalt border border-cobalt/10 rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-ink/40">Customer Dashboard</span>
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

        {/* Content Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left: Settings Panel */}
          <div className="lg:col-span-4 bg-white p-8 border border-black/5 shadow-sm space-y-8 animate-in fade-in slide-in-from-left-4 duration-750">
            <h3 className="text-xs font-black uppercase tracking-widest text-ink border-b border-black/5 pb-3 flex items-center gap-2">
              <Settings size={14} /> Account Settings
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full border-b border-black/10 focus:border-cobalt outline-none py-1.5 text-xs transition-colors bg-transparent rounded-none"
                  placeholder="Not registered"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1.5">Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border-b border-black/10 focus:border-cobalt outline-none py-1.5 text-xs transition-colors bg-transparent rounded-none"
                  placeholder="Not registered"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1.5">Default Shipping Address</label>
                <textarea 
                  value={address} 
                  onChange={e => setAddress(e.target.value)}
                  className="w-full border-b border-black/10 focus:border-cobalt outline-none py-1.5 text-xs transition-colors bg-transparent rounded-none resize-none"
                  placeholder="Not registered"
                  rows={2}
                />
              </div>

              {/* Password change divider */}
              <div className="border-t border-black/5 pt-6 mt-6 space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-ink/50 flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Change Password
                </h4>
                
                <div>
                  <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1.5">Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full border-b border-black/10 focus:border-cobalt outline-none py-1.5 text-xs transition-colors bg-transparent rounded-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1.5">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border-b border-black/10 focus:border-cobalt outline-none py-1.5 text-xs transition-colors bg-transparent rounded-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {profileSuccess && (
                <p className="text-[9px] text-cobalt uppercase tracking-wider font-bold bg-cobalt/5 p-3 text-center">
                  {profileSuccess}
                </p>
              )}

              {profileError && (
                <p className="text-[9px] text-orange uppercase tracking-wider font-bold bg-orange/5 p-3 text-center">
                  {profileError}
                </p>
              )}

              <button 
                type="submit"
                disabled={isUpdating}
                className="w-full bg-ink hover:bg-cobalt text-white py-4 rounded-none font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer"
              >
                {isUpdating ? "Saving..." : "Save Settings"}
              </button>
            </form>
          </div>

          {/* Right: Order History */}
          <div className="lg:col-span-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-750">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-ink">My Order History</h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-ink/40 bg-black/5 px-3 py-1">
                {orders.length} {orders.length === 1 ? "Order" : "Orders"}
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col space-y-4">
                <div className="w-full h-32 bg-white border border-black/5 animate-pulse"></div>
                <div className="w-full h-32 bg-white border border-black/5 animate-pulse"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white border border-black/5 p-16 text-center flex flex-col items-center justify-center space-y-4">
                <Package size={36} className="text-ink/15" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-ink/70">No orders found</h4>
                  <p className="text-[9px] uppercase tracking-widest text-ink/40">You haven't placed any orders yet.</p>
                </div>
                <Link 
                  to="/collection" 
                  className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-ink text-white px-6 py-3.5 hover:bg-cobalt transition-colors"
                >
                  Explore Collection <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
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
                          getStatusStep(order.status) === 5
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-orange/5 text-orange border-orange/20'
                        }`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-6 divide-y divide-black/5">
                      {order.items.map((item, itemIdx) => (
                        <div key={`${item.productId}-${itemIdx}`} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                          <div className="w-14 h-14 bg-silver/10 overflow-hidden flex-shrink-0 border border-black/5">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-silver/20 flex items-center justify-center text-[8px] text-ink/30 uppercase">No Image</div>
                            )}
                          </div>

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

                    {/* Stepper Progress Bar */}
                    <div className="p-6 bg-off-white/40 border-t border-black/5 mt-auto">
                      <span className="block text-[8px] text-ink/30 font-bold uppercase tracking-widest mb-3 text-center sm:text-left">Order Progress</span>
                      <div className="grid grid-cols-5 text-center text-[9px] uppercase tracking-wider font-bold text-ink/40 relative items-center gap-1">
                        
                        {/* Background Line */}
                        <div className="absolute top-2.5 left-[10%] right-[10%] h-[2px] bg-black/10 -z-10" />
                        
                        {/* Active Line */}
                        <div 
                          className="absolute top-2.5 left-[10%] h-[2px] bg-cobalt -z-10 transition-all duration-500" 
                          style={{ width: `${(getStatusStep(order.status) - 1) * 20}%` }}
                        />

                        {[
                          { label: "대기", key: "pending" },
                          { label: "주문확인", key: "confirmed" },
                          { label: "발주", key: "processing" },
                          { label: "배송", key: "shipping" },
                          { label: "완료", key: "completed" }
                        ].map((step, stepIdx) => {
                          const isCurrent = getStatusStep(order.status) === (stepIdx + 1);
                          const isPast = getStatusStep(order.status) >= (stepIdx + 1);
                          return (
                            <div key={step.key} className="flex flex-col items-center gap-1.5">
                              <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border text-[8px] transition-all ${
                                isCurrent ? 'bg-cobalt border-cobalt text-white scale-110 shadow-md font-black' :
                                isPast ? 'bg-cobalt/10 border-cobalt/25 text-cobalt' :
                                'bg-white border-black/10 text-ink/20'
                              }`}>
                                {stepIdx + 1}
                              </div>
                              <span className={`text-[8px] sm:text-[9px] truncate ${isCurrent ? 'text-cobalt font-black' : isPast ? 'text-ink/80' : 'text-ink/30'}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
