import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, LayoutDashboard, LogOut } from "lucide-react";
import { APP_VERSION } from "../lib/version";

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
      {/* Left: Brand Slogan */}
      <div className="flex items-center gap-2 md:w-1/3 justify-start">
        <div className="w-1.5 h-1.5 bg-cobalt rounded-full"></div>
        <span>Casual Uniqueness — Seoul</span>
      </div>
      
      {/* Center: Copyright & Version (V0.80h) */}
      <div className="flex items-center justify-center gap-2 md:w-1/3 text-center">
        <span>© {new Date().getFullYear()} AMPH design</span>
        <span className="text-ink/40 font-black">({APP_VERSION})</span>
      </div>

      {/* Right: Admin Icons & Scroll Discovery */}
      <div className="flex items-center gap-6 md:w-1/3 justify-end">
        <div className="hidden md:block text-ink/30">// SCROLL DISCOVERY</div>
        <div className="text-ink/30">
          {isAuth ? (
            <div className="flex items-center gap-3">
              <Link to="/admin" className="hover:text-cobalt transition-colors" title="Admin Dashboard">
                <LayoutDashboard size={14} className="text-ink/50 hover:text-cobalt" />
              </Link>
              <button onClick={handleLogout} className="hover:text-orange transition-colors cursor-pointer" title="Admin Logout">
                <LogOut size={14} className="text-ink/50 hover:text-orange" />
              </button>
            </div>
          ) : (
            <Link to="/admin" className="hover:text-cobalt transition-colors" title="Admin Access">
              <Lock size={14} className="text-ink/50 hover:text-cobalt" />
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
