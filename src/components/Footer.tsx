export function Footer() {
  return (
    <footer className="px-6 md:px-12 py-6 border-t border-black/10 flex flex-col md:flex-row justify-between items-center text-[11px] uppercase tracking-widest font-sans gap-4 bg-off-white">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-cobalt rounded-full"></div>
        <span>Casual Uniqueness — Seoul</span>
      </div>
      <div className="flex items-center gap-2">
        <span>© {new Date().getFullYear()} AMPH DIGITAL FLAGSHIP</span>
        <span className="text-ink/40 font-black">(V0.7)</span>
      </div>
      <div className="hidden md:block">SCROLL DISCOVERY (01 / 04)</div>
    </footer>
  );
}
