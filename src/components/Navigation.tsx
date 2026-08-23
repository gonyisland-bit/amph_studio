import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { LogOut, User, Search, X, ShoppingBag, ClipboardList, Menu } from "lucide-react";
import { getProducts, getSpaces, getJournals, getHomeSettings, Product, Category, HomeSettings } from "../lib/data";
import { CartDrawer } from "./CartDrawer";
import { SearchModal } from "./SearchModal";

const CATEGORIES: Category[] = ['Chairs', 'Furniture', 'Lighting', 'Objects'];

export function Navigation() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const [customerEmail, setCustomerEmail] = useState<string | null>(localStorage.getItem('customer_email'));
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [homeSettings, setHomeSettings] = useState<HomeSettings | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Smart Sticky Header states (Hide on scroll down, show on scroll up)
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef(0);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on page navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Smart Header Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 60) {
        setIsScrolled(true);
        if (currentScrollY > lastScrollYRef.current + 10) {
          // Scrolling down -> Hide header
          setIsVisible(false);
        } else if (currentScrollY < lastScrollYRef.current - 10) {
          // Scrolling up -> Show header
          setIsVisible(true);
        }
      } else {
        setIsScrolled(false);
        setIsVisible(true);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    
    const loadSettings = () => {
      getHomeSettings().then(setHomeSettings).catch(console.error);
    };

    loadSettings();
    updateCartCount();
    
    window.addEventListener('storage', checkAuth);
    window.addEventListener('storage', checkCustomerAuth);
    window.addEventListener('admin_auth_change', checkAuth);
    window.addEventListener('customer_auth_change', checkCustomerAuth);
    window.addEventListener('cart_change', updateCartCount);
    window.addEventListener('settings_change', loadSettings);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('storage', checkCustomerAuth);
      window.removeEventListener('admin_auth_change', checkAuth);
      window.removeEventListener('customer_auth_change', checkCustomerAuth);
      window.removeEventListener('cart_change', updateCartCount);
      window.removeEventListener('settings_change', loadSettings);
    };
  }, []);

  // Global Cmd+K / Ctrl+K keyboard shortcut for Search Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  return (
    <>
      <nav 
        className={`sticky top-0 z-50 select-none transition-all duration-300 px-6 md:px-12 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-xs py-4 md:py-4.5 border-b border-black/10' 
            : 'bg-white py-5 md:py-6 border-b border-black/5'
        }`}
      >
        <div className="max-w-[1800px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">
          {/* Logo */}
          <div className="flex justify-start items-center">
            <Link to="/" onClick={() => { (window as any).__triggerSplash = true; }} className="flex items-center group">
              {homeSettings?.logoType === 'text' ? (
                <span className="text-2xl md:text-3xl font-bold tracking-tighter uppercase font-sans group-hover:text-cobalt transition-colors">Amph</span>
              ) : (
                <img 
                  src={homeSettings?.logoImage || "/logo.png"} 
                  alt="Amph Studio" 
                  className="h-7 md:h-11 w-auto object-contain transition-transform group-hover:scale-105" 
                  nopin="nopin"
                  data-pin-no-hover="true"
                />
              )}
            </Link>
          </div>
          
          {/* Center Menu (Desktop) - Font enlarged by 30% and set to light font weight */}
          <div className="hidden md:flex justify-center gap-6 lg:gap-10 text-[14px] uppercase tracking-[0.2em] font-light font-sans z-10 relative select-none">
            <Link to="/" onClick={() => { (window as any).__triggerSplash = true; }} className="hover:text-cobalt transition-colors duration-200 py-2 px-2 -my-2 inline-block select-none cursor-pointer">Home</Link>
            <Link to="/collection" className="hover:text-cobalt transition-colors duration-200 py-2 px-2 -my-2 inline-block select-none cursor-pointer">Collection</Link>
            <Link to="/catalogue" className="hover:text-cobalt transition-colors duration-200 py-2 px-2 -my-2 inline-block select-none cursor-pointer">Catalogue</Link>
            <Link to="/space" className="hover:text-cobalt transition-colors duration-200 py-2 px-2 -my-2 inline-block select-none cursor-pointer">Space</Link>
            <Link to="/journal" className="hover:text-cobalt transition-colors duration-200 py-2 px-2 -my-2 inline-block select-none cursor-pointer">Journal</Link>
          </div>
 
          {/* Right Actions */}
          <div className="flex justify-end gap-3.5 sm:gap-4 md:gap-6 items-center">
            {/* Search Modal Trigger Button */}
            <button 
              onClick={() => setIsSearchModalOpen(true)} 
              className="text-ink/60 hover:text-cobalt transition-colors focus:outline-none cursor-pointer flex items-center gap-1.5 p-1 group"
              title="Search (⌘K)"
              aria-label="Search"
            >
              <Search size={16} />
              <span className="hidden xl:inline text-[9px] font-mono text-ink/30 border border-black/10 px-1 py-0.2 rounded-[2px] group-hover:border-cobalt/30 group-hover:text-cobalt">⌘K</span>
            </button>

            <span className="hidden lg:inline text-ink/30 text-[10px] tracking-widest font-sans font-bold">KR / EN</span>

            {/* Cart Icon or Admin Orders Icon */}
            {isAuth ? (
              <Link 
                to="/admin?tab=orders" 
                className="text-ink/60 hover:text-cobalt transition-colors flex items-center justify-center p-1"
                title="Order Verification"
              >
                <ClipboardList size={16} />
              </Link>
            ) : (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="text-ink/60 hover:text-cobalt transition-colors flex items-center justify-center relative cursor-pointer p-1"
                title="Cart"
              >
                <ShoppingBag size={16} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-cobalt text-white text-[7px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Login / LogOut icons */}
            {isAuth ? (
              <button 
                onClick={handleAdminLogout} 
                className="text-orange hover:text-ink transition-colors flex items-center justify-center cursor-pointer p-1"
                title="Admin Logout"
              >
                <LogOut size={16} />
              </button>
            ) : customerEmail ? (
              <div className="flex gap-2 items-center">
                <Link 
                  to="/account" 
                  className="text-cobalt hover:text-ink transition-colors flex items-center justify-center p-1"
                  title="My Account"
                >
                  <User size={16} />
                </Link>
                <button 
                  onClick={handleCustomerLogout} 
                  className="text-orange/70 hover:text-orange transition-colors flex items-center justify-center cursor-pointer p-1"
                  title="Customer Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="text-ink/60 hover:text-cobalt transition-colors flex items-center justify-center p-1"
                title="Customer Login"
              >
                <User size={16} />
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-ink hover:text-cobalt transition-colors p-1 cursor-pointer flex items-center justify-center"
              aria-label="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Fullscreen Mobile Editorial Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col justify-between p-8 sm:p-12 animate-in fade-in duration-200 select-none overflow-y-auto">
          {/* Top Bar inside Drawer */}
          <div className="flex justify-between items-center border-b border-black/10 pb-6">
            <Link 
              to="/" 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="text-2xl font-bold tracking-tighter uppercase font-sans text-ink"
            >
              Amph
            </Link>
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-2 text-ink hover:text-cobalt transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          {/* Editorial Menu Navigation Links with Staggered Visual Rhythm */}
          <div className="flex flex-col gap-6 sm:gap-8 my-auto py-8">
            {[
              { num: '01', path: '/', label: 'HOME' },
              { num: '02', path: '/collection', label: 'COLLECTION' },
              { num: '03', path: '/catalogue', label: 'CATALOGUE' },
              { num: '04', path: '/space', label: 'SPACE' },
              { num: '05', path: '/journal', label: 'JOURNAL' }
            ].map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="group flex items-baseline gap-4 text-3xl sm:text-4xl font-medium tracking-tighter uppercase hover:text-cobalt transition-colors font-sans"
              >
                <span className="text-[11px] font-mono text-cobalt tracking-widest font-bold">{item.num}</span>
                <span className="group-hover:translate-x-3 transition-transform duration-300 leading-none">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Bottom Utility Strip */}
          <div className="border-t border-black/10 pt-6 flex flex-col gap-4 text-[11px] uppercase tracking-widest font-sans font-bold text-ink/60">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <Link to="/collection" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-cobalt transition-colors">
                  All Works
                </Link>
                <span>•</span>
                <Link to="/space" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-cobalt transition-colors">
                  Space Story
                </Link>
              </div>
              <span className="text-ink/40">KR / EN</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-ink/40 font-medium">
              <span>© AMPH STUDIO</span>
              <span>AMPLIFY YOUR ORDINARY</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Horizontal Quick-Tab Switcher (Kept compact for ultra-fast tab hopping on mobile) */}
      <div className="flex md:hidden border-b border-black/10 bg-white/95 backdrop-blur-sm overflow-x-auto hide-scrollbar select-none">
        {[
          { path: '/', label: 'HOME' },
          { path: '/collection', label: 'COLLECTION' },
          { path: '/catalogue', label: 'CATALOGUE' },
          { path: '/space', label: 'SPACE' },
          { path: '/journal', label: 'JOURNAL' }
        ].map(tab => (
          <Link 
            key={tab.path} 
            to={tab.path} 
            className="flex-1 py-3 text-center text-[9px] font-black tracking-widest border-r border-black/5 last:border-r-0 hover:bg-silver/10 active:bg-silver/20 select-none cursor-pointer whitespace-nowrap px-3"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </>
  );
}
