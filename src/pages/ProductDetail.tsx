import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProducts, Product } from "../lib/data";
import { MoveRight } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');

  useEffect(() => {
    if (id) {
      getProductById(id).then(setProduct);
      getProducts().then(all => {
        setRecommendations(all.filter(p => p.id !== id).slice(0, 6));
      });
      setActiveImage(0); // reset image state on product change
    }
  }, [id]);

  if (!product) return <div className="p-12 font-sans">Loading...</div>;

  const displayImages = [
    ...(product.images || []),
    ...(product.hoverImages || [])
  ].filter(Boolean);

  return (
    <div className="flex flex-col flex-grow bg-white">
      {isAuth && (
        <Link to="/admin" className="fixed bottom-12 left-12 z-[100] bg-cobalt text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-orange transition-all">
          Edit Product
        </Link>
      )}
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-6 md:px-12 py-4 border-b border-black/10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/shop" className="text-xs uppercase tracking-widest font-semibold hover:text-cobalt transition-colors hidden md:block mr-4 border-r border-black/10 pr-4">Collection</Link>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange font-sans block mb-1">{product.category}</span>
            <h1 className="text-xl font-bold font-sans tracking-tight leading-tight">{product.name}</h1>
            <p className="text-[10px] font-serif italic text-ink/60">{product.subTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-semibold font-sans">${product.price}</span>
          <button className="bg-ink text-white text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded-full hover:bg-cobalt transition-colors">
            Add to Cart
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-grow">
        {/* Left Side: Product Images gallery */}
        <div className="flex-[1.5] flex flex-col border-b md:border-b-0 md:border-r border-black/10 p-6 md:p-12 relative bg-silver/10 justify-center items-center">
          
          <div className="w-full max-w-2xl aspect-[4/5] bg-black/5 rounded-[40px] overflow-hidden relative shadow-inner">
            <img 
              src={displayImages[activeImage]} 
              alt={product.name} 
              className="absolute inset-0 w-full h-full object-cover mix-blend-multiply transition-opacity duration-500"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex gap-4 mt-8 md:absolute md:bottom-12 md:left-12 flex-wrap max-w-sm">
            {displayImages.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`w-16 h-16 rounded-[12px] border-2 ${activeImage === idx ? 'border-cobalt' : 'border-black/5'} bg-white overflow-hidden transition-all shadow-sm hover:border-black/20 shrink-0`}
              >
                <img src={img} alt="" className="w-full h-full object-cover mix-blend-multiply" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Overview */}
        <div className="flex-1 p-6 md:p-16 flex flex-col bg-off-white">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-6 font-sans text-ink/40">Product Overview</h2>
          <p className="text-3xl leading-snug mb-12 font-serif italic text-ink/90">{product.description}</p>
          
          <div className="grid grid-cols-2 gap-y-10 gap-x-8 mt-auto">
            <div>
              <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">Material</span>
              <span className="text-sm font-semibold font-sans border-b border-black/20 pb-1">{product.material}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">Color</span>
              <span className="text-sm font-semibold font-sans border-b border-black/20 pb-1">{product.color || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">Dimensions</span>
              <span className="text-sm font-semibold font-sans border-b border-black/20 pb-1">{product.dimensions || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">Shipping</span>
              <span className="text-sm font-semibold font-sans border-b border-black/20 pb-1">{product.shipping || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">SKU</span>
              <span className="text-sm font-mono font-semibold border-b border-black/20 pb-1">{product.sku || product.id.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Blocks Section (Scrollable Area) */}
      {product.contentBlocks && product.contentBlocks.length > 0 && (
        <div className="px-6 md:px-20 py-20 max-w-5xl mx-auto flex flex-col gap-16">
          {product.contentBlocks.map((block, idx) => {
            if (block.type === 'text') {
              return <p key={idx} className="text-2xl font-sans leading-relaxed text-ink/80 max-w-3xl">{block.value}</p>;
            }
            if (block.type === 'image') {
              return (
                <div key={idx} className="w-full bg-silver/10 p-12 rounded-[40px]">
                  <img src={block.value} alt="" className="w-full h-auto object-cover rounded-2xl mix-blend-multiply shadow-sm" referrerPolicy="no-referrer" />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Amplify With */}
      <div className="border-t border-black/10 p-6 md:p-12 lg:p-20 bg-white overflow-hidden">
        <div className="flex justify-between items-end mb-12">
          <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter uppercase font-sans">Amplify With</h3>
          <Link to="/shop" className="flex items-center gap-2 text-xs uppercase font-semibold hover:text-cobalt transition-colors group">
            Full Collection <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-8 -mx-6 px-6 md:-mx-20 md:px-20 scroll-smooth snap-x">
          {recommendations.map(rec => (
             <Link 
             to={`/product/${rec.id}`}
             key={rec.id}
             className="group flex flex-col border border-black/5 p-4 rounded-[20px] hover:border-black/10 hover:shadow-lg transition-all duration-300 bg-off-white shrink-0 w-[200px] md:w-[260px] snap-start"
           >
             <div className="aspect-[4/5] bg-silver/20 overflow-hidden mb-4 rounded-[12px] relative">
               <img 
                 src={rec.images[0]} 
                 alt={rec.name}
                 className="absolute inset-0 w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700"
                 referrerPolicy="no-referrer"
               />
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-orange font-sans block">{rec.category}</span>
                <h4 className="text-sm md:text-base font-bold font-sans mt-0.5 tracking-tight truncate">{rec.name}</h4>
                <span className="text-xs font-semibold font-sans mt-2 text-ink/40">${rec.price}</span>
             </div>
           </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
