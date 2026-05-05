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
    <nav className="flex justify-between items-center px-6 md:px-12 py-8 border-b border-black/5 bg-white z-50 relative">
      <Link to="/" className="text-3xl font-bold tracking-tighter uppercase font-sans">Amph</Link>
      
      <div className="hidden md:flex gap-12 text-[11px] uppercase tracking-widest font-semibold font-sans">
        <Link to="/" className="hover:text-cobalt transition-colors">Home</Link>
        <Link to="/collection" className="hover:text-cobalt transition-colors">Collection</Link>
        <Link to="/space" className="hover:text-cobalt transition-colors">Space</Link>
        <Link to="/journal" className="hover:text-cobalt transition-colors">Journal</Link>
      </div>

      <div className="flex gap-4 md:gap-8 text-[11px] uppercase tracking-widest font-semibold font-sans items-center">
        <span className="hidden md:inline cursor-pointer hover:text-cobalt">KR / EN</span>
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
    </nav>
  );
}
