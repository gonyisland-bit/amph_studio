import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProducts, Product } from "../lib/data";
import { MoveRight } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (id) {
      getProductById(id).then(setProduct);
      getProducts().then(all => {
        setRecommendations(all.filter(p => p.id !== id).slice(0, 3));
      });
      setActiveImage(0); // reset image state on product change
    }
  }, [id]);

  if (!product) return <div className="p-12 font-sans">Loading...</div>;

  const displayImages = [product.images[0], ...(product.hoverImages || [])].filter(Boolean);

  return (
    <div className="flex flex-col flex-grow bg-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-6 md:px-12 py-4 border-b border-black/10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/shop" className="text-xs uppercase tracking-widest font-semibold hover:text-cobalt transition-colors hidden md:block mr-4 border-r border-black/10 pr-4">Shop</Link>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange font-sans block mb-1">{product.category}</span>
            <h1 className="text-xl font-bold font-sans tracking-tight">{product.name}</h1>
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

        {/* Right Side: Details */}
        <div className="flex-1 p-6 md:p-16 flex flex-col bg-off-white">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-6 font-sans text-ink/40">Product Overview</h2>
          <p className="text-3xl leading-snug mb-12 font-serif italic text-ink/90">{product.description}</p>
          
          <div className="flex flex-col gap-8 mb-12">
            {product.contentBlocks?.map((block, idx) => {
              if (block.type === 'text') {
                return <p key={idx} className="text-sm font-sans leading-relaxed text-ink/70">{block.value}</p>;
              }
              if (block.type === 'image') {
                return <img key={idx} src={block.value} alt="" className="w-full rounded-2xl mix-blend-multiply shadow-sm" referrerPolicy="no-referrer" />;
              }
              return null;
            })}
          </div>
          
          <div className="border-t border-black/10 pt-8 mt-auto flex-grow flex flex-col justify-end">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">Material</span>
                <span className="text-sm font-semibold font-sans border-b border-black/20 pb-1">{product.material}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">Dimensions</span>
                <span className="text-sm font-semibold font-sans border-b border-black/20 pb-1">H 45cm x W 40cm x D 40cm</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div>
                <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">Shipping</span>
                <span className="text-sm font-semibold font-sans border-b border-black/20 pb-1">2-3 Business Days</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/50 font-sans block mb-2">SKU</span>
                <span className="text-sm font-mono font-semibold border-b border-black/20 pb-1">{product.id.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Amplify With */}
      <div className="border-t border-black/10 p-6 md:p-12 lg:p-20 bg-white">
        <div className="flex justify-between items-end mb-12">
          <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter uppercase font-sans">Amplify With</h3>
          <Link to="/shop" className="flex items-center gap-2 text-xs uppercase font-semibold hover:text-cobalt transition-colors group">
            Full Archive <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {recommendations.map(rec => (
             <Link 
             to={`/product/${rec.id}`}
             key={rec.id}
             className="group flex flex-col border border-black/5 p-6 rounded-[24px] hover:border-black/10 hover:shadow-xl transition-all duration-300 bg-off-white hover:-translate-y-1"
           >
             <div className="aspect-[4/5] bg-silver/20 overflow-hidden mb-6 rounded-[16px] relative">
               <img 
                 src={rec.images[0]} 
                 alt={rec.name}
                 className="absolute inset-0 w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700"
                 referrerPolicy="no-referrer"
               />
             </div>
             <div className="flex justify-between items-start">
               <div>
                  <span className="text-[10px] uppercase font-bold text-orange font-sans block">{rec.category}</span>
                  <h4 className="text-lg font-bold font-sans mt-1 tracking-tight">{rec.name}</h4>
               </div>
               <span className="text-sm font-semibold font-sans bg-white px-3 py-1 rounded-full border border-black/5 shadow-sm">${rec.price}</span>
             </div>
           </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
