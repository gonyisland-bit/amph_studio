import { Link } from "react-router-dom";

export function Navigation() {
  return (
    <nav className="flex justify-between items-center px-6 md:px-12 py-8 border-b border-black/5 bg-white z-50 relative">
      <Link to="/" className="text-3xl font-bold tracking-tighter uppercase font-sans">Amph</Link>
      
      <div className="hidden md:flex gap-12 text-[11px] uppercase tracking-widest font-semibold font-sans">
        <Link to="/" className="hover:text-cobalt transition-colors">Collection</Link>
        <Link to="/journal" className="hover:text-cobalt transition-colors">Journal</Link>
        <Link to="/space" className="hover:text-cobalt transition-colors">Space</Link>
        <Link to="/shop" className="hover:text-cobalt transition-colors">Shop</Link>
      </div>

      <div className="flex gap-8 text-[11px] uppercase tracking-widest font-semibold font-sans items-center">
        <span className="hidden md:inline cursor-pointer hover:text-cobalt">KR / EN</span>
        <Link to="/admin" className="text-ink hover:text-cobalt px-4 py-2 bg-silver/20 rounded-full transition-colors hidden sm:block">Admin</Link>
      </div>
    </nav>
  );
}
