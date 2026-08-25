import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Edit3 } from "lucide-react";

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
      className="fixed bottom-6 left-6 z-[150] w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-2xl bg-ink hover:bg-cobalt text-white flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20 group/editbtn"
      title="Edit Page Content (수정 모드 진입)"
    >
      <Edit3 size={16} className="group-hover/editbtn:rotate-12 transition-transform" />
      <span className="text-[8px] font-black uppercase tracking-wider mt-0.5 font-mono">EDIT</span>
    </Link>
  );
}
