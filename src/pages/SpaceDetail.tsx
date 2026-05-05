import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSpaces, getProducts, SpaceModel, Product } from "../lib/data";
import { MoveRight } from "lucide-react";

export default function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [space, setSpace] = useState<SpaceModel | null>(null);
  const [appliedProducts, setAppliedProducts] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);

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
    <div className="flex flex-col flex-grow bg-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-6 md:px-12 py-4 border-b border-black/10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/space" className="text-xs uppercase tracking-widest font-semibold hover:text-cobalt transition-colors border-r border-black/10 pr-4">Spaces</Link>
          <h1 className="text-xl font-bold font-sans tracking-tight">{space.title}</h1>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-grow min-h-[70vh]">
        {/* Left Side: Space Images */}
        <div className="flex-[1.5] flex flex-col border-b md:border-b-0 md:border-r border-black/10 p-6 md:p-12 bg-silver/10 justify-center items-center relative">
          <div className="w-full h-full max-h-[80vh] bg-black/5 rounded-[20px] overflow-hidden relative shadow-inner">
            <img 
              src={displayImages[activeImage]} 
              alt={space.title} 
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              referrerPolicy="no-referrer"
            />
          </div>

          {displayImages.length > 1 && (
            <div className="flex gap-4 mt-8 md:absolute md:bottom-12 md:left-12 flex-wrap max-w-sm">
              {displayImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-[12px] border-2 ${activeImage === idx ? 'border-cobalt' : 'border-black/5'} bg-white overflow-hidden transition-all shadow-sm hover:border-black/20 shrink-0`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Info */}
        <div className="flex-1 p-6 md:p-16 flex flex-col bg-off-white">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-6 font-sans text-ink/40">Space Overview</h2>
          <p className="text-3xl leading-snug mb-12 font-serif italic text-ink/90 whitespace-pre-wrap">{space.description}</p>
          
          {appliedProducts.length > 0 && (
            <div className="mt-auto pt-12 border-t border-black/10">
              <h3 className="text-xs uppercase font-bold tracking-widest mb-8 text-ink/40">Applied Items</h3>
              <div className="grid grid-cols-2 gap-6">
                {appliedProducts.map(p => (
                  <Link key={p.id} to={`/product/${p.id}`} className="group block">
                    <div className="aspect-[4/5] bg-silver/20 rounded-xl overflow-hidden mb-3">
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <h4 className="text-sm font-bold truncate">{p.name}</h4>
                    <p className="text-[10px] text-ink/40 uppercase">{p.category}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back to Spaces */}
      <div className="p-12 md:p-24 border-t border-black/10 bg-white text-center">
        <Link to="/space" className="inline-flex items-center gap-4 text-4xl md:text-6xl font-black uppercase tracking-tighter hover:text-cobalt transition-colors group">
          View All Spaces <MoveRight size={48} className="group-hover:translate-x-4 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
