import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogOut, User, Search, X, ShoppingBag, ClipboardList } from "lucide-react";
import { getProducts, getSpaces, getJournals, Product, Category } from "../lib/data";
import { CartDrawer } from "./CartDrawer";

const CATEGORIES: Category[] = ['Chairs', 'Furniture', 'Lighting', 'Objects'];

export function Navigation() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const [customerEmail, setCustomerEmail] = useState<string | null>(localStorage.getItem('customer_email'));
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  const updateCartCount = () => {
    const cartStr = localStorage.getItem('cart') || '[]';
    try {
      const cart = JSON.parse(cartStr);
      const count = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);
      setCartCount(count);
    } catch (e) {
      setCartCount(0);
    }
  };

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
    getSpaces().catch(console.error);
    getJournals().catch(console.error);

    const checkAuth = () => {
      setIsAuth(localStorage.getItem('admin_auth') === 'true');
    };

    const checkCustomerAuth = () => {
      setCustomerEmail(localStorage.getItem('customer_email'));
    };
    
    updateCartCount();
    
    window.addEventListener('storage', checkAuth);
    window.addEventListener('storage', checkCustomerAuth);
    window.addEventListener('admin_auth_change', checkAuth);
    window.addEventListener('customer_auth_change', checkCustomerAuth);
    window.addEventListener('cart_change', updateCartCount);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('storage', checkCustomerAuth);
      window.removeEventListener('admin_auth_change', checkAuth);
      window.removeEventListener('customer_auth_change', checkCustomerAuth);
      window.removeEventListener('cart_change', updateCartCount);
    };
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuth(false);
    window.dispatchEvent(new Event('admin_auth_change'));
    navigate('/');
  };

  const handleCustomerLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_email');
    setCustomerEmail(null);
    window.dispatchEvent(new Event('customer_auth_change'));
    navigate('/');
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    
    if (q.includes('chair')) {
      navigate('/collection?category=Chairs');
    } else if (q.includes('furni')) {
      navigate('/collection?category=Furniture');
    } else if (q.includes('light')) {
      navigate('/collection?category=Lighting');
    } else if (q.includes('obj')) {
      navigate('/collection?category=Objects');
    } else {
      navigate(`/collection?search=${encodeURIComponent(q)}`);
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  // Get matching suggestions dynamically
  const suggestionsCategories = searchQuery.trim() 
    ? CATEGORIES.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : [];

  const suggestionsProducts = searchQuery.trim()
    ? products.filter(prod => prod.name.toLowerCase().includes(searchQuery.toLowerCase().trim())).slice(0, 5)
    : [];

  return (
    <>
      <nav className="px-6 md:px-12 py-6 border-b border-black/5 bg-white z-50 relative">
        <div className="max-w-[1800px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">
          {/* Logo */}
          <div className="flex justify-start">
            <Link to="/" onClick={() => { (window as any).__triggerSplash = true; }} className="text-2xl md:text-3xl font-bold tracking-tighter uppercase font-sans">Amph</Link>
          </div>
          
          {/* Center Menu (Desktop) - Font enlarged by 30% and set to light font weight */}
          <div className="hidden md:flex justify-center gap-10 text-[14px] uppercase tracking-[0.2em] font-light font-sans">
            <Link to="/" onClick={() => { (window as any).__triggerSplash = true; }} className="hover:text-cobalt transition-all">Home</Link>
            <Link to="/collection" className="hover:text-cobalt transition-all">Collection</Link>
            <Link to="/catalog" className="hover:text-cobalt transition-all">Catalog</Link>
            <Link to="/space" className="hover:text-cobalt transition-all">Space</Link>
            <Link to="/journal" className="hover:text-cobalt transition-all">Journal</Link>
          </div>
 
          {/* Right Actions */}
          <div className="flex justify-end gap-4 md:gap-6 items-center">
            {/* Slide-out/Fade-in search input bar */}
            <div className="flex items-center gap-2 relative">
              {showSearch && (
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSearchSubmit();
                    }}
                    className="border-b border-black/20 outline-none text-[10px] uppercase tracking-wider py-1 bg-transparent w-28 md:w-40 animate-in slide-in-from-right-2 duration-300 font-sans"
                    autoFocus
                  />

                  {/* Real-time suggestions dropdown list */}
                  {searchQuery.trim().length > 0 && (suggestionsCategories.length > 0 || suggestionsProducts.length > 0) && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-black/10 shadow-2xl w-48 md:w-56 z-50 text-[9px] uppercase font-sans tracking-widest text-ink rounded-[2px] overflow-hidden">
                      {suggestionsCategories.length > 0 && (
                        <div className="border-b border-black/5 p-2">
                          <p className="text-[7px] text-ink/30 mb-1 font-bold">Categories</p>
                          {suggestionsCategories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => {
                                navigate(`/collection?category=${cat}`);
                                setShowSearch(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left py-1 hover:text-cobalt transition-colors block cursor-pointer font-bold"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {suggestionsProducts.length > 0 && (
                        <div className="p-2">
                          <p className="text-[7px] text-ink/30 mb-1 font-bold">Products</p>
                          {suggestionsProducts.map(prod => (
                            <button
                              key={prod.id}
                              onClick={() => {
                                navigate(`/product/${prod.id}`);
                                setShowSearch(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left py-1 hover:text-cobalt transition-colors block truncate cursor-pointer font-bold"
                            >
                              {prod.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button 
                onClick={() => {
                  if (showSearch && searchQuery.trim()) {
                    handleSearchSubmit();
                  } else {
                    setShowSearch(!showSearch);
                  }
                }} 
                className="text-ink/60 hover:text-cobalt transition-colors focus:outline-none cursor-pointer"
                title="Search Products"
              >
                <Search size={16} />
              </button>
              {showSearch && (
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-ink/30 hover:text-orange transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>

            <span className="hidden lg:inline text-ink/30 text-[10px] tracking-widest font-sans font-bold">KR / EN</span>

            {/* Cart Icon or Admin Orders Icon */}
            {isAuth ? (
              <Link 
                to="/admin?tab=orders" 
                className="text-ink/60 hover:text-cobalt transition-colors flex items-center justify-center"
                title="Order Verification"
              >
                <ClipboardList size={16} />
              </Link>
            ) : (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="text-ink/60 hover:text-cobalt transition-colors flex items-center justify-center relative cursor-pointer"
                title="Cart"
              >
                <ShoppingBag size={16} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-cobalt text-white text-[7px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Login / LogOut icons */}
            {isAuth ? (
              <button 
                onClick={handleAdminLogout} 
                className="text-orange hover:text-ink transition-colors flex items-center justify-center cursor-pointer"
                title="Admin Logout"
              >
                <LogOut size={16} />
              </button>
            ) : customerEmail ? (
              <div className="flex gap-3 items-center">
                <Link 
                  to="/account" 
                  className="text-cobalt hover:text-ink transition-colors flex items-center justify-center"
                  title="My Account"
                >
                  <User size={16} />
                </Link>
                <button 
                  onClick={handleCustomerLogout} 
                  className="text-orange/70 hover:text-orange transition-colors flex items-center justify-center cursor-pointer"
                  title="Customer Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="text-ink/60 hover:text-cobalt transition-colors flex items-center justify-center"
                title="Customer Login"
              >
                <User size={16} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-black/10 bg-white sticky top-0 z-[49] overflow-x-auto hide-scrollbar">
        {[
          { path: '/', label: 'HOME' },
          { path: '/collection', label: 'COLLECTION' },
          { path: '/catalog', label: 'CATALOG' },
          { path: '/space', label: 'SPACE' },
          { path: '/journal', label: 'JOURNAL' }
        ].map(tab => (
          <Link 
            key={tab.path} 
            to={tab.path} 
            className="flex-1 py-4 text-center text-[10px] font-black tracking-widest border-r border-black/5 last:border-r-0 hover:bg-silver/10 active:bg-silver/20"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
