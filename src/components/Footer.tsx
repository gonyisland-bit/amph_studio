import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function Footer() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      setIsAuth(localStorage.getItem('admin_auth') === 'true');
    };
    window.addEventListener('admin_auth_change', checkAuth);
    return () => window.removeEventListener('admin_auth_change', checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuth(false);
    window.dispatchEvent(new Event('admin_auth_change'));
    navigate('/');
  };

  return (
    <footer className="px-6 md:px-12 py-8 border-t border-black/10 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-widest font-sans gap-4 bg-off-white">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-cobalt rounded-full"></div>
        <span>Casual Uniqueness — Seoul</span>
      </div>
      
      {/* Admin / Dashboard Text Links in Footer */}
      <div className="flex items-center gap-6 text-ink/40">
        {isAuth ? (
          <>
            <Link to="/admin" className="hover:text-cobalt transition-colors font-bold">Dashboard</Link>
            <button onClick={handleLogout} className="hover:text-orange transition-colors font-bold uppercase cursor-pointer">Logout</button>
          </>
        ) : (
          <Link to="/admin" className="hover:text-cobalt transition-colors font-bold">Admin Login</Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>© {new Date().getFullYear()} AMPH FLAGSHIP</span>
          <span className="text-ink/40 font-black">(V0.80c)</span>
        </div>
        <div className="hidden md:block text-ink/30">// SCROLL DISCOVERY</div>
      </div>
    </footer>
  );
}
