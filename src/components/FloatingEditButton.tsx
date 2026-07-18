import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";

export function FloatingEditButton() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      setIsAuth(localStorage.getItem('admin_auth') === 'true');
    };
    window.addEventListener('admin_auth_change', checkAuth);
    return () => window.removeEventListener('admin_auth_change', checkAuth);
  }, []);

  if (!isAuth || location.pathname === '/admin') return null;

  // Determine target admin link based on current path
  let adminLink = '/admin';
  const path = location.pathname;

  if (path === '/') {
    adminLink = '/admin?tab=home';
  } else if (path === '/collection') {
    adminLink = '/admin?tab=collection';
  } else if (path.startsWith('/product/')) {
    const prodId = path.split('/product/')[1];
    adminLink = `/admin?tab=collection&edit=${prodId}`;
  } else if (path === '/space') {
    adminLink = '/admin?tab=space';
  } else if (path.startsWith('/space/')) {
    const spaceId = path.split('/space/')[1];
    adminLink = `/admin?tab=space&edit=${spaceId}`;
  } else if (path === '/journal') {
    adminLink = '/admin?tab=journal';
  } else if (path.startsWith('/journal/')) {
    const journalId = path.split('/journal/')[1];
    adminLink = `/admin?tab=journal&edit=${journalId}`;
  }

  return (
    <Link 
      to={adminLink} 
      className="fixed bottom-8 left-8 z-[100] bg-cobalt text-white px-5 py-3 rounded-none font-black text-[9px] uppercase tracking-widest shadow-2xl hover:bg-orange hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 border border-white/10"
    >
      <Settings size={12} className="animate-spin-slow" />
      Edit Page Content
    </Link>
  );
}
