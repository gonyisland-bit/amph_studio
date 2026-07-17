import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogOut, User, Search, X } from "lucide-react";

export function Navigation() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      setIsAuth(localStorage.getItem('admin_auth') === 'true');
    };
    
    window.addEventListener('storage', checkAuth);
    window.addEventListener('admin_auth_change', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('admin_auth_change', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuth(false);
    window.dispatchEvent(new Event('admin_auth_change'));
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

  return (
    <>
      <nav className="px-6 md:px-12 py-6 border-b border-black/5 bg-white z-50 relative">
        <div className="max-w-[1800px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">
          {/* Logo */}
          <div className="flex justify-start">
            <Link to="/" className="text-2xl md:text-3xl font-bold tracking-tighter uppercase font-sans">Amph</Link>
          </div>
          
          {/* Center Menu (Desktop) - Font enlarged by 30% and set to light font weight */}
          <div className="hidden md:flex justify-center gap-10 text-[14px] uppercase tracking-[0.2em] font-light font-sans">
            <Link to="/" className="hover:text-cobalt transition-all">Home</Link>
            <Link to="/collection" className="hover:text-cobalt transition-all">Collection</Link>
            <Link to="/space" className="hover:text-cobalt transition-all">Space</Link>
            <Link to="/journal" className="hover:text-cobalt transition-all">Journal</Link>
          </div>
 
          {/* Right Actions */}
          <div className="flex justify-end gap-4 md:gap-6 items-center">
            {/* Slide-out/Fade-in search input bar */}
            <div className="flex items-center gap-2 relative">
              {showSearch && (
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

            {/* Login/Out status represented as minimal icon buttons */}
            {isAuth ? (
              <button 
                onClick={handleLogout} 
                className="text-orange hover:text-ink transition-colors flex items-center justify-center cursor-pointer"
                title="Admin Logout"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <Link 
                to="/admin" 
                className="text-ink/60 hover:text-cobalt transition-colors flex items-center justify-center"
                title="Admin Login"
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
    </>
  );
}
