import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

export function Navigation() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
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

  return (
    <>
      <nav className="px-6 md:px-12 py-6 border-b border-black/5 bg-white z-50 relative">
        <div className="max-w-[1800px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">
          {/* Logo */}
          <div className="flex justify-start">
            <Link to="/" className="text-2xl md:text-3xl font-bold tracking-tighter uppercase font-sans">Amph</Link>
          </div>
          
          {/* Center Menu (Desktop) */}
          <div className="hidden md:flex justify-center gap-10 text-[11px] uppercase tracking-widest font-black font-sans">
            <Link to="/" className="hover:text-cobalt transition-all">Home</Link>
            <Link to="/collection" className="hover:text-cobalt transition-all">Collection</Link>
            <Link to="/space" className="hover:text-cobalt transition-all">Space</Link>
            <Link to="/journal" className="hover:text-cobalt transition-all">Journal</Link>
          </div>

          {/* Right Actions */}
          <div className="flex justify-end gap-4 md:gap-8 text-[11px] uppercase tracking-widest font-semibold font-sans items-center">
            <span className="hidden lg:inline cursor-pointer hover:text-cobalt text-[10px]">KR / EN</span>
            {isAuth ? (
              <div className="flex items-center gap-2">
                <Link to="/admin" className="flex items-center gap-1 text-cobalt border border-cobalt/20 px-3 py-1 rounded-full hover:bg-cobalt hover:text-white transition-all text-[9px] font-bold">
                  <Settings size={10} /> DASHBOARD
                </Link>
                <button onClick={handleLogout} className="text-orange border border-orange/20 px-3 py-1 rounded-full hover:bg-orange hover:text-white transition-all text-[9px] font-bold">
                  LOGOUT
                </button>
              </div>
            ) : (
              <Link to="/admin" className="text-ink/30 hover:text-ink transition-colors text-[9px] font-bold border border-black/10 px-3 py-1 rounded-full">ADMIN</Link>
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
