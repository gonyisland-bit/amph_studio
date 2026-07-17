import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, getProducts, Product } from "../lib/data";
import { MoveRight } from "lucide-react";
import { MediaRenderer } from "../components/MediaRenderer";
import { useScrollReveal } from "../lib/useScrollReveal";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isAuth, setIsAuth] = useState(localStorage.getItem('admin_auth') === 'true');
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  useScrollReveal();

  useEffect(() => {
    if (id) {
      getProductById(id).then(setProduct);
      getProducts().then(all => {
        setRecommendations(all.filter(p => p.id !== id).slice(0, 6));
      });
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      if (product.color) {
        setSelectedColor(product.color.split(',')[0].trim());
      }
      if (product.material) {
        setSelectedMaterial(product.material.split(',')[0].trim());
      }
    }
  }, [product]);

  if (!product) return <div className="p-12 font-sans animate-pulse">Loading...</div>;

  const displayImages = [
    ...(product.images || []),
    ...(product.hoverImages || [])
  ].filter(Boolean);

  // ETA & Frame Spec Mock mapper
  const getMockedSpecs = () => {
    let frame = "Industrial seamless joint construction";
    let eta = "4-6 weeks (Handcrafted to order)";
    
    const mat = (product.material || "").toLowerCase();
    if (mat.includes("oak")) {
      frame = "Solid white oak frame / Tenon joinery";
    } else if (mat.includes("steel")) {
      frame = "Powder-coated tubular steel / Seamless welding";
    } else if (mat.includes("ash")) {
      frame = "Solid ash wood frame / Hand-finished";
    }
    
    if (product.category === "Objects" || product.category === "Lighting") {
      eta = "3-5 business days";
    }
    
    return { frame, eta };
  };

  const { frame, eta } = getMockedSpecs();

  return (
    <div className="flex flex-col flex-grow bg-white">
      {isAuth && (
        <Link to="/admin" className="fixed bottom-12 left-12 z-[100] bg-cobalt text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-orange transition-all scale-100 hover:scale-110">
          Edit Product
        </Link>
      )}
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-6 md:px-12 py-4 border-b border-black/10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/collection" className="text-xs uppercase tracking-widest font-black hover:text-cobalt transition-colors hidden md:block mr-4 border-r border-black/10 pr-4">Collection</Link>
          <div>
            <span className="caption-nano text-orange font-bold block mb-1">{product.category}</span>
            <h1 className="text-xl font-bold font-sans tracking-tight leading-tight">{product.name}</h1>
            <p className="text-[10px] font-serif italic text-ink/60">{product.subTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-bold font-sans">${product.price}</span>
          <button className="bg-ink text-white text-[10px] uppercase tracking-widest font-black px-6 py-3.5 rounded-none hover:bg-cobalt transition-colors">
            Add to Cart
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-grow border-b border-black/10">
        {/* Left Side: Media Gallery (Split 60%) */}
        <div className="w-full md:w-[60%] flex flex-col p-6 md:p-12 gap-8 bg-silver/5 border-b md:border-b-0 md:border-r border-black/10">
          {displayImages.map((img, idx) => (
            <div key={idx} className="w-full aspect-[4/5] bg-black/5 rounded-[4px] overflow-hidden relative shadow-inner">
              <MediaRenderer 
                src={img} 
                alt={`${product.name} view ${idx + 1}`} 
                className="absolute inset-0 w-full h-full object-cover"
                loading={idx === 0 ? "eager" : "lazy"}
                fetchpriority={idx === 0 ? "high" : "auto"}
              />
            </div>
          ))}
        </div>

        {/* Right Side: Overview & Purchase Controls (Split 40% - Sticky) */}
        <div className="w-full md:w-[40%] p-6 md:p-12 lg:p-16 flex flex-col bg-off-white relative">
          <div className="md:sticky md:top-28 h-fit">
            <span className="caption-nano text-cobalt mb-4 block font-black">Product Overview</span>
            <p className="text-xl md:text-2xl leading-relaxed mb-12 font-serif italic text-ink/90 reveal">{product.description}</p>
            
            {/* Color Option Selector */}
            {product.color && (
              <div className="mb-8 border-t border-black/5 pt-6">
                <span className="caption-nano text-ink/50 block mb-3 font-bold">Select Color</span>
                <div className="flex gap-3">
                  {product.color.split(',').map(c => c.trim()).map(color => {
                    const colorMap: Record<string, string> = {
                      'Oak': '#d7c29d',
                      'Ash': '#e5dec9',
                      'Walnut': '#4b382a',
                      'Steel': '#8a9597',
                      'Black': '#1c1c1c',
                      'White': '#ffffff',
                      'Cobalt': '#0047AB',
                      'Orange': '#FF4500',
                      'Pink': '#F8BBD0',
                      'Silver': '#E0E0E2',
                      'Gray': '#808080',
                      'Charcoal': '#36454F',
                      'Cream': '#FFFDD0',
                      'Beige': '#F5F5DC',
                      'Natural': '#e8d8c1'
                    };
                    const hex = colorMap[color] || '#888';
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-cobalt scale-110 shadow-md' : 'border-black/10'}`}
                        title={color}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: hex }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Material Option Selector */}
            {product.material && product.material.split(',').length > 1 && (
              <div className="mb-8 border-t border-black/5 pt-6">
                <span className="caption-nano text-ink/50 block mb-3 font-bold">Select Material</span>
                <div className="flex gap-2">
                  {product.material.split(',').map(m => m.trim()).map(mat => {
                    const isSelected = selectedMaterial === mat;
                    return (
                      <button
                        key={mat}
                        onClick={() => setSelectedMaterial(mat)}
                        className={`px-4 py-2 border text-[10px] font-sans font-bold uppercase transition-all tracking-wider ${isSelected ? 'bg-ink text-white border-ink' : 'bg-transparent text-ink/60 border-black/10 hover:border-black/30'}`}
                      >
                        {mat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table Specifications */}
            <div className="border-t border-black/10 mt-8 mb-12">
              <table className="w-full text-left text-xs font-sans">
                <tbody>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">Material</td>
                    <td className="text-ink/80 font-semibold">{product.material}</td>
                  </tr>
                  {product.color && (
                    <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                      <td className="font-bold text-ink/50 uppercase caption-nano">Color Options</td>
                      <td className="text-ink/80 font-semibold">{product.color}</td>
                    </tr>
                  )}
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">Frame Structural</td>
                    <td className="text-ink/80 font-semibold">{frame}</td>
                  </tr>
                  {product.dimensions && (
                    <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                      <td className="font-bold text-ink/50 uppercase caption-nano">Dimensions</td>
                      <td className="text-ink/80 font-semibold">{product.dimensions}</td>
                    </tr>
                  )}
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">Estimated ETA</td>
                    <td className="text-ink/80 font-semibold">{eta}</td>
                  </tr>
                  <tr className="border-b border-black/10 py-3.5 flex justify-between items-center">
                    <td className="font-bold text-ink/50 uppercase caption-nano">SKU Code</td>
                    <td className="text-ink/80 font-mono text-[10px]">{product.sku || product.id.toUpperCase()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Purchase CTA */}
            <button className="bg-ink hover:bg-cobalt text-white text-[11px] uppercase tracking-[0.2em] font-black py-5 px-8 rounded-none w-full transition-all duration-300 shadow-md">
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Content Blocks */}
      {product.contentBlocks && product.contentBlocks.length > 0 && (
        <div className="px-6 md:px-20 py-24 max-w-6xl mx-auto flex flex-col gap-24 w-full">
          {product.contentBlocks.map((block, idx) => {
            if (block.type === 'text') {
              return (
                <div key={idx} className="reveal max-w-3xl">
                  <p className="text-3xl font-sans leading-relaxed text-ink/80">{block.value}</p>
                </div>
              );
            }
            if (block.type === 'image') {
              return (
                <div key={idx} className="w-full bg-silver/5 p-8 md:p-16 rounded-[40px] reveal">
                  <MediaRenderer src={block.value} className="w-full h-auto rounded-2xl shadow-xl" loading="lazy" />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Amplify With (Recommended Grid 4 Items) */}
      <div className="border-t border-black/10 py-24 px-6 md:px-12 lg:px-20 bg-white reveal">
        <div className="flex justify-between items-end mb-16">
          <h3 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase font-sans leading-none">Amplify With</h3>
          <Link to="/collection" className="flex items-center gap-2 text-xs uppercase font-black hover:text-cobalt transition-colors group">
            Full Collection <MoveRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/10 border-t border-b border-black/10">
          {recommendations.slice(0, 4).map(rec => (
             <Link 
              to={`/product/${rec.id}`}
              key={rec.id}
              className="group flex flex-col pt-12 pb-8 px-8 bg-white hover:bg-off-white transition-colors duration-500 reveal"
            >
              <div className="flex justify-between items-start mb-8 z-10 relative">
                <span className="caption-nano text-orange px-3 py-1 border border-orange/30 rounded-full font-bold">
                  {rec.category}
                </span>
                {rec.price > 0 && (
                  <span className="text-xs font-bold font-sans text-ink/70">${rec.price}</span>
                )}
              </div>
              
              <div className="flex-grow w-full aspect-[4/5] bg-silver/10 overflow-hidden rounded-[4px] relative mb-8">
                {/* Primary Image */}
                <MediaRenderer 
                  src={rec.images[0]} 
                  alt={rec.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${rec.hoverImages?.[0] ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-110'}`}
                  loading="lazy"
                />
                {/* Secondary Hover Image */}
                {rec.hoverImages?.[0] && (
                  <MediaRenderer 
                    src={rec.hoverImages[0]} 
                    alt={`${rec.name} alternative view`}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-1000 ease-in-out group-hover:opacity-100 group-hover:scale-100 scale-95"
                    loading="lazy"
                  />
                )}
              </div>

              <div className="mt-auto z-10 relative">
                <h4 className="text-2xl font-bold font-sans tracking-tight leading-tight group-hover:text-cobalt transition-colors">{rec.name}</h4>
                <p className="text-xs text-ink/40 mt-1 font-serif italic mb-4">{rec.subTitle}</p>
                
                {/* Option Chips Panel */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-black/5 items-center">
                  {renderChips(rec)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Option Color & Material Chips helper (for recommendations)
function renderChips(product: Product) {
  const chips: React.ReactNode[] = [];
  
  if (product.material) {
    const materials = product.material.split(',').map(m => m.trim());
    materials.forEach(mat => {
      chips.push(
        <span key={`mat-${mat}`} className="text-[9px] font-sans font-bold tracking-wider uppercase bg-ink/5 text-ink/60 px-2 py-0.5 rounded-[2px] border border-black/5">
          {mat}
        </span>
      );
    });
  }

  if (product.color) {
    const colorMap: Record<string, string> = {
      'Oak': '#d7c29d',
      'Ash': '#e5dec9',
      'Walnut': '#4b382a',
      'Steel': '#8a9597',
      'Black': '#1c1c1c',
      'White': '#ffffff',
      'Cobalt': '#0047AB',
      'Orange': '#FF4500',
      'Pink': '#F8BBD0',
      'Silver': '#E0E0E2',
      'Gray': '#808080',
      'Charcoal': '#36454F',
      'Cream': '#FFFDD0',
      'Beige': '#F5F5DC',
      'Natural': '#e8d8c1'
    };

    const colors = product.color.split(',').map(c => c.trim());
    colors.forEach(col => {
      const hex = colorMap[col] || colorMap[col.charAt(0).toUpperCase() + col.slice(1).toLowerCase()];
      if (hex) {
        chips.push(
          <div 
            key={`col-${col}`} 
            className="w-3 h-3 rounded-full border border-black/15 shadow-sm shrink-0" 
            style={{ backgroundColor: hex }}
            title={col}
          />
        );
      } else {
        chips.push(
          <span key={`col-${col}`} className="text-[9px] font-sans font-bold tracking-wider uppercase bg-cobalt/5 text-cobalt/70 px-2 py-0.5 rounded-[2px] border border-cobalt/10">
            {col}
          </span>
        );
      }
    });
  }

  return chips.length > 0 ? chips : <span className="text-[9px] text-ink/30 italic">Standard options</span>;
}
