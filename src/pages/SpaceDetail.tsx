import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSpaces, getProducts, SpaceModel, Product } from "../lib/data";
import { MoveRight } from "lucide-react";

export default function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [space, setSpace] = useState<SpaceModel | null>(null);
  const [appliedProducts, setAppliedProducts] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');

  useEffect(() => {
    if (id) {
      getSpaces().then(all => {
        const found = all.find(s => s.id === id);
        if (found) {
          setSpace(found);
          if (found.appliedProductIds) {
            getProducts().then(prods => {
              setAppliedProducts(prods.filter(p => found.appliedProductIds?.includes(p.id)));
            });
          }
        }
      });
      setActiveImage(0);
    }
  }, [id]);

  if (!space) return <div className="p-12 font-sans animate-pulse">Loading Space...</div>;

  const displayImages = space.images || [];

  return (
    <div className="flex flex-col flex-grow bg-white font-sans text-ink">
      {isAuth && (
        <Link to="/admin" className="fixed bottom-8 right-8 z-[100] bg-cobalt text-white px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-orange transition-all">
          Edit Space
        </Link>
      )}

      {/* Hero Header */}
      <div className="relative w-full h-[70vh] md:h-[85vh] bg-silver/10">
        <img 
          src={displayImages[0] || space.image} 
          alt={space.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
        <div className="absolute bottom-12 left-6 md:left-24 max-w-4xl">
          <Link to="/space" className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 block hover:text-cobalt transition-colors">← Back to Spaces</Link>
          <h1 className="text-4xl md:text-8xl font-black uppercase tracking-tight leading-[0.9] text-ink">{space.title}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 md:px-24 py-12 md:py-24">
        {/* Intro Text */}
        <div className="max-w-3xl mb-24">
          <p className="text-xl md:text-3xl leading-relaxed font-serif italic text-ink/80 whitespace-pre-wrap">{space.description}</p>
        </div>

        {/* Content Blocks (Magazine Style) */}
        <div className="space-y-24 mb-24">
          {space.contentBlocks?.map((block, idx) => (
            <div key={idx} className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center reveal`}>
              {block.type === 'image' ? (
                <div className="w-full md:w-1/2 aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl bg-black/5">
                  <img src={block.value} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="w-full md:w-1/2">
                  <p className="text-lg md:text-xl leading-relaxed text-ink/70 whitespace-pre-wrap font-serif italic">{block.value}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Remaining Gallery Images */}
        {displayImages.length > 1 && (
          <div className="mb-24">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-12 text-ink/30 border-b border-black/10 pb-4">Gallery View</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayImages.slice(1).map((img, idx) => (
                <div key={idx} className="aspect-square rounded-[24px] overflow-hidden bg-black/5 group cursor-zoom-in reveal">
                  <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applied Products */}
        {appliedProducts.length > 0 && (
          <div className="pt-24 border-t border-black/10 reveal">
            <div className="flex flex-col md:flex-row justify-between items-baseline mb-16 gap-4">
              <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Shop the Space</h3>
              <p className="text-sm font-serif italic text-ink/40">Curated objects featured in this environment.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {appliedProducts.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="group block">
                  <div className="aspect-[4/5] bg-silver/20 rounded-[20px] overflow-hidden mb-6 shadow-sm border border-black/5">
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 mix-blend-multiply" />
                  </div>
                  <h4 className="text-sm font-bold tracking-tight mb-1 group-hover:text-cobalt transition-colors">{p.name}</h4>
                  <p className="text-[10px] font-bold text-ink/30 uppercase tracking-widest">{p.category}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-12 md:p-32 border-t border-black/10 bg-off-white text-center">
        <Link to="/space" className="inline-flex items-center gap-6 text-4xl md:text-8xl font-black uppercase tracking-tighter hover:text-cobalt transition-all group">
          Next Space <MoveRight size={64} className="group-hover:translate-x-6 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
