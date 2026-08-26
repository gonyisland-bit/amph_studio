import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  getProducts, Product, deleteProduct, updateProduct, addProduct, Category, ContentBlock, ColorOption, HotspotPin,
  getJournals, JournalArticle, deleteJournal, updateJournal, addJournal,
  getSpaces, SpaceModel, deleteSpace, updateSpace, addSpace,
  HomeSettings, getHomeSettings, updateHomeSettings, defaultHomeSettings, deleteBlob, generateProductCode, defaultColorAssets, MagazineCard, HomeShowcaseItem
} from "../lib/data";
import { resolveColorHex } from "../lib/colorUtils";
import { Plus, Trash2, Copy, LogOut, CheckCircle2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Star, Lock, Save, MoreVertical, MapPin, Sparkles, ArrowLeft, RotateCcw, Eye } from "lucide-react";
import { MediaRenderer, normalizeMediaUrl } from "../components/MediaRenderer";
import { AdminHotspotEditor } from "../components/AdminHotspotEditor";
import { ImageHotspots } from "../components/ImageHotspots";

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'Chairs', description: '', subTitle: '', material: '', price: 0, images: ['', '', ''], hoverImages: [''], contentBlocks: [], color: '', dimensions: '', shipping: 'Delivery (Free)', sku: '', cartEnabled: true, portraitImages: []
};
const emptyJournal: Omit<JournalArticle, 'id'> = {
  title: '', category: '', date: '', image: '', appliedProductIds: [], contentBlocks: [
    { id: 'block-0', type: 'image', value: '' },
    { id: 'block-1', type: 'image', value: '' },
    { id: 'block-2', type: 'image', value: '' },
    { id: 'block-3', type: 'text', value: '' }
  ]
};
const emptySpace: Omit<SpaceModel, 'id'> = {
  title: '', description: '', images: [], appliedProductIds: [], contentBlocks: [
    { id: 'block-0', type: 'image', value: '' },
    { id: 'block-1', type: 'image', value: '' },
    { id: 'block-2', type: 'image', value: '' },
    { id: 'block-3', type: 'text', value: '' }
  ]
};

// Premium form input helper
const EditorInput = ({ label, required, value, onChange, placeholder, type = "text", rows }: { label: string, required?: boolean, value: string | number, onChange: (val: any) => void, placeholder?: string, type?: string, rows?: number }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (rows && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, rows]);

  return (
    <div className="w-full">
      <label className="block text-[10px] font-black uppercase text-ink/40 tracking-wider mb-2">{label}</label>
      {rows ? (
        <textarea
          ref={textareaRef}
          required={required}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full border border-black/10 rounded-none p-3 bg-white outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt/20 text-xs transition-all duration-300 shadow-sm resize-none overflow-hidden"
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value ?? ''}
          onChange={e => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="w-full border border-black/10 rounded-none p-3 bg-white outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt/20 text-xs transition-all duration-300 shadow-sm"
        />
      )}
    </div>
  );
};

const MediaUploadInput = ({ 
  value = '', 
  onChange, 
  onBatchUpload,
  label,
  fit = 'cover'
}: { 
  value?: string, 
  onChange: (val: string) => void, 
  onBatchUpload?: (urls: string[]) => void,
  label?: string,
  fit?: 'cover' | 'contain'
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputIdRef = useRef(`file-input-${Math.random().toString(36).substring(2, 9)}`);

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploading(true);
    try {
      const uploadPromises = fileArray.map(async (file) => {
        const initRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'application/octet-stream'
          }),
        });
        if (!initRes.ok) {
          const errText = await initRes.text().catch(() => '');
          console.error('R2 init error:', initRes.status, errText);
          let errMsg = 'Failed to prepare upload URL';
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error) errMsg = errJson.error;
          } catch (e) {}
          throw new Error(`[${initRes.status}] ${errMsg}`);
        }
        const { uploadUrl, url } = await initRes.json();

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!putRes.ok) throw new Error(`[${putRes.status}] Failed to upload file to Cloudflare R2`);
        return url;
      });

      const urls = await Promise.all(uploadPromises);
      if (urls.length === 1) {
        onChange(urls[0]);
      } else if (urls.length > 1) {
        if (onBatchUpload) {
          onBatchUpload(urls);
        } else {
          onChange(urls[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error uploading files to Cloudflare R2');
    } finally {
      setUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
  const onDrop = async (e: React.DragEvent) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    setDragActive(false); 
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files); 
    }
  };

  const isVideo = (value || '').toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || (value || '').includes('video');
  const [showUrl, setShowUrl] = useState(false);

  return (
    <div className="w-full mb-4">
      {label && <label className="block text-[10px] font-bold uppercase text-ink/50 mb-2">{label}</label>}
      <div 
        className={`relative rounded-none transition-all cursor-pointer overflow-hidden ${
          value ? 'border border-solid border-black/15 bg-black/5 p-0 h-[120px]' :
          dragActive ? 'border-2 border-dashed border-cobalt bg-cobalt/5 p-4 min-h-[120px] flex flex-col items-center justify-center' :
          'border-2 border-dashed border-black/20 bg-black/5 hover:bg-black/10 p-4 min-h-[120px] flex flex-col items-center justify-center'
        }`}
        onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.remove-btn')) return;
          document.getElementById(inputIdRef.current)?.click();
        }}
      >
        <input 
          id={inputIdRef.current} 
          type="file" 
          accept="image/*,video/*" 
          multiple
          className="hidden" 
          onChange={async (e) => { 
            if (e.target.files && e.target.files.length > 0) {
              await handleUploadFiles(e.target.files);
              e.target.value = '';
            }
          }} 
        />
        {uploading ? (
           <div className="py-12 flex flex-col items-center justify-center text-orange text-xs animate-pulse font-bold font-mono">
             <span className="w-4 h-4 border-2 border-orange border-t-transparent rounded-full animate-spin mb-1.5 inline-block" />
             Uploading...
           </div>
        ) : value ? (
           <div className="relative group/preview w-full h-[120px] bg-black/5 overflow-hidden">
             {isVideo ? (
               <video src={normalizeMediaUrl(value)} className="w-full h-full object-cover rounded-none" autoPlay loop muted playsInline />
             ) : (
                <img 
                  src={normalizeMediaUrl(value)} 
                  alt="Preview" 
                  className={`w-full h-full ${fit === 'contain' ? 'object-contain p-3' : 'object-cover'} rounded-none group-hover/preview:scale-[1.02] transition-transform duration-300`} 
                  nopin="nopin" 
                  data-pin-no-hover="true" 
                />
             )}
             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
               <span className="bg-black/70 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-none font-mono">Click or Drop to Replace</span>
             </div>
             <button 
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Delete this media from server?')) {
                  await deleteBlob(value);
                  onChange('');
                }
              }}
              className="remove-btn absolute top-2 right-2 bg-orange hover:bg-ink text-white w-6 h-6 rounded-none flex items-center justify-center text-xs font-bold shadow-md hover:scale-105 transition-all z-10 cursor-pointer"
              title="Delete Media"
             >
               ✕
             </button>
           </div>
        ) : (
           <div className="text-center text-xs text-ink/50"><span className="text-cobalt font-bold">Click to upload</span> or drag and drop</div>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={showUrl} 
            onChange={e => setShowUrl(e.target.checked)} 
            className="w-3 h-3 text-cobalt border-black/20 focus:ring-cobalt rounded-none" 
          />
          <span className="text-[9px] uppercase font-bold text-ink/40">Input Custom URL</span>
        </label>
        {showUrl && (
          <div className="flex gap-2 items-center animate-in fade-in duration-200">
            <span className="text-[9px] uppercase font-bold text-ink/40 whitespace-nowrap">Or URL:</span>
            <input value={value || ''} onChange={e => onChange(e.target.value)} className="flex-1 border-b border-black/20 bg-transparent outline-none focus:border-cobalt text-xs py-1 rounded-none" placeholder="https://" />
          </div>
        )}
      </div>
    </div>
  );
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    case 'Confirmed':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
    case 'Processing':
      return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30';
    case 'Shipping':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
    case 'Completed':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    default:
      return 'bg-black/5 text-ink/70 border-black/10';
  }
};

const getFormattedShipping = (shipping?: string) => {
  if (!shipping) return 'Delivery (Free)';
  if (shipping.includes('Pickup') || shipping.includes('현장') || shipping.includes('수령')) return 'Pickup';
  if (shipping.includes('Freight') || shipping.includes('화물') || shipping.includes('별도')) return 'Freight (Excl.)';
  if (shipping.includes('Delivery') || shipping.includes('택배') || shipping.includes('포함') || shipping.includes('Free')) return 'Delivery (Free)';
  return shipping;
};

const renderColorBadge = (colorVal: any, foundProd?: any, colorOptionsList?: any[]) => {
  if (!colorVal) return <span>Color: -</span>;

  // Normalize the input - extract name and hex
  let colorName: string = '';
  let colorHex: string | null = null;

  // Build list of all known color definitions to match against
  let allColors: any[] = [];
  if (colorOptionsList && Array.isArray(colorOptionsList)) {
    allColors.push(...colorOptionsList.filter(Boolean));
  }
  if (foundProd?.color) {
    let prodColors = foundProd.color;
    if (typeof prodColors === 'string' && prodColors.trim().startsWith('[')) {
      try { prodColors = JSON.parse(prodColors); } catch(e) {}
    } else if (typeof prodColors === 'string' && prodColors.trim().startsWith('{')) {
      try { prodColors = JSON.parse(prodColors); } catch(e) {}
    }
    if (Array.isArray(prodColors)) allColors.push(...prodColors.filter(Boolean));
    else if (typeof prodColors === 'object' && prodColors !== null) allColors.push(prodColors);
  }

  // Parse the color value
  if (typeof colorVal === 'string') {
    const trimmed = colorVal.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // It's a JSON string
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Array of color objects - take first
          colorName = parsed[0]?.name || '';
          colorHex = parsed[0]?.hex || null;
        } else if (typeof parsed === 'object') {
          colorName = parsed.name || parsed.hex || '';
          colorHex = parsed.hex || null;
        }
      } catch(e) {
        colorName = trimmed;
      }
    } else if (trimmed.startsWith('#')) {
      // Hex code directly
      colorHex = trimmed;
      // Try to find name from allColors
      const m = allColors.find((c: any) => (c.hex || '').toLowerCase() === trimmed.toLowerCase());
      colorName = m?.name || trimmed;
    } else {
      // Plain name
      colorName = trimmed;
      // Try to find hex from allColors
      const m = allColors.find((c: any) => (c.name || '').toLowerCase() === trimmed.toLowerCase());
      colorHex = m?.hex || null;
    }
  } else if (Array.isArray(colorVal) && colorVal.length > 0) {
    // Array of color objects
    colorName = colorVal[0]?.name || colorVal.map((c: any) => c.name || c).join(', ');
    colorHex = colorVal[0]?.hex || null;
  } else if (typeof colorVal === 'object' && colorVal !== null) {
    colorName = colorVal.name || '';
    colorHex = colorVal.hex || null;
  }

  if (!colorName && !colorHex) return <span>Color: -</span>;

  // If still no hex, search allColors by name
  if (!colorHex && colorName) {
    const m = allColors.find((c: any) => (c.name || '').toLowerCase() === colorName.toLowerCase());
    colorHex = m?.hex || null;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span>Color:</span>
      {colorHex && (
        <span
          className="inline-block w-3 h-3 rounded-full border border-black/20 flex-shrink-0"
          style={{ backgroundColor: colorHex }}
          title={colorName || colorHex}
        />
      )}
      <span className="font-bold">{colorName || colorHex}</span>
    </span>
  );
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'home'|'journal'|'space'|'collection'|'colorAssets'|'orders'|'users'>('collection');
  const [orderFilter, setOrderFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [sortBy, setSortBy] = useState<'user' | 'name' | 'category' | 'newest'>('user');
  const [orders, setOrders] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userMemo, setUserMemo] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [colorOptions, setColorOptions] = useState<any[]>([]);
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newColorName, setNewColorName] = useState("");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [form, setForm] = useState<any>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hotspotEditorTarget, setHotspotEditorTarget] = useState<{ imageSrc: string; title: string; hotspots: HotspotPin[]; onSave: (updated: HotspotPin[]) => void; initialAspectMode?: 'story' | 'hero' | 'natural' } | null>(null);
  
  // Color Assets Dashboard: Drag & drop reorder and usage list expansion states
  const [draggedColorIndex, setDraggedColorIndex] = useState<number | null>(null);
  const [dragOverColorIndex, setDragOverColorIndex] = useState<number | null>(null);
  const [expandedColorUsageId, setExpandedColorUsageId] = useState<string | null>(null);

  // Live Preview Grid: Image Drag & Drop, Hamburger Menu & Swatch Reorder States
  const [draggedPreviewImgIndex, setDraggedPreviewImgIndex] = useState<number | null>(null);
  const [dragOverPreviewImgIndex, setDragOverPreviewImgIndex] = useState<number | null>(null);
  const [activeMenuImgIndex, setActiveMenuImgIndex] = useState<number | null>(null);
  const [showUrlImgIndex, setShowUrlImgIndex] = useState<number | null>(null);
  const [uploadingCellIndex, setUploadingCellIndex] = useState<number | null>(null);
  const [draggedProductSwatchIndex, setDraggedProductSwatchIndex] = useState<number | null>(null);
  const [dragOverProductSwatchIndex, setDragOverProductSwatchIndex] = useState<number | null>(null);
  const [previewAspects, setPreviewAspects] = useState<Record<string, 'portrait' | 'landscape'>>({});

  // Unsaved changes tracking states
  const [isDirty, setIsDirty] = useState(false);
  const [modalSaveStatus, setModalSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [originalForm, setOriginalForm] = useState<any>(null);
  const [originalHomeSettings, setOriginalHomeSettings] = useState<any>(null);
  const [pendingNavigation, setPendingNavigation] = useState<{
    type: 'tab' | 'edit' | 'router' | 'url';
    targetTab?: 'home'|'journal'|'space'|'collection'|'colorAssets'|'orders'|'users';
    targetItem?: any;
    targetUrl?: string;
  } | null>(null);

  // Outside click & ESC key handlers for Live Preview Hamburger Menu Popup
  useEffect(() => {
    if (activeMenuImgIndex === null) return;
    const handleClickOutside = () => {
      setActiveMenuImgIndex(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuImgIndex(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuImgIndex]);

  useEffect(() => {
    if (!form) return;
    const images = (form.images || []).filter(Boolean);
    images.forEach((img: string) => {
      const normKey = normalizeMediaUrl(img);
      if (!normKey || previewAspects[normKey]) return;
      const i = new window.Image();
      i.src = normKey;
      i.onload = () => {
        const aspect = i.naturalWidth / i.naturalHeight;
        setPreviewAspects(prev => ({
          ...prev,
          [normKey]: aspect < 1.0 ? 'portrait' : 'landscape',
          [img]: aspect < 1.0 ? 'portrait' : 'landscape'
        }));
      };
    });
  }, [form.images]);

  const [homeSettings, setHomeSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeSections, setActiveSections] = useState<Record<string, boolean>>({ basic: true, specs: false, options: false, media: false, story: false });

  // Unified isDirty tracking for homeSettings and item forms (collection, space, journal)
  useEffect(() => {
    if (activeTab === 'home') {
      if (!originalHomeSettings) {
        setIsDirty(false);
        return;
      }
      const currentStr = JSON.stringify(homeSettings);
      const originalStr = JSON.stringify(originalHomeSettings);
      const dirty = currentStr !== originalStr;
      setIsDirty(dirty);
      if (dirty && saveStatus === 'saved') {
        setSaveStatus('idle');
      }
    } else {
      if (!originalForm) {
        setIsDirty(false);
        return;
      }
      const currentStr = JSON.stringify(form);
      const originalStr = JSON.stringify(originalForm);
      const dirty = currentStr !== originalStr;
      setIsDirty(dirty);
      if (dirty && saveStatus === 'saved') {
        setSaveStatus('idle');
      }
    }
  }, [activeTab, form, originalForm, homeSettings, originalHomeSettings, saveStatus]);


  // Warn user on window refresh / tab close when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const proceedCancelEdit = () => {
    setEditingId(null);
    proceedTab(activeTab);
  };

  const handleCancelEdit = () => {
    if (isDirty) {
      setPendingNavigation({ type: 'tab', targetTab: activeTab });
    } else {
      proceedCancelEdit();
    }
  };

  const proceedNewItem = () => {
    setEditingId(null);
    proceedTab(activeTab);
  };

  const handleNewItem = () => {
    if (isDirty) {
      setPendingNavigation({ type: 'tab', targetTab: activeTab });
    } else {
      proceedNewItem();
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSection = (section: string) => {
    setActiveSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFeatured = async (productId: string) => {
    const isCurrentlyFeatured = homeSettings.featuredProductIds.includes(productId);
    const nextFeatured = isCurrentlyFeatured 
      ? homeSettings.featuredProductIds.filter(id => id !== productId)
      : [...homeSettings.featuredProductIds, productId];
    
    const updatedSettings = { ...homeSettings, featuredProductIds: nextFeatured };
    setHomeSettings(updatedSettings);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      showToast(isCurrentlyFeatured ? 'Removed from Featured Works' : 'Added to Featured Works', 'info');
    } catch (err) {
      console.error('Failed to toggle featured status', err);
      showToast('Failed to update featured status', 'error');
    }
  };

  const loadData = () => {
    getProducts().then(setProducts);
    getHomeSettings().then(data => {
      setHomeSettings(data);
      setOriginalHomeSettings(JSON.parse(JSON.stringify(data)));
    });
    getJournals().then(setJournals);
    getSpaces().then(setSpaces);
  };

  const loadOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        const localOrdersStr = localStorage.getItem("local_orders") || "[]";
        let localOrders = [];
        try { localOrders = JSON.parse(localOrdersStr); } catch(e) {}
        
        const mergedMap = new Map();
        if (Array.isArray(data)) {
          data.forEach((o: any) => mergedMap.set(o.id, o));
        }
        localOrders.forEach((o: any) => {
          if (!mergedMap.has(o.id)) mergedMap.set(o.id, o);
        });
        
        const sorted = Array.from(mergedMap.values()).sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sorted);
      })
      .catch(err => {
        console.error("Failed to load orders:", err);
        const localOrdersStr = localStorage.getItem("local_orders") || "[]";
        let localOrders = [];
        try { localOrders = JSON.parse(localOrdersStr); } catch(e) {}
        setOrders(localOrders);
      });
  };

  const loadUsers = () => {
    fetch('/api/auth?action=users')
      .then(res => res.json())
      .then(data => {
        const mockAccountsStr = localStorage.getItem("mock_customer_accounts") || "[]";
        let mockAccounts = [];
        try { mockAccounts = JSON.parse(mockAccountsStr); } catch(e) {}
        
        const mergedMap = new Map();
        if (Array.isArray(data)) {
          data.forEach((u: any) => mergedMap.set(u.email, u));
        }
        mockAccounts.forEach((u: any) => {
          if (!mergedMap.has(u.email)) {
            mergedMap.set(u.email, {
              id: 'mock_' + u.email,
              email: u.email,
              name: u.name || '',
              phone: u.phone || '',
              address: u.address || '',
              memo: u.memo || '',
              createdAt: u.createdAt || new Date().toISOString()
            });
          }
        });
        setUsersList(Array.from(mergedMap.values()));
      })
      .catch(err => {
        console.error("Failed to load users:", err);
        const mockAccountsStr = localStorage.getItem("mock_customer_accounts") || "[]";
        let mockAccounts = [];
        try { mockAccounts = JSON.parse(mockAccountsStr); } catch(e) {}
        const mapped = mockAccounts.map((u: any) => ({
          id: 'mock_' + u.email,
          email: u.email,
          name: u.name || '',
          phone: u.phone || '',
          address: u.address || '',
          memo: u.memo || '',
          createdAt: u.createdAt || new Date().toISOString()
        }));
        setUsersList(mapped);
      });
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });
      if (res.ok) {
        showToast("Order status updated.");
        loadOrders();
      }
    } catch (err) {
      console.error("Error updating status:", err);
      const localOrdersStr = localStorage.getItem("local_orders") || "[]";
      let localOrders = [];
      try { localOrders = JSON.parse(localOrdersStr); } catch (e) {}
      const order = localOrders.find((o: any) => o.id === orderId);
      if (order) {
        order.status = status;
        localStorage.setItem("local_orders", JSON.stringify(localOrders));
      }
      setOrders((prev: any) => prev.map((ord: any) => ord.id === orderId ? { ...ord, status } : ord));
      showToast("Order status updated (Local Simulation).");
    }
  };

  const handleSaveMemo = async () => {
    if (!selectedUser) return;
    setIsSavingMemo(true);
    try {
      const res = await fetch('/api/auth?action=update-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          memo: userMemo
        })
      });
      if (res.ok) {
        showToast("Customer memo updated.");
        setSelectedUser((prev: any) => ({ ...prev, memo: userMemo }));
        loadUsers();
      }
    } catch (err) {
      console.error("Failed to save memo:", err);
      const mockAccountsStr = localStorage.getItem("mock_customer_accounts") || "[]";
      let mockAccounts = [];
      try { mockAccounts = JSON.parse(mockAccountsStr); } catch(e) {}
      const idx = mockAccounts.findIndex((u: any) => u.email === selectedUser.email);
      if (idx > -1) {
        mockAccounts[idx].memo = userMemo;
        localStorage.setItem("mock_customer_accounts", JSON.stringify(mockAccounts));
      }
      setSelectedUser((prev: any) => ({ ...prev, memo: userMemo }));
      setUsersList((prev: any) => prev.map((u: any) => u.email === selectedUser.email ? { ...u, memo: userMemo } : u));
      showToast("Customer memo updated (Local Simulation).");
    } finally {
      setIsSavingMemo(false);
    }
  };

  const [activeColorTarget, setActiveColorTarget] = useState<'body' | 'fabric'>('body');
  const [newCustomColorName, setNewCustomColorName] = useState("");
  const [newCustomColorHex, setNewCustomColorHex] = useState("#0047AB");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showMagCards, setShowMagCards] = useState(true);
  const [activeShowcaseEditTab, setActiveShowcaseEditTab] = useState(0);

  const normalizeProductColors = (prod: any) => {
    if (!prod) return prod;

    const bodyList: ColorOption[] = [];
    const fabricList: ColorOption[] = [];

    const parseItem = (item: any, defaultGroup: 'body' | 'fabric'): ColorOption | null => {
      if (!item) return null;
      if (typeof item === 'string') {
        const hex = resolveColorHex(item);
        return { name: item, hex, group: defaultGroup };
      }
      if (typeof item === 'object' && item.name) {
        const hex = resolveColorHex(item.name, item.hex);
        const group = item.group === 'fabric' || item.group === 'upholstery' ? 'fabric' : (item.group || defaultGroup);
        return { name: item.name, hex, group };
      }
      return null;
    };

    if (prod.bodyColors && Array.isArray(prod.bodyColors)) {
      prod.bodyColors.forEach((b: any) => {
        const parsed = parseItem(b, 'body');
        if (parsed && !bodyList.some(x => x.name.toLowerCase() === parsed.name.toLowerCase())) {
          bodyList.push(parsed);
        }
      });
    }

    const rawFabric = prod.fabricColors || prod.upholsteryColors;
    if (rawFabric && Array.isArray(rawFabric)) {
      rawFabric.forEach((f: any) => {
        const parsed = parseItem(f, 'fabric');
        if (parsed && !fabricList.some(x => x.name.toLowerCase() === parsed.name.toLowerCase())) {
          fabricList.push(parsed);
        }
      });
    }

    // Only fallback to legacy prod.color if neither bodyColors nor fabricColors were defined on prod
    if (prod.bodyColors === undefined && prod.fabricColors === undefined && prod.color && Array.isArray(prod.color)) {
      prod.color.forEach((c: any) => {
        const parsed = parseItem(c, 'body');
        if (parsed) {
          if (parsed.group === 'body' && !bodyList.some(b => b.name.toLowerCase() === parsed.name.toLowerCase())) {
            bodyList.push(parsed);
          } else if (parsed.group === 'fabric' && !fabricList.some(f => f.name.toLowerCase() === parsed.name.toLowerCase())) {
            fabricList.push(parsed);
          }
        }
      });
    }

    return {
      ...prod,
      bodyColors: bodyList,
      fabricColors: fabricList,
      upholsteryColors: fabricList,
      color: [...bodyList, ...fabricList]
    };
  };

  useEffect(() => {
    if (activeTab === 'collection' && form) {
      const bodyList: ColorOption[] = [];
      const fabricList: ColorOption[] = [];

      if (form.bodyColors && Array.isArray(form.bodyColors)) {
        form.bodyColors.forEach((b: any) => {
          const name = typeof b === 'string' ? b : b?.name;
          const hex = resolveColorHex(name || '', typeof b === 'object' ? b?.hex : undefined);
          if (name && !bodyList.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            bodyList.push({ name, hex, group: 'body' });
          }
        });
      }

      const rawFabric = form.fabricColors || form.upholsteryColors;
      if (rawFabric && Array.isArray(rawFabric)) {
        rawFabric.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          const hex = resolveColorHex(name || '', typeof f === 'object' ? f?.hex : undefined);
          if (name && !fabricList.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            fabricList.push({ name, hex, group: 'fabric' });
          }
        });
      }

      // Legacy fallback parsing into colorOptions list ONLY if bodyColors and fabricColors were undefined
      if (form.bodyColors === undefined && form.fabricColors === undefined && form.color && Array.isArray(form.color)) {
        form.color.forEach((c: any) => {
          if (c && c.name) {
            const hex = resolveColorHex(c.name, c.hex);
            if (c.group === 'body' && !bodyList.some(b => b.name.toLowerCase() === c.name.toLowerCase())) {
              bodyList.push({ ...c, hex, group: 'body' });
            } else if ((c.group === 'fabric' || c.group === 'upholstery') && !fabricList.some(f => f.name.toLowerCase() === c.name.toLowerCase())) {
              fabricList.push({ ...c, hex, group: 'fabric' });
            }
          }
        });
      }

      setColorOptions([...bodyList, ...fabricList]);
    } else {
      setColorOptions([]);
    }
  }, [form?.id, form?.bodyColors, form?.fabricColors, form?.upholsteryColors, activeTab]);

  // Toggle Swatch for currently Active Target Slot (Body vs Fabric)
  const handleToggleColorForTarget = (asset: { name: string; hex: string }) => {
    const currentBodyList: ColorOption[] = Array.isArray(form?.bodyColors) ? [...form.bodyColors] : [];
    const currentFabricList: ColorOption[] = Array.isArray(form?.fabricColors) ? [...form.fabricColors] : [];

    const isBody = activeColorTarget === 'body';
    const targetList = isBody ? currentBodyList : currentFabricList;
    const existsIndex = targetList.findIndex((c: any) => (typeof c === 'string' ? c : c.name).toLowerCase() === asset.name.toLowerCase());

    let updatedTargetList: ColorOption[];
    if (existsIndex > -1) {
      updatedTargetList = targetList.filter((_, idx) => idx !== existsIndex);
    } else {
      const resolvedHex = resolveColorHex(asset.name, asset.hex);
      updatedTargetList = [...targetList, { name: asset.name, hex: resolvedHex, group: activeColorTarget }];
    }

    const nextBodyColors = isBody ? updatedTargetList : currentBodyList;
    const nextFabricColors = !isBody ? updatedTargetList : currentFabricList;

    setForm((prev: any) => ({
      ...prev,
      bodyColors: nextBodyColors,
      fabricColors: nextFabricColors,
      color: [...nextBodyColors, ...nextFabricColors]
    }));

    setColorOptions([...nextBodyColors, ...nextFabricColors]);
  };

  // Add a new global swatch asset and attach to current active target slot
  const handleAddGlobalSwatch = () => {
    if (!newCustomColorName.trim()) {
      showToast("Please enter a color name.", "error");
      return;
    }
    const colorNameTrimmed = newCustomColorName.trim();
    const newSwatchItem = { name: colorNameTrimmed, hex: newCustomColorHex };

    // Register to Global Assets Library
    const currentAssets = homeSettings.colorAssets || defaultColorAssets;
    const globalExists = currentAssets.some(c => c.name.toLowerCase() === colorNameTrimmed.toLowerCase());
    if (!globalExists) {
      const updatedAssets = [...currentAssets, newSwatchItem];
      const nextSettings = { ...homeSettings, colorAssets: updatedAssets };
      setHomeSettings(nextSettings);
      updateHomeSettings(nextSettings)
        .then(() => setOriginalHomeSettings(JSON.parse(JSON.stringify(nextSettings))))
        .catch(console.error);
    }

    // Attach to active target slot
    handleToggleColorForTarget(newSwatchItem);
    setNewCustomColorName("");
  };

  const handleReorderColorOption = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= colorOptions.length) return;
    const updated = [...colorOptions];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setColorOptions(updated);
    setForm((prev: any) => ({ ...prev, color: updated }));
  };

  const handleRemoveColorOption = (name: string) => {
    const updated = colorOptions.filter(c => c.name !== name);
    setColorOptions(updated);
    setForm((prev: any) => ({ ...prev, color: updated }));
  };

  const location = useLocation();

  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);
  }, []);

  // 60-second Auto-Save timer when form has unsaved changes
  const [autoSavedTime, setAutoSavedTime] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty || !editingId || activeTab === 'home' || activeTab === 'orders' || activeTab === 'users') {
      return;
    }

    const timer = setTimeout(() => {
      handleSave().then(success => {
        if (success) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setAutoSavedTime(timeStr);
          showToast(`✓ Auto-saved at ${timeStr}`, 'info');
        }
      }).catch(err => {
        console.error("Auto-save failed:", err);
      });
    }, 60000); // 60 seconds (1 min)

    return () => clearTimeout(timer);
  }, [form, isDirty, editingId, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        setToast(null);
      }
    };
    if (toast) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      if (activeTab === 'orders') loadOrders();
      if (activeTab === 'users') loadUsers();
    }
    setSelectedIds([]);
  }, [activeTab, isAuthenticated]);

  // Sync activeTab with ?tab= query parameter
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['home', 'collection', 'space', 'journal', 'orders', 'users'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [location.search, isAuthenticated]);

  // Sync editing item with ?edit= query parameter
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    const tabParam = params.get('tab') || 'collection';

    if (!editId) {
      setEditingId(null);
      const empty = tabParam === 'collection' ? emptyProduct : tabParam === 'journal' ? emptyJournal : tabParam === 'space' ? emptySpace : emptyProduct;
      const freshEmpty = JSON.parse(JSON.stringify(empty));
      setForm(freshEmpty);
      setOriginalForm(freshEmpty);
      setIsDirty(false);
      return;
    }

    const targetTab = tabParam || 'collection';

    if (targetTab === 'collection' && products.length > 0) {
      const found = products.find(p => p.id === editId);
      if (found) {
        const cloned = JSON.parse(JSON.stringify(found));
        const autoSpaces = spaces.filter(s => s.appliedProductIds?.includes(found.id)).map(s => s.id);
        const autoJournals = journals.filter(j => j.appliedProductIds?.includes(found.id)).map(j => j.id);
        cloned.relatedSpaceIds = Array.from(new Set([...(cloned.relatedSpaceIds || []), ...autoSpaces]));
        cloned.relatedJournalIds = Array.from(new Set([...(cloned.relatedJournalIds || []), ...autoJournals]));
        const normalizedCloned = normalizeProductColors(cloned);
        setEditingId(found.id);
        setForm(normalizedCloned);
        setOriginalForm(JSON.parse(JSON.stringify(normalizedCloned)));
        setActiveSections({ basic: true, specs: true, options: true, media: true, story: true });
      }
    } else if (targetTab === 'space' && spaces.length > 0) {
      const found = spaces.find(s => s.id === editId);
      if (found) {
        const cloned = JSON.parse(JSON.stringify(found));
        setEditingId(found.id);
        setForm(cloned);
        setOriginalForm(JSON.parse(JSON.stringify(cloned)));
        setActiveSections({ basic: true, specs: true, options: true, media: true, story: true });
      }
    } else if (targetTab === 'journal' && journals.length > 0) {
      const found = journals.find(j => j.id === editId);
      if (found) {
        const cloned = JSON.parse(JSON.stringify(found));
        setEditingId(found.id);
        setForm(cloned);
        setOriginalForm(JSON.parse(JSON.stringify(cloned)));
        setActiveSections({ basic: true, specs: true, options: true, media: true, story: true });
      }
    }
  }, [isAuthenticated, products, spaces, journals, location.search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth?action=admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('admin_auth', 'true');
        window.dispatchEvent(new Event('admin_auth_change'));
        showToast('Welcome back, admin', 'success');
      } else {
        showToast(data.error || 'Incorrect password', 'error');
      }
    } catch (err) {
      // Fallback for offline/local development testing
      if (password === 'amph123') {
        setIsAuthenticated(true);
        localStorage.setItem('admin_auth', 'true');
        window.dispatchEvent(new Event('admin_auth_change'));
        showToast('Welcome back, admin (Fallback)', 'success');
      } else {
        showToast('Incorrect password', 'error');
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_auth');
    window.dispatchEvent(new Event('admin_auth_change'));
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow bg-off-white font-sans p-6">
        <div className="w-full max-w-md bg-white p-12 rounded-none shadow-xl border border-black/5">
          <h1 className="text-3xl font-bold mb-8 tracking-tighter uppercase">Admin Access</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase text-ink/50 mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full border-b-2 border-black/10 focus:border-cobalt outline-none py-3 text-xl transition-colors bg-transparent"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <button type="submit" className="w-full bg-ink text-white py-4 rounded-none font-bold uppercase tracking-widest text-xs hover:bg-cobalt transition-colors">
              Enter Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleReorder = async (type: 'collection' | 'space' | 'journal', id: string, direction: 'up' | 'down') => {
    let orderKey: 'globalProductOrder' | 'spaceOrder' | 'journalOrder';
    let items: any[];
    
    if (type === 'collection') {
      orderKey = 'globalProductOrder';
      items = products;
    } else if (type === 'space') {
      orderKey = 'spaceOrder';
      items = spaces;
    } else {
      orderKey = 'journalOrder';
      items = journals;
    }

    const currentOrder = [...(homeSettings[orderKey] || [])];
    
    // If order is empty or missing this ID, initialize it with current items IDs
    if (currentOrder.length === 0 || !currentOrder.includes(id)) {
      items.forEach(item => {
        if (!currentOrder.includes(item.id)) currentOrder.push(item.id);
      });
    }

    const idx = currentOrder.indexOf(id);
    if (idx === -1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];

    const updatedSettings = { ...homeSettings, [orderKey]: newOrder };
    setHomeSettings(updatedSettings);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
    } catch (err) {
      console.error('Failed to save order', err);
    }
  };

  const proceedTab = (tab: 'home'|'journal'|'space'|'collection'|'colorAssets'|'orders'|'users') => {
    setActiveTab(tab);
    setEditingId(null);
    const empty = tab === 'collection' ? emptyProduct : tab === 'journal' ? emptyJournal : tab === 'space' ? emptySpace : emptyProduct;
    const freshEmpty = JSON.parse(JSON.stringify(empty));
    setForm(freshEmpty);
    setOriginalForm(freshEmpty);
    setIsDirty(false);
    setSaveStatus('idle');
    setActiveSections({ basic: true, specs: false, options: false, media: false, story: false });
    
    // Clear ?edit= from URL when switching tabs to prevent auto-reloading previous item
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.delete('edit');
    navigate(`/admin?${params.toString()}`, { replace: true });
  };

  const switchTab = (tab: 'home'|'journal'|'space'|'collection'|'colorAssets'|'orders'|'users') => {
    if (isDirty) {
      setPendingNavigation({ type: 'tab', targetTab: tab });
    } else {
      proceedTab(tab);
    }
  };

  const handleSave = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    if (saveStatus === 'saving') return false;
    setSaveStatus('saving');
    try {
      let savedData: any = null;
      if (activeTab === 'collection') {
        const cleanedImages = (form.images || []).filter(Boolean);
        const cleanedBlocks = (form.contentBlocks || [])
          .filter((b: any) => b && typeof b.value === 'string' && b.value.trim().length > 0)
          .map((b: any, idx: number) => ({ ...b, id: b.id || `block-${idx}` }));
        const currentBody = Array.isArray(form.bodyColors) ? form.bodyColors : [];
        const currentFabric = Array.isArray(form.fabricColors) ? form.fabricColors : [];
        const cleanedForm = { 
          ...form, 
          images: cleanedImages, 
          contentBlocks: cleanedBlocks,
          bodyColors: currentBody, 
          fabricColors: currentFabric,
          color: [...currentBody, ...currentFabric]
        };
        if (editingId) {
          await updateProduct(editingId, cleanedForm);
          savedData = cleanedForm;
        } else {
          const newId = `prod-${Date.now()}`;
          const newProduct = { ...cleanedForm, id: newId };
          await addProduct(newProduct);
          setEditingId(newId);
          savedData = newProduct;

          // Force prepending new product ID to globalProductOrder top (1st item slot)
          const currentOrder = homeSettings.globalProductOrder || [];
          const nextOrder = [newId, ...currentOrder.filter(id => id !== newId)];
          const updatedSettings = { ...homeSettings, globalProductOrder: nextOrder };
          setHomeSettings(updatedSettings);
          await updateHomeSettings(updatedSettings);
        }

        // Bi-directional cross-save with Promise.all (초고속 병렬 비동기 처리)
        const prodId = savedData.id;
        const currentSpaceIds: string[] = cleanedForm.relatedSpaceIds || [];
        const currentJournalIds: string[] = cleanedForm.relatedJournalIds || [];
        const currentRelatedProdIds: string[] = cleanedForm.relatedProductIds || [];
        const syncPromises: Promise<any>[] = [];

        // Spaces sync
        for (const s of spaces) {
          const hasProd = s.appliedProductIds?.includes(prodId);
          const shouldHaveProd = currentSpaceIds.includes(s.id);
          if (shouldHaveProd && !hasProd) {
            syncPromises.push(updateSpace(s.id, { ...s, appliedProductIds: [...(s.appliedProductIds || []), prodId] }));
          } else if (!shouldHaveProd && hasProd) {
            syncPromises.push(updateSpace(s.id, { ...s, appliedProductIds: (s.appliedProductIds || []).filter(id => id !== prodId) }));
          }
        }

        // Journals sync
        for (const j of journals) {
          const hasProd = j.appliedProductIds?.includes(prodId);
          const shouldHaveProd = currentJournalIds.includes(j.id);
          if (shouldHaveProd && !hasProd) {
            syncPromises.push(updateJournal(j.id, { ...j, appliedProductIds: [...(j.appliedProductIds || []), prodId] }));
          } else if (!shouldHaveProd && hasProd) {
            syncPromises.push(updateJournal(j.id, { ...j, appliedProductIds: (j.appliedProductIds || []).filter(id => id !== prodId) }));
          }
        }

        // Products cross sync
        for (const targetProd of products) {
          if (targetProd.id === prodId) continue;
          const targetHasProd = targetProd.relatedProductIds?.includes(prodId);
          const shouldHaveProd = currentRelatedProdIds.includes(targetProd.id);
          if (shouldHaveProd && !targetHasProd) {
            syncPromises.push(updateProduct(targetProd.id, { 
              ...targetProd, 
              relatedProductIds: [...(targetProd.relatedProductIds || []), prodId] 
            }));
          } else if (!shouldHaveProd && targetHasProd) {
            syncPromises.push(updateProduct(targetProd.id, { 
              ...targetProd, 
              relatedProductIds: (targetProd.relatedProductIds || []).filter(id => id !== prodId) 
            }));
          }
        }

        if (syncPromises.length > 0) {
          await Promise.all(syncPromises);
        }
      } else if (activeTab === 'journal') {
        const cleanedBlocks = (form.contentBlocks || [])
          .filter((b: any) => b && typeof b.value === 'string' && b.value.trim().length > 0)
          .map((b: any, idx: number) => ({ ...b, id: b.id || `block-${idx}` }));
        const cleanedForm = { ...form, contentBlocks: cleanedBlocks };

        if (editingId) {
          await updateJournal(editingId, cleanedForm);
          savedData = cleanedForm;
        } else {
          const newId = `j-${Date.now()}`;
          const newJournal = { ...cleanedForm, id: newId };
          await addJournal(newJournal);
          setEditingId(newId);
          savedData = newJournal;
        }

        // Bi-directional cross-save to Products with Promise.all (병렬 최적화)
        const journalId = savedData.id;
        const currentAppliedProds: string[] = cleanedForm.appliedProductIds || [];
        const journalSyncPromises: Promise<any>[] = [];
        for (const p of products) {
          const hasJournal = p.relatedJournalIds?.includes(journalId);
          const shouldHaveJournal = currentAppliedProds.includes(p.id);
          if (shouldHaveJournal && !hasJournal) {
            journalSyncPromises.push(updateProduct(p.id, { ...p, relatedJournalIds: [...(p.relatedJournalIds || []), journalId] }));
          } else if (!shouldHaveJournal && hasJournal) {
            journalSyncPromises.push(updateProduct(p.id, { ...p, relatedJournalIds: (p.relatedJournalIds || []).filter(id => id !== journalId) }));
          }
        }
        if (journalSyncPromises.length > 0) await Promise.all(journalSyncPromises);
      } else if (activeTab === 'space') {
        let cleanedImages = (form.images || []).filter(Boolean);
        if (form.image) {
          cleanedImages = [form.image, ...cleanedImages.filter((x: string) => x !== form.image)];
        }
        const heroImg = form.image || cleanedImages[0] || '';
        const cleanedBlocks = (form.contentBlocks || [])
          .filter((b: any) => b && typeof b.value === 'string' && b.value.trim().length > 0)
          .map((b: any, idx: number) => ({ ...b, id: b.id || `block-${idx}` }));
        const cleanedForm = { ...form, image: heroImg, images: cleanedImages, contentBlocks: cleanedBlocks };
        if (editingId) {
          await updateSpace(editingId, cleanedForm);
          savedData = cleanedForm;
        } else {
          const newId = `s-${Date.now()}`;
          const newSpace = { ...cleanedForm, id: newId };
          await addSpace(newSpace);
          setEditingId(newId);
          savedData = newSpace;
        }

        // Bi-directional cross-save to Products with Promise.all (병렬 최적화)
        const spaceId = savedData.id;
        const currentAppliedProds: string[] = cleanedForm.appliedProductIds || [];
        const spaceSyncPromises: Promise<any>[] = [];
        for (const p of products) {
          const hasSpace = p.relatedSpaceIds?.includes(spaceId);
          const shouldHaveSpace = currentAppliedProds.includes(p.id);
          if (shouldHaveSpace && !hasSpace) {
            spaceSyncPromises.push(updateProduct(p.id, { ...p, relatedSpaceIds: [...(p.relatedSpaceIds || []), spaceId] }));
          } else if (!shouldHaveSpace && hasSpace) {
            spaceSyncPromises.push(updateProduct(p.id, { ...p, relatedSpaceIds: (p.relatedSpaceIds || []).filter(id => id !== spaceId) }));
          }
        }
        if (spaceSyncPromises.length > 0) await Promise.all(spaceSyncPromises);
      } else if (activeTab === 'home') {
        await updateHomeSettings(homeSettings);
        setOriginalHomeSettings(JSON.parse(JSON.stringify(homeSettings)));
        window.dispatchEvent(new Event('settings_change'));
      }
      
      if (savedData) {
        setForm(savedData);
        setOriginalForm(JSON.parse(JSON.stringify(savedData)));
      }
      
      loadData();
      setIsDirty(false);
      setSaveStatus('saved');
      showToast('Saved successfully!', 'success');
      return true;
    } catch (error) {
      console.error(error);
      setSaveStatus('idle');
      showToast('Failed to save. Please try again.', 'error');
      return false;
    }
  };

  const proceedEdit = (item: any) => {
    setEditingId(item.id);
    const cloned = JSON.parse(JSON.stringify(item));
    if (activeTab === 'collection') {
      const autoSpaces = spaces.filter(s => s.appliedProductIds?.includes(item.id)).map(s => s.id);
      const autoJournals = journals.filter(j => j.appliedProductIds?.includes(item.id)).map(j => j.id);
      cloned.relatedSpaceIds = Array.from(new Set([...(cloned.relatedSpaceIds || []), ...autoSpaces]));
      cloned.relatedJournalIds = Array.from(new Set([...(cloned.relatedJournalIds || []), ...autoJournals]));
    }
    const normalizedCloned = activeTab === 'collection' ? normalizeProductColors(cloned) : cloned;
    setForm(normalizedCloned);
    setOriginalForm(JSON.parse(JSON.stringify(normalizedCloned)));
    setIsDirty(false);
    setSaveStatus('idle');
    setActiveSections({ basic: true, specs: true, options: true, media: true, story: true });
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    params.set('edit', item.id);
    navigate(`/admin?${params.toString()}`, { replace: true });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const handleEdit = (item: any) => {
    if (isDirty) {
      setPendingNavigation({ type: 'edit', targetItem: item });
    } else {
      proceedEdit(item);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Delete item?')) return;
    if (activeTab === 'collection') await deleteProduct(id);
    if (activeTab === 'journal') await deleteJournal(id);
    if (activeTab === 'space') await deleteSpace(id);
    loadData();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    for (const id of selectedIds) {
      if (activeTab === 'collection') await deleteProduct(id);
      if (activeTab === 'journal') await deleteJournal(id);
      if (activeTab === 'space') await deleteSpace(id);
    }
    setSelectedIds([]);
    loadData();
  };

  const handleBulkDuplicate = async () => {
    for (const id of selectedIds) {
      let item;
      if (activeTab === 'collection') {
        item = products.find(p => p.id === id);
        if (item) await addProduct({ ...item, id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: `${item.name} (Copy)` });
      } else if (activeTab === 'journal') {
        item = journals.find(j => j.id === id);
        if (item) await addJournal({ ...item, id: `j-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, title: `${item.title} (Copy)` });
      } else if (activeTab === 'space') {
        item = spaces.find(s => s.id === id);
        if (item) await addSpace({ ...item, id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, title: `${item.title} (Copy)` });
      }
    }
    setSelectedIds([]);
    loadData();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderContentBlocksEditor = () => {
    const isProduct = activeTab === 'collection';
    const contentBlocksWithIds = (form.contentBlocks || []).map((cb: ContentBlock, idx: number) => ({
      ...cb,
      id: cb.id || `block-${idx}-${Math.random().toString(36).substring(2, 9)}`
    }));

    const moveBlock = (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= contentBlocksWithIds.length) return;
      const updated = [...contentBlocksWithIds];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setForm(prev => ({ ...prev, contentBlocks: updated }));
    };

    return (
      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {contentBlocksWithIds.map((cb: ContentBlock & { id: string }, i: number) => (
            <div key={cb.id} className="p-4 border border-black/10 bg-off-white/50 space-y-3 relative group rounded-none shadow-2xs">
              <div className="flex justify-between items-center border-b border-black/5 pb-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 shrink">
                  <span className="text-xs font-black uppercase text-ink/50 font-mono whitespace-nowrap shrink-0">#{i + 1}</span>
                  <select 
                    value={cb.type || 'image'} 
                    onChange={e => {
                      const blockId = cb.id;
                      const nextType = e.target.value as 'text'|'image';
                      setForm(prev => {
                        const newCb = [...(prev.contentBlocks || [])];
                        const targetIdx = newCb.findIndex(b => (b.id || `block-${newCb.indexOf(b)}`) === blockId || newCb.indexOf(b) === i);
                        if (targetIdx !== -1) {
                          newCb[targetIdx] = { ...newCb[targetIdx], type: nextType };
                        }
                        return { ...prev, contentBlocks: newCb };
                      });
                    }} 
                    className="border border-black/15 bg-white p-1 text-[9px] uppercase font-bold text-ink outline-none rounded-none shrink-0"
                  >
                    <option value="image">MEDIA</option>
                    <option value="text">TEXT</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-0.5 border-r border-black/10 pr-2">
                    <button 
                      type="button" 
                      disabled={i === 0} 
                      onClick={() => moveBlock(i, i - 1)} 
                      className="p-0.5 hover:bg-black/10 disabled:opacity-20 text-ink/60 hover:text-ink cursor-pointer rounded-none transition-colors" 
                      title="Move Up/Left"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      type="button" 
                      disabled={i === contentBlocksWithIds.length - 1} 
                      onClick={() => moveBlock(i, i + 1)} 
                      className="p-0.5 hover:bg-black/10 disabled:opacity-20 text-ink/60 hover:text-ink cursor-pointer rounded-none transition-colors" 
                      title="Move Down/Right"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const blockId = cb.id;
                      setForm(prev => ({
                        ...prev,
                        contentBlocks: (prev.contentBlocks || []).filter((b: any, idx: number) => (b.id || `block-${idx}`) !== blockId && idx !== i)
                      }));
                    }} 
                    className="text-orange text-[9px] font-bold uppercase tracking-wider hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {(cb.type === 'image' || !cb.type) ? (
                <div className="space-y-2">
                  <MediaUploadInput 
                    label="Editorial Media" 
                    value={cb.value} 
                    onChange={val => {
                      const blockId = cb.id;
                      const oldUrl = cb.value;
                      setForm(prev => {
                        const currentBlocks = [...(prev.contentBlocks || [])];
                        const targetIdx = currentBlocks.findIndex((b: any, idx: number) => (b.id || `block-${idx}`) === blockId || idx === i);
                        if (targetIdx !== -1) {
                          currentBlocks[targetIdx] = { ...currentBlocks[targetIdx], id: blockId, value: val };
                        } else {
                          currentBlocks.push({ id: blockId, type: 'image', value: val });
                        }
                        
                        const newForm: any = { ...prev, contentBlocks: currentBlocks };
                        if (!isProduct) {
                          const wasHero = prev.image === oldUrl || (oldUrl && prev.image && prev.image === oldUrl);
                          if (wasHero || !prev.image) {
                            const currentImages = (prev.images || []).map((x: string) => x === oldUrl ? val : x).filter(Boolean);
                            newForm.image = val;
                            newForm.images = [val, ...currentImages.filter((x: string) => x !== val)];
                          } else {
                            const mediaBlocks = currentBlocks.filter(b => (b.type === 'image' || !b.type) && b.value);
                            if (mediaBlocks.length > 0 && (!prev.image || !mediaBlocks.some(b => b.value === prev.image))) {
                              const firstMedia = mediaBlocks[0].value;
                              const currentImages = (prev.images || []).filter((x: string) => x !== firstMedia);
                              newForm.image = firstMedia;
                              newForm.images = [firstMedia, ...currentImages];
                            }
                          }
                        }
                        return newForm;
                      });
                    }} 
                  />
                  <div>
                    <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">CAPTION</label>
                    <textarea 
                      rows={1}
                      value={cb.caption || ''} 
                      onChange={e => {
                        const blockId = cb.id;
                        const nextCaption = e.target.value;
                        setForm(prev => {
                          const currentBlocks = [...(prev.contentBlocks || [])];
                          const targetIdx = currentBlocks.findIndex((b: any, idx: number) => (b.id || `block-${idx}`) === blockId || idx === i);
                          if (targetIdx !== -1) {
                            currentBlocks[targetIdx] = { ...currentBlocks[targetIdx], caption: nextCaption };
                          }
                          return { ...prev, contentBlocks: currentBlocks };
                        });
                      }} 
                      className="w-full border border-black/15 bg-white p-2 min-h-[34px] text-xs outline-none rounded-none font-sans resize-y leading-relaxed" 
                      placeholder="Caption text below image..." 
                    />
                  </div>
                  {!isProduct && cb.value && (
                    <div className="pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={form.image === cb.value}
                          onChange={e => {
                            const targetValue = cb.value;
                            setForm(prev => {
                              if (e.target.checked) {
                                const currentImages = (prev.images || []).filter((x: string) => x !== targetValue);
                                return { ...prev, image: targetValue, images: [targetValue, ...currentImages] };
                              } else {
                                return { ...prev, image: '' };
                              }
                            });
                          }}
                          className="w-3.5 h-3.5 text-cobalt border-black/20 focus:ring-cobalt rounded-none"
                        />
                        <span className="text-[9px] uppercase font-bold text-cobalt">
                          {form.image === cb.value ? "✓ Hero Cover" : "Set as Hero Cover"}
                        </span>
                      </label>

                      {/* Hotspots Pin Manager Trigger */}
                      <button
                        type="button"
                        onClick={() => setHotspotEditorTarget({
                          imageSrc: cb.value,
                          title: `Media #${i + 1} Interactive Hotspots`,
                          hotspots: cb.hotspots || (form.image === cb.value ? (form.hotspots || []) : []),
                          initialAspectMode: form.image === cb.value ? 'hero' : 'story',
                          onSave: (updated) => {
                            const blockId = cb.id;
                            setForm(prev => {
                              const currentBlocks = [...(prev.contentBlocks || [])];
                              const targetIdx = currentBlocks.findIndex((b: any, idx: number) => (b.id || `block-${idx}`) === blockId || idx === i);
                              if (targetIdx !== -1) {
                                currentBlocks[targetIdx] = { ...currentBlocks[targetIdx], hotspots: updated };
                              }
                              const nextForm: any = { ...prev, contentBlocks: currentBlocks };
                              if (prev.image === cb.value) {
                                nextForm.hotspots = updated;
                              }
                              return nextForm;
                            });
                          }
                        })}
                        className="px-2 py-1 bg-black/5 hover:bg-cobalt hover:text-white text-ink text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-black/10"
                      >
                        <MapPin size={10} />
                        <span>Hotspots ({(cb.hotspots || (form.image === cb.value ? form.hotspots : []))?.length || 0})</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">Text Content</label>
                  <textarea 
                    rows={6}
                    value={cb.value} 
                    onChange={e => {
                      const blockId = cb.id;
                      const nextText = e.target.value;
                      setForm(prev => {
                        const currentBlocks = [...(prev.contentBlocks || [])];
                        const targetIdx = currentBlocks.findIndex((b: any, idx: number) => (b.id || `block-${idx}`) === blockId || idx === i);
                        if (targetIdx !== -1) {
                          currentBlocks[targetIdx] = { ...currentBlocks[targetIdx], value: nextText };
                        }
                        return { ...prev, contentBlocks: currentBlocks };
                      });
                    }} 
                    className="w-full border border-black/15 bg-white p-3 h-[180px] text-xs outline-none rounded-none font-sans overflow-y-auto resize-none leading-relaxed" 
                    placeholder="Enter story text content..." 
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button 
            type="button" 
            onClick={() => {
              const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              setForm(prev => ({
                ...prev,
                contentBlocks: [...(prev.contentBlocks || []), { id: newBlockId, type: 'image', value: '', caption: '' }]
              }));
            }} 
            className="flex-1 py-2 bg-cobalt/5 hover:bg-cobalt text-cobalt hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors border border-cobalt/20 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={12} /> Media Block
          </button>
          <button 
            type="button" 
            onClick={() => {
              const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              setForm(prev => ({
                ...prev,
                contentBlocks: [...(prev.contentBlocks || []), { id: newBlockId, type: 'text', value: '', caption: '' }]
              }));
            }} 
            className="flex-1 py-2 bg-black/5 hover:bg-black text-ink hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors border border-black/10 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={12} /> Text Block
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-grow px-3 py-4 sm:px-6 md:px-12 md:py-12 max-w-[1400px] mx-auto w-full font-sans min-w-0 overflow-x-hidden">
      
      {/* Admin Status Banner */}
      <div className="border border-black/10 bg-white p-4 mb-8 flex justify-between items-center rounded-none gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 size={16} className="text-cobalt flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-ink/30">System Status</p>
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink truncate">Logged in as Administrator</h2>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 border border-orange/20 text-orange hover:bg-orange hover:text-white px-3 py-2 rounded-none transition-all text-[9px] font-bold uppercase tracking-widest cursor-pointer flex-shrink-0">
          <LogOut size={12} /> Logout
        </button>
      </div>

      {/* Top-Level Dashboard Category Navigation & Sub-Tabs */}
      <div className="flex flex-col gap-3 border-b border-black/10 pb-4 mb-8 min-w-0 max-w-full">
        <div className="flex gap-1.5 bg-black/5 p-1.5 rounded-none w-full min-w-0">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'orders' || activeTab === 'users') {
                switchTab('collection');
              }
            }}
            className={`flex-1 px-4 py-3.5 text-xs sm:text-sm md:text-base font-black uppercase tracking-wider transition-all rounded-none flex items-center justify-center cursor-pointer text-center ${
              activeTab !== 'orders' && activeTab !== 'users'
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink/60 hover:text-ink hover:bg-black/5'
            }`}
          >
            Site design
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab !== 'orders' && activeTab !== 'users') {
                switchTab('orders');
              }
            }}
            className={`flex-1 px-4 py-3.5 text-xs sm:text-sm md:text-base font-black uppercase tracking-wider transition-all rounded-none flex items-center justify-center cursor-pointer text-center ${
              activeTab === 'orders' || activeTab === 'users'
                ? 'bg-cobalt text-white shadow-sm'
                : 'text-ink/60 hover:text-ink hover:bg-black/5'
            }`}
          >
            Customer
          </button>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full pb-1 min-w-0 max-w-full">
          {(activeTab !== 'orders' && activeTab !== 'users') ? (
            [
              { id: 'home', label: 'Home' },
              { id: 'collection', label: 'Collection' },
              { id: 'space', label: 'Space' },
              { id: 'journal', label: 'Journal' },
              { id: 'colorAssets', label: 'Color Assets' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => switchTab(tab.id as any)} 
                className={`uppercase text-xs sm:text-sm font-bold tracking-wide transition-all shrink-0 cursor-pointer px-3 py-2 rounded-none ${
                  activeTab === tab.id 
                    ? 'text-cobalt border-b-2 border-cobalt font-black bg-cobalt/5' 
                    : 'text-ink/50 hover:text-ink hover:bg-black/5'
                }`}
              >
                {tab.label}
              </button>
            ))
          ) : (
            [
              { id: 'orders', label: 'ORDERS' },
              { id: 'users', label: 'USERS' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => switchTab(tab.id as any)} 
                className={`uppercase text-xs sm:text-sm font-bold tracking-wide transition-all shrink-0 cursor-pointer px-4 py-2 rounded-none ${
                  activeTab === tab.id 
                    ? 'text-cobalt border-b-2 border-cobalt font-black bg-cobalt/5' 
                    : 'text-ink/50 hover:text-ink hover:bg-black/5'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}
        </div>
      </div>
      
      {activeTab === 'colorAssets' ? (
        <div className="w-full min-w-0 max-w-full space-y-6 pb-20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-black/10 pb-4 gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-ink">
                Global Color Assets Library
              </h2>
              <p className="text-xs text-ink/50 mt-1 font-sans">
                Manage system-wide color swatches and assets reusable across all products.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setSavingSettings(true);
                try {
                  const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(homeSettings)
                  });
                  if (res.ok) {
                    setOriginalHomeSettings(homeSettings);
                    setIsDirty(false);
                    showToast("Color assets saved successfully!", "success");
                  } else {
                    showToast("Failed to save color assets.", "error");
                  }
                } catch (err) {
                  console.error(err);
                  showToast("Error saving color assets.", "error");
                } finally {
                  setSavingSettings(false);
                }
              }}
              disabled={savingSettings}
              className="bg-cobalt text-white text-xs font-black uppercase px-5 py-3 tracking-wider hover:bg-ink transition-all shadow-sm rounded-none cursor-pointer"
            >
              {savingSettings ? 'Saving...' : 'Save Color Assets'}
            </button>
          </div>

          {/* Add New Color Asset Form */}
          <div className="bg-white border border-black/10 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-cobalt flex items-center gap-2">
              <Plus size={14} /> Add New Color Asset
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase text-ink/40 tracking-wider mb-2">Color Name (e.g. Sage Green)</label>
                <input
                  type="text"
                  value={newColorName}
                  onChange={e => setNewColorName(e.target.value)}
                  placeholder="e.g., Sage Green"
                  className="w-full border border-black/10 p-3 text-xs outline-none focus:border-cobalt bg-white rounded-none text-ink font-sans"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-ink/40 tracking-wider mb-2">Color Hex Code</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={e => setNewColorHex(e.target.value)}
                    className="w-10 h-10 border border-black/10 cursor-pointer p-1 bg-white rounded-none shrink-0"
                  />
                  <input
                    type="text"
                    value={newColorHex}
                    onChange={e => setNewColorHex(e.target.value)}
                    placeholder="#000000"
                    className="w-full border border-black/10 p-3 text-xs outline-none focus:border-cobalt font-mono bg-white rounded-none uppercase text-ink"
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newColorName.trim()) {
                      alert('Please enter color name');
                      return;
                    }
                    const currentAssets = homeSettings.colorAssets || defaultColorAssets;
                    const exists = currentAssets.some(c => c.name.toLowerCase() === newColorName.trim().toLowerCase());
                    if (exists) {
                      alert('Color asset with this name already exists');
                      return;
                    }
                    const updatedAssets = [...currentAssets, { name: newColorName.trim(), hex: newColorHex }];
                    setHomeSettings({ ...homeSettings, colorAssets: updatedAssets });
                    setNewColorName('');
                    showToast(`Color asset '${newColorName.trim()}' added.`);
                  }}
                  className="w-full bg-ink text-white font-black text-xs uppercase py-3.5 px-4 hover:bg-cobalt transition-colors rounded-none cursor-pointer"
                >
                  + Register Asset
                </button>
              </div>
            </div>
          </div>

          {/* Color Assets Grid Manager with Drag & Drop & Usage List Expansion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {(homeSettings.colorAssets || defaultColorAssets).map((asset, idx) => {
              const matchedProducts = products.filter(p => {
                const bList = Array.isArray(p.bodyColors) ? p.bodyColors : [];
                const fList = Array.isArray(p.fabricColors) ? p.fabricColors : [];
                const inBody = bList.some(c => (typeof c === 'string' ? c : c.name).toLowerCase() === asset.name.toLowerCase());
                const inFabric = fList.some(c => (typeof c === 'string' ? c : c.name).toLowerCase() === asset.name.toLowerCase());
                
                let inLegacy = false;
                if (p.color) {
                  if (Array.isArray(p.color)) {
                    inLegacy = p.color.some(c => (typeof c === 'string' ? c : c.name).toLowerCase() === asset.name.toLowerCase());
                  } else {
                    inLegacy = p.color.toLowerCase().includes(asset.name.toLowerCase());
                  }
                }
                return inBody || inFabric || inLegacy;
              });

              const usageCount = matchedProducts.length;
              const isExpanded = expandedColorUsageId === asset.name;
              const isDragging = draggedColorIndex === idx;
              const isDragOver = dragOverColorIndex === idx && draggedColorIndex !== idx;

              return (
                <div 
                  key={`${asset.name}-${idx}`} 
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', idx.toString());
                    setDraggedColorIndex(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverColorIndex(idx);
                  }}
                  onDragLeave={() => {
                    if (dragOverColorIndex === idx) setDragOverColorIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedColorIndex !== null && draggedColorIndex !== idx) {
                      const current = [...(homeSettings.colorAssets || defaultColorAssets)];
                      const [moved] = current.splice(draggedColorIndex, 1);
                      current.splice(idx, 0, moved);
                      setHomeSettings({ ...homeSettings, colorAssets: current });
                    }
                    setDraggedColorIndex(null);
                    setDragOverColorIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedColorIndex(null);
                    setDragOverColorIndex(null);
                  }}
                  className={`bg-white border p-4 shadow-sm flex flex-col justify-between group transition-all rounded-none relative cursor-grab active:cursor-grabbing ${
                    isDragging ? 'opacity-30 border-dashed border-cobalt' :
                    isDragOver ? 'border-l-4 border-l-cobalt border-black/30 bg-cobalt/5 scale-[1.02]' :
                    'border-black/10 hover:border-cobalt/60'
                  }`}
                >
                  {/* Vertical Drag Handle Indicator Bar */}
                  <div className="absolute top-2 left-2 flex items-center gap-0.5 text-ink/20 group-hover:text-cobalt/60 cursor-grab" title="Drag to reorder">
                    <span className="text-[10px] font-mono font-bold tracking-tighter">⋮⋮</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-9 h-9 rounded-full border border-black/20 shadow-sm flex-shrink-0 ring-2 ring-black/5"
                          style={{ backgroundColor: asset.hex || '#000000' }}
                          title={asset.name}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete color asset '${asset.name}'?`)) {
                            const current = homeSettings.colorAssets || defaultColorAssets;
                            const updated = current.filter((_, i) => i !== idx);
                            setHomeSettings({ ...homeSettings, colorAssets: updated });
                            showToast(`Deleted '${asset.name}'`);
                          }
                        }}
                        className="text-ink/20 hover:text-orange transition-colors p-1 cursor-pointer"
                        title="Delete Asset"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Color Swatch Name — High Visibility (font-black text-sm uppercase text-ink) */}
                    <div className="mb-2">
                      <label className="block text-[8px] font-black uppercase text-ink/40 tracking-wider mb-0.5">Color Name</label>
                      <input
                        type="text"
                        value={asset.name}
                        onChange={e => {
                          const val = e.target.value;
                          const current = [...(homeSettings.colorAssets || defaultColorAssets)];
                          current[idx] = { ...current[idx], name: val };
                          setHomeSettings({ ...homeSettings, colorAssets: current });
                        }}
                        className="w-full font-black text-sm uppercase text-ink border-b border-black/15 focus:border-cobalt outline-none bg-transparent py-0.5 font-sans tracking-tight"
                        placeholder="Color Name"
                      />
                    </div>
                    
                    {/* Hex Code Input — High Visibility (font-mono font-bold text-xs text-ink/80) */}
                    <div>
                      <label className="block text-[8px] font-black uppercase text-ink/40 tracking-wider mb-0.5">Hex Code</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={asset.hex || '#000000'}
                          onChange={e => {
                            const val = e.target.value;
                            const current = [...(homeSettings.colorAssets || defaultColorAssets)];
                            current[idx] = { ...current[idx], hex: val };
                            setHomeSettings({ ...homeSettings, colorAssets: current });
                          }}
                          className="w-5 h-5 rounded-full border border-black/10 cursor-pointer bg-transparent p-0 flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={asset.hex || '#000000'}
                          onChange={e => {
                            const val = e.target.value;
                            const current = [...(homeSettings.colorAssets || defaultColorAssets)];
                            current[idx] = { ...current[idx], hex: val };
                            setHomeSettings({ ...homeSettings, colorAssets: current });
                          }}
                          className="font-mono font-bold text-xs text-ink/90 uppercase border-b border-black/15 focus:border-cobalt outline-none bg-transparent w-full tracking-wide"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Usage Pill Button with Expandable Applied Product List */}
                  <div className="mt-4 pt-3 border-t border-black/10">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold text-ink/40">USAGE</span>
                      <button
                        type="button"
                        onClick={() => setExpandedColorUsageId(isExpanded ? null : asset.name)}
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                          usageCount > 0 
                            ? 'bg-cobalt/10 text-cobalt border-cobalt/30 hover:bg-cobalt hover:text-white' 
                            : 'bg-black/5 text-ink/30 border-black/10 cursor-default'
                        }`}
                        title={usageCount > 0 ? "Click to toggle applied products list" : "No products using this color"}
                        disabled={usageCount === 0}
                      >
                        <span>{usageCount} {usageCount === 1 ? 'Product' : 'Products'}</span>
                        {usageCount > 0 && (
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        )}
                      </button>
                    </div>

                    {/* Expandable Applied Products Mini List */}
                    {isExpanded && matchedProducts.length > 0 && (
                      <div className="mt-3 space-y-1.5 pt-2 border-t border-black/5 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="block text-[8px] font-black uppercase text-ink/50 tracking-wider mb-1 font-mono">Applied Products ({matchedProducts.length})</span>
                        {matchedProducts.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              switchTab('collection');
                              handleEdit(p);
                            }}
                            className="p-1.5 bg-black/5 hover:bg-cobalt/10 border border-black/5 rounded-none flex items-center gap-2 cursor-pointer transition-colors group/item"
                            title="Click to edit product"
                          >
                            {(() => {
                              const mainImg = normalizeMediaUrl(p.images?.[0] || '');
                              return <img src={mainImg} className="w-6 h-6 rounded-none object-cover mix-blend-multiply flex-shrink-0 border border-black/10" />;
                            })()}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <span className="block text-[9px] font-bold text-ink group-hover/item:text-cobalt truncate">{p.name}</span>
                              <span className="block text-[8px] text-ink/40 uppercase">{p.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (activeTab === 'orders' || activeTab === 'users') ? (
        <div className="w-full min-w-0 max-w-full space-y-6 pb-20">
          {activeTab === 'orders' && (
            <div className="space-y-6 w-full min-w-0 max-w-full">
              <div className="flex justify-between items-center border-b border-black/10 pb-4 gap-3 w-full min-w-0">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-ink min-w-0 truncate">
                  Customer Orders
                </h2>
                <button onClick={loadOrders} className="text-xs bg-cobalt text-white px-3 py-2 font-bold uppercase hover:bg-ink transition-colors cursor-pointer rounded-none shrink-0">Refresh</button>
              </div>

              {/* Sub-tabs for filtering orders: flex-col on mobile, flex-row on desktop */}
              <div className="flex flex-col sm:flex-row gap-1.5 border-b border-black/10 pb-3 w-full min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => setOrderFilter('active')}
                  className={`w-full sm:flex-1 min-w-0 px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all rounded-none cursor-pointer text-center truncate ${
                    orderFilter === 'active' ? 'bg-cobalt text-white shadow-sm' : 'bg-black/5 text-ink/60 hover:bg-black/10'
                  }`}
                >
                  In Progress ({orders.filter(o => o.status !== 'Completed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('completed')}
                  className={`w-full sm:flex-1 min-w-0 px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all rounded-none cursor-pointer text-center truncate ${
                    orderFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-black/5 text-ink/60 hover:bg-black/10'
                  }`}
                >
                  Completed ({orders.filter(o => o.status === 'Completed').length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('all')}
                  className={`w-full sm:flex-1 min-w-0 px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all rounded-none cursor-pointer text-center truncate ${
                    orderFilter === 'all' ? 'bg-ink text-white shadow-sm' : 'bg-black/5 text-ink/60 hover:bg-black/10'
                  }`}
                >
                  All Orders ({orders.length})
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-sm uppercase tracking-wider text-ink/40 bg-white border border-black/5 p-8 sm:p-12 text-center">No orders placed yet.</p>
              ) : (() => {
                const filteredOrders = orders.filter((o: any) => {
                  if (orderFilter === 'active') return o.status !== 'Completed';
                  if (orderFilter === 'completed') return o.status === 'Completed';
                  return true;
                });

                if (filteredOrders.length === 0) {
                  return (
                    <p className="text-sm uppercase tracking-wider text-ink/40 bg-white border border-black/5 p-8 sm:p-12 text-center">
                      No {orderFilter === 'completed' ? 'completed' : 'in-progress'} orders found.
                    </p>
                  );
                }

                return (
                  <div className="space-y-4 w-full min-w-0 max-w-full">
                    {filteredOrders.map((o: any) => (
                      <div key={o.id} className="bg-white border border-black/10 p-3 sm:p-5 flex flex-col gap-4 shadow-sm w-full min-w-0 max-w-full overflow-hidden rounded-none">
                        {/* Order header */}
                        <div className="flex flex-col gap-3 border-b border-black/10 pb-3 text-xs uppercase font-sans tracking-wider text-ink/70 min-w-0 max-w-full">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                            <div className="min-w-0 sm:col-span-2">
                              <span className="block text-[10px] text-ink/40 font-bold uppercase mb-0.5">Order ID</span>
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="font-mono text-ink font-bold text-[10px] sm:text-xs break-all">{o.id}</span>
                                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border rounded-full shrink-0 ${getStatusBadgeStyle(o.status)}`}>
                                  ● {o.status === 'Pending' ? '대기' : o.status === 'Confirmed' ? '주문확인' : o.status === 'Processing' ? '발주' : o.status === 'Shipping' ? '배송' : o.status === 'Completed' ? '완료' : o.status}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[10px] text-ink/40 font-bold uppercase mb-0.5">Email</span>
                              <span className="text-cobalt font-bold text-[10px] sm:text-xs break-all block">{o.customerEmail}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[10px] text-ink/40 font-bold uppercase mb-0.5">Date</span>
                              <span className="text-ink font-semibold text-[10px] sm:text-xs block">{new Date(o.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[10px] text-ink/40 font-bold uppercase mb-0.5">Total</span>
                              <span className="text-ink font-black text-sm sm:text-base block">${Number(o.totalPrice).toLocaleString()}</span>
                            </div>
                            <div className="min-w-0 sm:col-span-2">
                              <span className="block text-[10px] text-ink/40 font-bold uppercase mb-0.5">Update Status</span>
                              <select
                                value={o.status}
                                onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                                className="w-full px-2 py-2 text-xs font-bold border border-black/20 bg-white hover:border-black/40 transition-colors uppercase outline-none rounded-none text-ink cursor-pointer"
                              >
                                <option value="Pending">대기</option>
                                <option value="Confirmed">주문확인</option>
                                <option value="Processing">발주</option>
                                <option value="Shipping">배송중</option>
                                <option value="Completed">완료</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Recipient details */}
                        {o.name && (
                          <div className="border-b border-black/10 pb-3 text-xs uppercase tracking-wider font-bold text-ink/80 flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-2 bg-off-white/80 p-3 sm:p-3.5 border border-black/5 min-w-0 max-w-full overflow-hidden">
                            <span className="break-all">Recipient: {o.name}</span>
                            <span className="break-all">Phone: {o.phone}</span>
                            <span className="break-all">Address: {o.address}</span>
                          </div>
                        )}

                        {/* Order items */}
                        <div className="space-y-3 min-w-0 max-w-full">
                          {o.items && Array.isArray(o.items) && o.items.map((item: any, idx: number) => {
                            const foundProd = products.find((p: any) => p.id === item.productId || p.id === item.id || p.name?.toLowerCase() === item.name?.toLowerCase());
                            const liveName = foundProd?.name || item.name;
                            const currentImage = foundProd?.images?.[0] || foundProd?.image || item.image || '';
                            const shippingVal = getFormattedShipping(item.shipping || foundProd?.shipping);
                            return (
                              <Link 
                                key={idx} 
                                to={`/product/${item.productId || foundProd?.id}`} 
                                target="_blank" 
                                className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center border-b border-black/[0.05] pb-3 last:border-0 last:pb-0 hover:bg-black/[0.02] p-2 transition-colors group cursor-pointer rounded-none min-w-0 max-w-full"
                              >
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                  <div className="w-14 h-14 bg-silver/10 border border-black/10 shrink-0 overflow-hidden relative">
                                    {currentImage ? (
                                      <MediaRenderer 
                                        src={currentImage} 
                                        alt={liveName} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-silver/20 flex items-center justify-center text-[9px] text-ink/30 uppercase">No Img</div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-grow sm:hidden">
                                    <h4 className="text-xs font-bold text-ink uppercase tracking-tight truncate group-hover:text-cobalt transition-colors flex items-center gap-1">
                                      {liveName} <ExternalLink size={10} className="opacity-70 text-cobalt shrink-0" />
                                    </h4>
                                    <p className="text-[10px] uppercase tracking-wider text-ink/50 font-medium truncate">{item.category}</p>
                                  </div>
                                </div>
                                
                                <div className="flex-grow flex flex-col sm:flex-row justify-between sm:items-center min-w-0 w-full gap-2">
                                  <div className="min-w-0 hidden sm:block pr-3">
                                    <h4 className="text-xs md:text-sm font-bold text-ink uppercase tracking-tight truncate group-hover:text-cobalt transition-colors flex items-center gap-1.5">
                                      {liveName} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-cobalt shrink-0" />
                                    </h4>
                                    <p className="text-xs uppercase tracking-wider text-ink/50 font-medium truncate mb-1">{item.category}</p>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 text-[10px] uppercase font-bold min-w-0">
                                    <span className="bg-black/5 px-2 py-0.5 rounded-none text-ink/80 border border-black/5 max-w-full truncate">Ship: {shippingVal}</span>
                                    <span className="bg-black/5 px-2 py-0.5 rounded-none text-ink/80 border border-black/5 max-w-full">
                                      {renderColorBadge(item.color || foundProd?.color, foundProd, colorOptions)}
                                    </span>
                                    {item.material && <span className="bg-black/5 px-2 py-0.5 rounded-none text-ink/60 border border-black/5 max-w-full truncate">Mat: {item.material}</span>}
                                  </div>

                                  <div className="flex justify-between items-center sm:block sm:text-right shrink-0 pt-1.5 sm:pt-0 border-t border-black/5 sm:border-0 w-full sm:w-auto mt-1 sm:mt-0">
                                    <span className="text-xs sm:text-sm font-bold text-ink block">${Number(item.price).toLocaleString()}</span>
                                    <span className="text-xs text-ink/50 font-bold uppercase block">QTY {item.quantity}</span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 w-full min-w-0 max-w-full">
              <div className="flex justify-between items-center border-b border-black/10 pb-4 gap-3 w-full min-w-0">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-ink min-w-0 truncate">
                  Registered Customers
                </h2>
                <button onClick={loadUsers} className="text-xs bg-cobalt text-white px-3 py-2 font-bold uppercase hover:bg-ink transition-colors cursor-pointer rounded-none shrink-0">Refresh</button>
              </div>

              {usersList.length === 0 ? (
                <p className="text-xs uppercase tracking-wider text-ink/40 bg-white border border-black/5 p-8 sm:p-12 text-center">No registered customers yet.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full min-w-0 max-w-full">
                  {/* Left panel: List */}
                  <div className={selectedUser ? "lg:col-span-7 space-y-4 w-full min-w-0 max-w-full" : "lg:col-span-12 space-y-4 w-full min-w-0 max-w-full"}>
                    <p className="text-[10px] text-ink/50 font-bold break-words leading-relaxed">※ 고객을 클릭하면 상세정보를 볼 수 있습니다.</p>
                    
                    {/* Mobile Card View (visible on small screens) */}
                    <div className="block md:hidden space-y-3 w-full min-w-0 max-w-full">
                      {usersList.map((user: any) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setUserMemo(user.memo || "");
                          }}
                          className={`p-4 bg-white border border-black/10 shadow-sm cursor-pointer space-y-2.5 transition-colors rounded-none w-full min-w-0 max-w-full overflow-hidden ${
                            selectedUser?.email === user.email ? 'border-cobalt bg-cobalt/5' : 'hover:border-black/30'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="block text-[9px] uppercase font-bold text-ink/40">Email Address</span>
                            <span className="text-xs font-bold text-ink break-all block">{user.email}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 text-xs min-w-0">
                            <div className="min-w-0">
                              <span className="block text-[9px] uppercase font-bold text-ink/40">Name</span>
                              <span className="font-semibold text-ink truncate block text-xs">{user.name || '-'}</span>
                            </div>
                            <div className="min-w-0 text-right">
                              <span className="block text-[9px] uppercase font-bold text-ink/40">Phone</span>
                              <span className="font-semibold text-ink truncate block text-xs">{user.phone || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View (visible on md and above) */}
                    <div className="hidden md:block bg-white border border-black/5 shadow-sm overflow-x-auto w-full min-w-0 max-w-full">
                      <table className="w-full text-left border-collapse text-xs font-sans min-w-[500px]">
                        <thead>
                          <tr className="bg-off-white uppercase text-[10px] font-black tracking-widest text-ink/60 border-b border-black/10">
                            <th className="p-4 px-6">Email Address</th>
                            <th className="p-4 px-6">Name</th>
                            <th className="p-4 px-6">Phone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 text-ink/80">
                          {usersList.map((user: any) => (
                            <tr 
                              key={user.id}
                              onClick={() => {
                                setSelectedUser(user);
                                setUserMemo(user.memo || "");
                              }}
                              className={`cursor-pointer hover:bg-off-white/80 transition-colors ${selectedUser?.email === user.email ? 'bg-off-white/85 font-semibold' : ''}`}
                            >
                              <td className="p-4 px-6 font-bold text-ink break-all text-xs md:text-sm">{user.email}</td>
                              <td className="p-4 px-6 font-medium whitespace-nowrap text-xs md:text-sm">{user.name || '-'}</td>
                              <td className="p-4 px-6 whitespace-nowrap text-xs md:text-sm">{user.phone || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right panel: Details & Memo */}
                  {selectedUser && (
                    <div className="lg:col-span-5 bg-white border border-black/10 p-4 sm:p-6 space-y-5 shadow-sm w-full min-w-0 max-w-full overflow-hidden rounded-none">
                      <div className="flex justify-between items-center border-b border-black/10 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-normal text-ink">
                          Customer Details
                        </h3>
                        <button onClick={() => setSelectedUser(null)} className="text-xs text-ink/50 hover:text-ink font-bold uppercase cursor-pointer px-2 py-1 bg-black/5 hover:bg-black/10 shrink-0">Close</button>
                      </div>
                      
                      <div className="space-y-3.5 text-xs md:text-sm font-sans text-ink/80 min-w-0 max-w-full">
                        <div className="min-w-0 overflow-hidden">
                          <span className="block text-[9px] text-ink/40 font-black uppercase mb-0.5">Email</span>
                          <span className="font-bold text-ink break-all block w-full">{selectedUser.email}</span>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <span className="block text-[9px] text-ink/40 font-black uppercase mb-0.5">Registered Name</span>
                          <span className="font-semibold text-ink break-all block w-full">{selectedUser.name || 'Not registered'}</span>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <span className="block text-[9px] text-ink/40 font-black uppercase mb-0.5">Phone Number</span>
                          <span className="font-semibold text-ink break-all block w-full">{selectedUser.phone || 'Not registered'}</span>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <span className="block text-[9px] text-ink/40 font-black uppercase mb-0.5">Shipping Address</span>
                          <p className="font-semibold text-ink whitespace-pre-wrap break-all w-full">{selectedUser.address || 'Not registered'}</p>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <span className="block text-[9px] text-ink/40 font-black uppercase mb-0.5">Registration Date</span>
                          <span className="text-ink/60 text-xs break-words block">{new Date(selectedUser.createdAt).toLocaleString()}</span>
                        </div>
                        
                        {/* Memo section */}
                        <div className="border-t border-black/10 pt-4 space-y-2 min-w-0 overflow-hidden">
                          <span className="block text-[9px] text-ink/40 font-black uppercase">메모 (내부 노트)</span>
                          <textarea
                            value={userMemo}
                            onChange={(e) => setUserMemo(e.target.value)}
                            className="w-full border border-black/10 focus:border-cobalt outline-none p-3 text-xs transition-colors bg-off-white font-sans resize-none rounded-none text-ink"
                            placeholder="내부 메모를 입력하세요..."
                            rows={4}
                          />
                          <button
                            onClick={handleSaveMemo}
                            disabled={isSavingMemo}
                            className="w-full bg-ink hover:bg-cobalt text-white py-3 font-bold uppercase text-xs transition-colors rounded-none cursor-pointer"
                          >
                            {isSavingMemo ? "저장 중..." : "메모 저장"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 min-w-0 w-full max-w-full overflow-x-hidden">
          <div className={activeTab === 'home' ? 'col-span-12 min-w-0 w-full max-w-full overflow-x-hidden' : 'col-span-1 lg:col-span-5 min-w-0 w-full max-w-full'}>
            <div className="lg:sticky lg:top-24 min-w-0 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between h-10 mb-4 pb-3 border-b border-black/10">
                <h2 className="text-xl font-semibold font-sans">
                  <span>{activeTab === 'home' ? 'Home Page Settings' : editingId ? 'Edit Content' : 'Add Content'}</span>
                </h2>
                <div className="flex items-center gap-2">
                  {/* 바로가기 (Go to Page) 버튼 for non-home */}
                  {activeTab !== 'home' && (() => {
                    const pageUrl = editingId 
                      ? (activeTab === 'collection' ? `/product/${editingId}` : activeTab === 'space' ? `/space/${editingId}` : activeTab === 'journal' ? `/journal/${editingId}` : null)
                      : null;
                    
                    if (pageUrl) {
                      return (
                        <Link 
                          to={pageUrl} 
                          className="bg-cobalt text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-ink transition-all flex items-center gap-1.5 rounded-none"
                        >
                          <ExternalLink size={10} /> View Page
                        </Link>
                      );
                    } else {
                      return (
                        <button 
                          type="button"
                          disabled 
                          className="bg-black/5 text-ink/20 border border-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest cursor-not-allowed rounded-none"
                        >
                          View Page
                        </button>
                      );
                    }
                  })()}

                  {/* Universal Top Save button for ALL tabs including Home */}
                  <button 
                    type={activeTab === 'home' ? 'button' : 'submit'}
                    form={activeTab !== 'home' ? 'editor-form' : undefined}
                    onClick={activeTab === 'home' ? (e) => handleSave(e) : undefined}
                    disabled={saveStatus === 'saving'}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-none flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      saveStatus === 'saving' ? 'bg-cobalt text-white opacity-80 cursor-wait pointer-events-none' :
                      saveStatus === 'saved' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                      'bg-cobalt text-white hover:bg-ink'
                    }`}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                        <span>SAVING...</span>
                      </>
                    ) : saveStatus === 'saved' ? (
                      <>
                        <CheckCircle2 size={10} />
                        <span>SAVED</span>
                      </>
                    ) : (
                      <>
                        <Save size={10} />
                        <span>{activeTab === 'home' ? 'SAVE HOME SETTINGS' : 'SAVE'}</span>
                      </>
                    )}
                  </button>

                  {activeTab !== 'home' && editingId && (
                    <button 
                      type="button"
                      onClick={handleCancelEdit} 
                      className="text-[9px] uppercase font-bold text-orange hover:underline ml-1"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <form id="editor-form" key={editingId || 'new'} onSubmit={handleSave} className="space-y-4 text-sm mt-0 pt-0">
                <fieldset disabled={saveStatus === 'saving'} className="space-y-4 w-full border-none p-0 m-0 mt-0 pt-0">
                  {activeTab === 'home' && (
                    <div className="max-w-5xl mx-auto space-y-12 pb-20">
                      {/* General Copy */}
                  <div className="bg-black/5 p-3.5 sm:p-6 md:p-8 rounded-none border border-black/5 shadow-sm min-w-0 w-full max-w-full overflow-hidden">
                    <h3 className="font-bold text-xs uppercase text-cobalt mb-6 flex items-center gap-2">
                      <ExternalLink size={14} /> Global Settings & Brand Logo
                    </h3>
                    <div className="space-y-6">
                      {/* Security & Members-Only Access Settings */}
                      <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-[11px] font-black uppercase text-ink tracking-wider flex items-center gap-1.5">
                              <Lock size={14} className="text-cobalt" />
                              Site Security & Members-Only Access (홈페이지 회원전용 공개 설정)
                            </h4>
                            <p className="text-[10px] text-ink/50 mt-0.5">
                              ON 설정 시 비로그인 일반 사용자의 접근이 차단되며 로그인/회원가입 게이트 모달이 표기됩니다.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={!!homeSettings.membersOnly} 
                              onChange={e => setHomeSettings({ ...homeSettings, membersOnly: e.target.checked })} 
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cobalt"></div>
                          </label>
                        </div>
                      </div>

                      {/* Brand Logo Settings */}
                      <div className="bg-white p-6 rounded-none border border-black/10 shadow-sm space-y-4">
                        <h4 className="text-[11px] font-black uppercase text-ink tracking-wider">Brand Logo & Favicon Display</h4>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink/50 mb-2">Logo Display Type</label>
                          <div className="flex items-center gap-6 text-xs font-bold uppercase">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="radio" 
                                name="logoType" 
                                value="image" 
                                checked={(homeSettings.logoType || 'image') === 'image'} 
                                onChange={() => setHomeSettings({ ...homeSettings, logoType: 'image' })} 
                                className="text-cobalt focus:ring-cobalt"
                              />
                              <span>Logo Image (로고 이미지 표기)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="radio" 
                                name="logoType" 
                                value="text" 
                                checked={homeSettings.logoType === 'text'} 
                                onChange={() => setHomeSettings({ ...homeSettings, logoType: 'text' })} 
                                className="text-cobalt focus:ring-cobalt"
                              />
                              <span>Text Font (폰트 표기 "Amph")</span>
                            </label>
                          </div>
                        </div>
                        {(homeSettings.logoType || 'image') === 'image' && (
                          <MediaUploadInput 
                            label="Upload / Custom Logo Image (PNG / SVG)" 
                            value={homeSettings.logoImage || '/logo.png'} 
                            onChange={val => setHomeSettings({ ...homeSettings, logoImage: val })} 
                            fit="contain"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Marquee Text</label>
                        <input value={homeSettings.marquee} onChange={e => setHomeSettings({...homeSettings, marquee: e.target.value})} className="w-full border border-black/20 p-2 bg-white outline-none focus:border-cobalt rounded-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Hero Transition Speed (sec)</label>
                        <input type="number" value={homeSettings.heroTransitionSpeed} onChange={e => setHomeSettings({...homeSettings, heroTransitionSpeed: Number(e.target.value)})} className="w-full border border-black/20 p-2 bg-white outline-none focus:border-cobalt rounded-none" />
                      </div>
                      <button 
                        type="button" 
                        onClick={async () => { 
                          setSavingSettings(true); 
                          await updateHomeSettings(homeSettings); 
                          window.dispatchEvent(new Event('settings_change'));
                          setSavingSettings(false); 
                          showToast('Global settings saved!', 'success'); 
                        }} 
                        className="w-full bg-cobalt text-white py-3 uppercase text-[10px] font-black hover:bg-ink transition-colors rounded-none shadow-md"
                      >
                        {savingSettings ? 'Saving...' : 'Save All Global Settings'}
                      </button>
                    </div>
                  </div>

                  {/* Hero Slides & Gradient Section */}
                  <div className="bg-black/5 p-6 rounded-none border border-black/5 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
                      <div>
                        <h3 className="font-bold text-xs uppercase text-cobalt flex items-center gap-2">
                          <span>Hero Slides & Transition</span>
                        </h3>
                        <p className="text-[10px] text-ink/50 font-serif italic mt-0.5">
                          홈 상단 히어로 슬라이드, 전환 속도, 미디어 다크 그라데이션 오버레이를 설정합니다.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => {
                          const newSlides = [...(homeSettings.heroSlides || []), { id: Date.now().toString(), title: '', subtitle: '', image: '' }];
                          setHomeSettings({...homeSettings, heroSlides: newSlides});
                        }} className="bg-ink text-white px-3.5 py-1.5 rounded-none text-[9px] font-black uppercase tracking-wider hover:bg-cobalt transition-colors cursor-pointer">+ Add Slide</button>
                      </div>
                    </div>

                    {/* Hero Dark Gradient Overlay Customizer */}
                    <div className="p-4 bg-white border border-black/10 shadow-xs flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-ink block">
                          Hero Media Dark Gradient Overlay (히어로 다크 그라데이션)
                        </span>
                        <span className="text-[8.5px] text-ink/50 font-sans block mt-0.5">
                          미디어 위의 어두운 그라데이션을 켜거나 끄고, 텍스트 가독성에 맞게 강도를 조절합니다.
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Toggle ON/OFF */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={Boolean(homeSettings.heroGradientEnabled)}
                            onChange={e => setHomeSettings({ ...homeSettings, heroGradientEnabled: e.target.checked })}
                            className="accent-cobalt w-4 h-4 cursor-pointer"
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink font-mono">
                            {homeSettings.heroGradientEnabled ? 'Gradient ON (활성)' : 'Gradient OFF (제거)'}
                          </span>
                        </label>

                        {/* Intensity selector */}
                        {homeSettings.heroGradientEnabled && (
                          <div className="flex items-center gap-1 bg-black/5 p-1 border border-black/10">
                            {(['light', 'medium', 'dark'] as const).map(level => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setHomeSettings({ ...homeSettings, heroGradientIntensity: level })}
                                className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  (homeSettings.heroGradientIntensity || 'medium') === level 
                                    ? 'bg-cobalt text-white shadow-xs' 
                                    : 'text-ink/60 hover:text-ink'
                                }`}
                              >
                                {level === 'light' ? 'Light (10%)' : level === 'medium' ? 'Medium (30%)' : 'Dark (50%)'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(homeSettings.heroSlides || []).map((slide, idx) => (
                        <div key={slide.id} className="p-4 bg-white rounded-none border border-black/10 shadow-sm space-y-4 relative group">
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            <button 
                              type="button" 
                              disabled={idx === 0} 
                              onClick={() => {
                                const newSlides = [...(homeSettings.heroSlides || [])];
                                [newSlides[idx], newSlides[idx - 1]] = [newSlides[idx - 1], newSlides[idx]];
                                setHomeSettings({...homeSettings, heroSlides: newSlides});
                              }} 
                              className="text-ink/40 hover:text-cobalt disabled:opacity-30 transition-colors cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft size={14}/>
                            </button>
                            <button 
                              type="button" 
                              disabled={idx === (homeSettings.heroSlides || []).length - 1} 
                              onClick={() => {
                                const newSlides = [...(homeSettings.heroSlides || [])];
                                [newSlides[idx], newSlides[idx + 1]] = [newSlides[idx + 1], newSlides[idx]];
                                setHomeSettings({...homeSettings, heroSlides: newSlides});
                              }} 
                              className="text-ink/40 hover:text-cobalt disabled:opacity-30 transition-colors cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight size={14}/>
                            </button>
                            <button 
                              type="button" 
                              onClick={() => {
                                const newSlides = (homeSettings.heroSlides || []).filter((_, i) => i !== idx);
                                setHomeSettings({...homeSettings, heroSlides: newSlides});
                              }} 
                              className="text-orange hover:scale-110 transition-transform cursor-pointer ml-1"
                              title="Delete Slide"
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title (Auto-expanding text)</label>
                            <textarea 
                              value={slide.title} 
                              onChange={e => {
                                const newSlides = [...(homeSettings.heroSlides || [])];
                                newSlides[idx] = { ...newSlides[idx], title: e.target.value };
                                setHomeSettings({...homeSettings, heroSlides: newSlides});
                              }} 
                              onInput={(e: any) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              className="w-full border border-black/10 p-2.5 text-xs outline-none focus:border-cobalt font-sans resize-none min-h-[76px]" 
                              rows={3} 
                              placeholder="Slide title (use \n for breaks)"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Subtitle</label>
                            <input 
                              value={slide.subtitle} 
                              onChange={e => {
                                const newSlides = [...(homeSettings.heroSlides || [])];
                                newSlides[idx] = { ...newSlides[idx], subtitle: e.target.value };
                                setHomeSettings({...homeSettings, heroSlides: newSlides});
                              }} 
                              className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white font-sans" 
                            />
                          </div>
                          
                          <MediaUploadInput label="Slide Image/Video" value={slide.image} onChange={val => {
                            const newSlides = [...(homeSettings.heroSlides || [])];
                            newSlides[idx] = { ...newSlides[idx], image: val };
                            setHomeSettings({...homeSettings, heroSlides: newSlides});
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Effective Magazine Cards Fallback for Migration */}
                  {(() => {
                    const effectiveMagCards: MagazineCard[] = (homeSettings.magazineCards && homeSettings.magazineCards.length > 0)
                      ? homeSettings.magazineCards
                      : [
                          {
                            id: 'mag-1',
                            title: homeSettings.philosophy1?.title || 'Design Philosophy',
                            quote: homeSettings.philosophy1?.quote || 'Form follows function, but also emotion. Sensory simplicity for modern architectural spaces.',
                            author: homeSettings.philosophy1?.author || '// AMPH ORIGINALS',
                            insertAfterIndex: 2,
                            image: ''
                          },
                          {
                            id: 'mag-2',
                            title: homeSettings.philosophy2?.title || 'Materiality',
                            quote: homeSettings.philosophy2?.quote || 'Materials tell stories. Raw timber, hand-finished steel, sensory wool, and architectural tension.',
                            author: homeSettings.philosophy2?.author || '// HONEST CRAFT',
                            insertAfterIndex: 4,
                            image: ''
                          }
                        ];

                    const showcaseData = homeSettings.showcase || defaultHomeSettings.showcase || {};
                    const isShowcaseEnabled = showcaseData.enabled !== false;

                    const showcaseItems: HomeShowcaseItem[] = (showcaseData.items && showcaseData.items.length > 0)
                      ? showcaseData.items
                      : [
                          {
                            id: 'showcase-1',
                            sourceType: showcaseData.spaceId ? 'space' : 'custom',
                            targetId: showcaseData.spaceId || (spaces[0]?.id || ''),
                            selectedImage: showcaseData.image || spaces[0]?.image || spaces[0]?.images?.[0] || '',
                            title: showcaseData.title || 'Shop The Space',
                            subtitle: showcaseData.subtitle || 'Spatial Curation',
                            description: showcaseData.description || 'Explore objects placed in real architectural context.',
                            image: showcaseData.image || '',
                            hotspots: showcaseData.hotspots || []
                          }
                        ];

                    const isValidCandidateImg = (url?: any): url is string => {
                      return typeof url === 'string' && url.trim().length > 5 && !url.includes('<svg') && !url.startsWith('data:image/svg+xml');
                    };

                    const getCandidateImages = (sourceType?: string, targetId?: string) => {
                      const list: { url: string; label: string; pinCount: number; hotspots: HotspotPin[] }[] = [];
                      if (sourceType === 'space' && targetId) {
                        const sp = spaces.find(s => s.id === targetId);
                        if (sp) {
                          // 1. Cover image
                          const cover = isValidCandidateImg(sp.image) ? sp.image : undefined;
                          if (cover) {
                            list.push({ url: cover, label: 'Main Cover', pinCount: (sp.hotspots || []).length, hotspots: sp.hotspots || [] });
                          }
                          // 2. Story content blocks (strictly valid story images in contentBlocks)
                          let storyIdx = 0;
                          (sp.contentBlocks || []).forEach((b) => {
                            if (b.type === 'image' && isValidCandidateImg(b.value)) {
                              storyIdx++;
                              const bPins = b.hotspots || [];
                              const existing = list.find(x => x.url === b.value);
                              if (!existing) {
                                list.push({ 
                                  url: b.value, 
                                  label: `Story #${storyIdx}`, 
                                  pinCount: bPins.length > 0 ? bPins.length : (b.value === cover ? (sp.hotspots || []).length : 0), 
                                  hotspots: bPins.length > 0 ? bPins : (b.value === cover ? (sp.hotspots || []) : []) 
                                });
                              } else if (bPins.length > 0 && existing.pinCount === 0) {
                                existing.pinCount = bPins.length;
                                existing.hotspots = bPins;
                              }
                            }
                          });
                        }
                      } else if (sourceType === 'journal' && targetId) {
                        const jn = journals.find(j => j.id === targetId);
                        if (jn) {
                          // 1. Cover
                          if (isValidCandidateImg(jn.image)) {
                            list.push({ url: jn.image, label: 'Main Cover', pinCount: (jn.hotspots || []).length, hotspots: jn.hotspots || [] });
                          }
                          // 2. Story content blocks
                          let storyIdx = 0;
                          (jn.contentBlocks || []).forEach((b) => {
                            if (b.type === 'image' && isValidCandidateImg(b.value)) {
                              storyIdx++;
                              const bPins = b.hotspots || [];
                              const existing = list.find(x => x.url === b.value);
                              if (!existing) {
                                list.push({ 
                                  url: b.value, 
                                  label: `Story #${storyIdx}`, 
                                  pinCount: bPins.length > 0 ? bPins.length : (b.value === jn.image ? (jn.hotspots || []).length : 0), 
                                  hotspots: bPins.length > 0 ? bPins : (b.value === jn.image ? (jn.hotspots || []) : []) 
                                });
                              } else if (bPins.length > 0 && existing.pinCount === 0) {
                                existing.pinCount = bPins.length;
                                existing.hotspots = bPins;
                              }
                            }
                          });
                        }
                      }
                      return list;
                    };

                    return (
                      <>
                        {/* 3. Selected Works & Magazine Cards Unified Group */}
                        <div className="bg-black/5 p-3.5 sm:p-6 md:p-8 rounded-none border border-black/5 shadow-sm space-y-8 min-w-0 w-full max-w-full overflow-hidden">
                          <div className="flex justify-between items-center border-b border-black/10 pb-4">
                            <div>
                              <h3 className="font-bold text-xs uppercase text-cobalt flex items-center gap-2">
                                <span>Selected Works & Magazine Cards (추천 제품 및 매거진 카드 통합 관리)</span>
                              </h3>
                              <p className="text-[10px] text-ink/50 mt-1 font-sans">
                                홈 화면 Selected Works 그리드에 노출될 추천 제품 목록과 그 사이에 인터리브될 매거진 인용구 카드를 함께 관리합니다.
                              </p>
                            </div>
                            <span className="text-[10px] font-black text-cobalt bg-cobalt/10 px-3 py-1 rounded-full uppercase shrink-0">
                              {homeSettings.featuredProductIds.length} Products / {effectiveMagCards.length} Magazine Cards
                            </span>
                          </div>

                          {/* 3-A. Active Order Manager (Chosen items + Magazine cards interleaved) */}
                          {homeSettings.featuredProductIds.length > 0 && (
                            <div className="space-y-3 bg-white p-4 border border-black/10 shadow-sm">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase text-ink/60 tracking-wider">
                                  Current Display Order (제품 + 매거진 카드 실시간 순서 배치 미리보기)
                                </h4>
                                <span className="text-[9px] text-orange font-bold uppercase">
                                  * 📰 표시된 박스는 매거진 카드 삽입 위치입니다.
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {(() => {
                                  const displayList: React.ReactNode[] = [];
                                  
                                  homeSettings.featuredProductIds.forEach((id, index) => {
                                    const prod = products.find(p => p.id === id);
                                    const productPos = index + 1;

                                    if (prod) {
                                      displayList.push(
                                        <div key={`prod-${id}`} className="border border-black/10 p-3 flex items-center justify-between bg-off-white/40 shadow-xs gap-2">
                                          <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="w-5 h-5 rounded-full bg-cobalt text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                              {productPos}
                                            </span>
                                            <MediaRenderer src={prod.images[0]} className="w-9 h-9 rounded-none object-cover mix-blend-multiply flex-shrink-0 border border-black/10" />
                                            <div className="min-w-0 flex-1">
                                              <span className="block text-xs font-bold uppercase text-ink truncate" title={prod.name}>{prod.name}</span>
                                              <span className="block text-[9px] text-ink/40 uppercase">{prod.category}</span>
                                            </div>
                                          </div>

                                          {/* Order buttons (Up/Down) & Remove */}
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button 
                                              type="button" 
                                              disabled={index === 0} 
                                              onClick={() => {
                                                const next = [...homeSettings.featuredProductIds];
                                                [next[index], next[index - 1]] = [next[index - 1], next[index]];
                                                setHomeSettings({...homeSettings, featuredProductIds: next});
                                              }} 
                                              className="text-ink/30 hover:text-cobalt disabled:opacity-20 cursor-pointer p-0.5"
                                              title="Move Up"
                                            >
                                              <ChevronUp size={14}/>
                                            </button>
                                            <button 
                                              type="button" 
                                              disabled={index === homeSettings.featuredProductIds.length - 1} 
                                              onClick={() => {
                                                const next = [...homeSettings.featuredProductIds];
                                                [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                                setHomeSettings({...homeSettings, featuredProductIds: next});
                                              }} 
                                              className="text-ink/30 hover:text-cobalt disabled:opacity-20 cursor-pointer p-0.5"
                                              title="Move Down"
                                            >
                                              <ChevronDown size={14}/>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = homeSettings.featuredProductIds.filter(fId => fId !== id);
                                                setHomeSettings({...homeSettings, featuredProductIds: next});
                                              }}
                                              className="text-ink/30 hover:text-orange text-xs font-black p-1 ml-1 cursor-pointer"
                                              title="Remove from Selected Works"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }

                                    // Interleave magazine cards after this product position
                                    const matchedMags = effectiveMagCards.filter(m => Number(m.insertAfterIndex) === productPos);
                                    matchedMags.forEach((mag, mIdx) => {
                                      const magCardIndex = effectiveMagCards.indexOf(mag);
                                      displayList.push(
                                        <div key={`mag-preview-${mag.id || mIdx}-${index}`} className="border-2 border-orange/40 p-3 flex items-center justify-between bg-orange/5 shadow-xs gap-2 relative">
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className="px-2 py-0.5 rounded-full bg-orange text-white text-[8px] font-black uppercase shrink-0">
                                              📰 Mag Card #{magCardIndex + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <span className="block text-xs font-black uppercase text-orange truncate" title={mag.title}>
                                                {mag.title || 'Magazine Card'}
                                              </span>
                                              <span className="block text-[8px] text-ink/50 truncate font-serif italic">
                                                "{mag.quote}"
                                              </span>
                                            </div>
                                          </div>

                                          {/* Up/Down buttons for interactive position reordering */}
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button 
                                              type="button" 
                                              disabled={mag.insertAfterIndex <= 1} 
                                              onClick={() => {
                                                const current = [...effectiveMagCards];
                                                const targetPos = Math.max(1, mag.insertAfterIndex - 1);
                                                current[magCardIndex] = { ...current[magCardIndex], insertAfterIndex: targetPos };
                                                setHomeSettings({ ...homeSettings, magazineCards: current });
                                              }} 
                                              className="text-orange/60 hover:text-orange disabled:opacity-20 cursor-pointer p-0.5"
                                              title="Move Up (제품 1개 앞으로 이동)"
                                            >
                                              <ChevronUp size={14}/>
                                            </button>
                                            <button 
                                              type="button" 
                                              disabled={mag.insertAfterIndex >= homeSettings.featuredProductIds.length} 
                                              onClick={() => {
                                                const current = [...effectiveMagCards];
                                                const targetPos = Math.min(homeSettings.featuredProductIds.length, mag.insertAfterIndex + 1);
                                                current[magCardIndex] = { ...current[magCardIndex], insertAfterIndex: targetPos };
                                                setHomeSettings({ ...homeSettings, magazineCards: current });
                                              }} 
                                              className="text-orange/60 hover:text-orange disabled:opacity-20 cursor-pointer p-0.5"
                                              title="Move Down (제품 1개 뒤로 이동)"
                                            >
                                              <ChevronDown size={14}/>
                                            </button>
                                            <span className="text-[8px] font-bold text-orange uppercase tracking-wider bg-white border border-orange/20 px-1.5 py-0.5 ml-1">
                                              #{productPos} 뒤
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    });
                                  });

                                  return displayList;
                                })()}
                              </div>
                            </div>
                          )}

                          {/* 3-B. Checkbox grid for adding/removing items (Accordion Toggle) */}
                          <div className="bg-white border border-black/10 shadow-xs">
                            <button
                              type="button"
                              onClick={() => setShowProductPicker(prev => !prev)}
                              className="w-full p-3 flex items-center justify-between bg-off-white/60 hover:bg-off-white transition-colors cursor-pointer border-b border-black/5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-ink tracking-wider">
                                  Toggle Products to Add / Remove (제품 추가 / 해제 리스트)
                                </span>
                                <span className="text-[9px] font-bold text-cobalt bg-cobalt/10 px-2 py-0.5 rounded-full">
                                  {homeSettings.featuredProductIds.length} / {products.length} Selected
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-black uppercase text-ink/50">
                                <span>{showProductPicker ? '접기' : '펼치기'}</span>
                                {showProductPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </div>
                            </button>

                            {showProductPicker && (
                              <div className="p-3.5 animate-in fade-in duration-200">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto p-2.5 bg-white rounded-none border border-black/10 shadow-inner">
                                  {products.map(p => {
                                    const isSelected = homeSettings.featuredProductIds.includes(p.id);
                                    return (
                                      <label key={p.id} className={`flex items-center gap-2.5 p-2.5 rounded-none border transition-all cursor-pointer ${isSelected ? 'bg-cobalt/5 border-cobalt shadow-xs' : 'bg-transparent border-black/10 hover:border-black/30'}`}>
                                        <input 
                                          type="checkbox" 
                                          checked={isSelected} 
                                          onChange={(e) => {
                                            const current = homeSettings.featuredProductIds || [];
                                            const next = e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id);
                                            setHomeSettings({...homeSettings, featuredProductIds: next});
                                          }} 
                                          className="w-3.5 h-3.5 rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                                        />
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <MediaRenderer src={p.images[0]} className="w-7 h-7 rounded-none object-cover mix-blend-multiply flex-shrink-0 border border-black/5" />
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-[9.5px] font-black uppercase truncate">{p.name}</span>
                                            <span className="text-[8.5px] text-ink/40 uppercase truncate">{p.category}</span>
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 3-C. Magazine Cards List Manager (Accordion Toggle) */}
                          <div className="pt-4 border-t border-black/10 space-y-4">
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setShowMagCards(prev => !prev)}
                                className="flex items-center gap-2 text-left cursor-pointer group"
                              >
                                <h4 className="text-[11px] font-black uppercase text-ink tracking-wider group-hover:text-cobalt transition-colors flex items-center gap-1.5">
                                  <span>Magazine Cards List (매거진 인용구 카드 {effectiveMagCards.length}개)</span>
                                  {showMagCards ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </h4>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentCards = effectiveMagCards;
                                  const maxAllowed = Math.max(1, homeSettings.featuredProductIds.length);
                                  const newCard: MagazineCard = {
                                    id: `mag-${Date.now()}`,
                                    title: 'Design Philosophy',
                                    quote: 'Good design is as little design as possible.',
                                    author: 'AMPH STUDIO',
                                    insertAfterIndex: Math.min(maxAllowed, (currentCards.length + 1) * 2),
                                    image: ''
                                  };
                                  setHomeSettings({ ...homeSettings, magazineCards: [...currentCards, newCard] });
                                  setShowMagCards(true);
                                }}
                                className="bg-ink text-white px-3 py-1.5 font-black uppercase text-[10px] tracking-wider hover:bg-cobalt transition-colors cursor-pointer rounded-none"
                              >
                                + Add Magazine Card
                              </button>
                            </div>

                            {showMagCards && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
                              {effectiveMagCards.map((card, idx) => {
                                const dimMode = (card.overlayMode || 'DARK').toUpperCase();
                                const isLightMode = dimMode === 'LIGHT';
                                const fileInputId = `mag-card-input-${card.id || idx}`;

                                return (
                                  <div key={card.id || idx} className="p-3 bg-white rounded-none border border-black/10 shadow-xs space-y-2.5 relative group">
                                    <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                                      <span className="text-[10px] font-black uppercase text-orange">
                                        Magazine Card #{idx + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = effectiveMagCards;
                                          const updated = current.filter((_, i) => i !== idx);
                                          setHomeSettings({ ...homeSettings, magazineCards: updated });
                                        }}
                                        className="text-ink/20 hover:text-orange transition-colors p-1 cursor-pointer"
                                        title="Delete Card"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>

                                    {/* 4:5 Aspect Ratio Integrated Media Drag & Live Card Simulator */}
                                    <div>
                                      <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[8.5px] font-black uppercase text-cobalt tracking-wider">
                                          4:5 Cover Simulator (클릭/드롭 업로드)
                                        </label>
                                        <span className="text-[7.5px] text-ink/40 font-bold uppercase">4:5 Fit</span>
                                      </div>
                                      <div 
                                        className="aspect-[4/5] w-full p-4 relative overflow-hidden border border-black/20 flex flex-col justify-between shadow-inner group/sim cursor-pointer transition-all hover:border-cobalt"
                                        style={{ backgroundColor: card.bgColor || '#1c1c1c' }}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            const file = e.dataTransfer.files[0];
                                            try {
                                              const initRes = await fetch('/api/upload', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' })
                                              });
                                              if (initRes.ok) {
                                                const { uploadUrl, url } = await initRes.json();
                                                const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
                                                if (putRes.ok) {
                                                  const current = [...effectiveMagCards];
                                                  current[idx] = { ...current[idx], image: url };
                                                  setHomeSettings({ ...homeSettings, magazineCards: current });
                                                }
                                              }
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }
                                        }}
                                        onClick={(e) => {
                                          if ((e.target as HTMLElement).closest('.mag-action-btn')) return;
                                          document.getElementById(fileInputId)?.click();
                                        }}
                                      >
                                        <input 
                                          id={fileInputId} 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              const file = e.target.files[0];
                                              try {
                                                const initRes = await fetch('/api/upload', {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' })
                                                });
                                                if (initRes.ok) {
                                                  const { uploadUrl, url } = await initRes.json();
                                                  const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
                                                  if (putRes.ok) {
                                                    const current = [...effectiveMagCards];
                                                    current[idx] = { ...current[idx], image: url };
                                                    setHomeSettings({ ...homeSettings, magazineCards: current });
                                                  }
                                                }
                                              } catch (err) {
                                                console.error(err);
                                              }
                                              e.target.value = '';
                                            }
                                          }}
                                        />

                                        {/* Background Image & Dimming Overlay */}
                                        {card.image && (
                                          <div className="absolute inset-0 w-full h-full z-0">
                                            <MediaRenderer src={card.image} alt="Cover Preview" className="w-full h-full object-cover" />
                                            {dimMode === 'DARK' && <div className="absolute inset-0 bg-black/60" />}
                                            {dimMode === 'LIGHT' && <div className="absolute inset-0 bg-white/80" />}
                                          </div>
                                        )}

                                        {/* Actual Font Shape Simulator Overlay */}
                                        <div className="relative z-10 flex flex-col justify-between h-full min-h-0 pointer-events-none">
                                          <span className={`text-[8px] uppercase tracking-[0.2em] font-black block truncate ${
                                            isLightMode ? 'text-ink/60' : 'text-white/60'
                                          }`}>
                                            {card.title || 'CARD TITLE PREVIEW'}
                                          </span>
                                          <div className="my-auto overflow-hidden py-1">
                                            <p className={`text-sm sm:text-base font-sans font-black uppercase tracking-tighter leading-[1.05] break-words line-clamp-4 ${
                                              isLightMode ? 'text-ink' : 'text-white'
                                            }`}>
                                              "{card.quote || 'DESIGN PHILOSOPHY CONTENT'}"
                                            </p>
                                          </div>
                                          <span className={`text-[7.5px] uppercase tracking-widest font-bold block truncate ${
                                            isLightMode ? 'text-ink/40' : 'text-white/40'
                                          }`}>
                                            {card.author || '// AMPH STUDIO'}
                                          </span>
                                        </div>

                                        {/* Floating Quick Media Action Overlay on hover */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/sim:opacity-100 transition-opacity z-20 flex flex-col items-center justify-center p-2 gap-1.5 backdrop-blur-[1px]">
                                          <span className="text-[8.5px] text-white font-black uppercase tracking-widest bg-cobalt px-2.5 py-1 shadow-sm">
                                            {card.image ? 'Replace Image' : '+ Drop / Click Image'}
                                          </span>
                                          {card.image && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const current = [...effectiveMagCards];
                                                current[idx] = { ...current[idx], image: '' };
                                                setHomeSettings({ ...homeSettings, magazineCards: current });
                                              }}
                                              className="mag-action-btn text-[7.5px] text-white/80 hover:text-orange bg-black/70 px-2 py-0.5 border border-white/20 uppercase font-bold tracking-wider cursor-pointer"
                                            >
                                              Remove Image
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Clean Text Inputs */}
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-[8.5px] font-bold uppercase text-ink/50 mb-0.5">Title Header</label>
                                        <input
                                          value={card.title || ''}
                                          onChange={e => {
                                            const current = [...effectiveMagCards];
                                            current[idx] = { ...current[idx], title: e.target.value };
                                            setHomeSettings({ ...homeSettings, magazineCards: current });
                                          }}
                                          className="w-full border border-black/10 p-1.5 text-xs outline-none focus:border-cobalt rounded-none bg-white font-sans text-ink"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[8.5px] font-bold uppercase text-ink/50 mb-0.5">Quote / Philosophy</label>
                                        <textarea
                                          value={card.quote || ''}
                                          onChange={e => {
                                            const current = [...effectiveMagCards];
                                            current[idx] = { ...current[idx], quote: e.target.value };
                                            setHomeSettings({ ...homeSettings, magazineCards: current });
                                          }}
                                          className="w-full border border-black/10 p-1.5 text-xs outline-none focus:border-cobalt rounded-none bg-white font-sans resize-none overflow-hidden text-ink min-h-[48px]"
                                          rows={2}
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[8.5px] font-bold uppercase text-ink/50 mb-0.5">Author / Subtitle</label>
                                        <input
                                          value={card.author || ''}
                                          onChange={e => {
                                            const current = [...effectiveMagCards];
                                            current[idx] = { ...current[idx], author: e.target.value };
                                            setHomeSettings({ ...homeSettings, magazineCards: current });
                                          }}
                                          className="w-full border border-black/10 p-1.5 text-xs outline-none focus:border-cobalt rounded-none bg-white font-sans text-ink"
                                        />
                                      </div>
                                    </div>

                                    {/* Card Background Color Picker & Dimming Option */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-black/5">
                                      <div>
                                        <label className="block text-[8.5px] font-bold uppercase text-ink/50 mb-1">
                                          Card Bg Color
                                        </label>
                                        <div className="flex gap-1.5 items-center">
                                          <input 
                                            type="color"
                                            value={card.bgColor || '#1c1c1c'}
                                            onChange={e => {
                                              const current = [...effectiveMagCards];
                                              current[idx] = { ...current[idx], bgColor: e.target.value };
                                              setHomeSettings({ ...homeSettings, magazineCards: current });
                                            }}
                                            className="w-5 h-5 border border-black/10 p-0 bg-transparent cursor-pointer flex-shrink-0"
                                          />
                                          <input 
                                            type="text"
                                            value={card.bgColor || ''}
                                            onChange={e => {
                                              const current = [...effectiveMagCards];
                                              current[idx] = { ...current[idx], bgColor: e.target.value };
                                              setHomeSettings({ ...homeSettings, magazineCards: current });
                                            }}
                                            placeholder="#1C1C1C"
                                            className="w-full border border-black/10 p-1 text-[10px] outline-none focus:border-cobalt rounded-none bg-white font-mono text-ink"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[8.5px] font-bold uppercase text-ink/50 mb-1">
                                          Overlay Dimming
                                        </label>
                                        <div className="grid grid-cols-3 gap-1">
                                          {[
                                            { mode: 'DARK', label: 'DARK' },
                                            { mode: 'LIGHT', label: 'LIGHT' },
                                            { mode: 'OFF', label: 'OFF' }
                                          ].map(opt => {
                                            const isSelected = dimMode === opt.mode;
                                            return (
                                              <button
                                                key={opt.mode}
                                                type="button"
                                                onClick={() => {
                                                  const current = [...effectiveMagCards];
                                                  current[idx] = { ...current[idx], overlayMode: opt.mode as any };
                                                  setHomeSettings({ ...homeSettings, magazineCards: current });
                                                }}
                                                className={`py-1 border text-center transition-all cursor-pointer rounded-none ${
                                                  isSelected 
                                                    ? 'bg-cobalt text-white border-cobalt font-black' 
                                                    : 'bg-white text-ink border-black/15 hover:border-black/30'
                                                }`}
                                              >
                                                <span className="block text-[8px] font-black uppercase">{opt.label}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </div>
                        </div>

                        {/* 4. Full-Bleed Interactive Pin Showcase Settings Card (복수 쇼케이스 & 세부 이미지 선택 지원) */}
                        <div className="bg-black/5 p-3.5 sm:p-6 md:p-8 rounded-none border border-black/5 shadow-sm space-y-6 min-w-0 w-full max-w-full overflow-hidden">
                          <div className="flex justify-between items-center border-b border-black/10 pb-4">
                            <div>
                              <h3 className="font-bold text-xs uppercase text-cobalt flex items-center gap-2">
                                <Sparkles size={14} />
                                <span>Full-Bleed Interactive Pin Showcase (풀블리드 인터랙티브 핀 쇼케이스 관리)</span>
                              </h3>
                              <p className="text-[10px] text-ink/50 mt-1 font-sans">
                                홈 화면 중간에 노출되는 공간/저널 인터랙티브 핀 룩북 쇼케이스를 여러 개 추가하고, 콘텐츠 내 세부 이미지를 선택하여 등록합니다.
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={isShowcaseEnabled} 
                                  onChange={e => {
                                    setHomeSettings({
                                      ...homeSettings,
                                      showcase: {
                                        ...showcaseData,
                                        enabled: e.target.checked
                                      }
                                    });
                                  }} 
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cobalt"></div>
                              </label>
                            </div>
                          </div>

                          {/* Showcase Dark Gradient Overlay Customizer */}
                          {isShowcaseEnabled && (
                            <div className="p-4 bg-white border border-black/10 shadow-xs flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-ink block">
                                  Showcase Dark Gradient Overlay (쇼케이스 다크 그라데이션)
                                </span>
                                <span className="text-[8.5px] text-ink/50 font-sans block mt-0.5">
                                  쇼케이스 미디어 위의 어두운 그라데이션을 켜거나 끄고, 텍스트 가독성에 맞게 강도를 조절합니다.
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={Boolean(showcaseData.gradientEnabled)}
                                    onChange={e => setHomeSettings({
                                      ...homeSettings,
                                      showcase: {
                                        ...showcaseData,
                                        gradientEnabled: e.target.checked
                                      }
                                    })}
                                    className="accent-cobalt w-4 h-4 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink font-mono">
                                    {showcaseData.gradientEnabled ? 'Gradient ON (활성)' : 'Gradient OFF (제거)'}
                                  </span>
                                </label>

                                {showcaseData.gradientEnabled && (
                                  <div className="flex items-center gap-1 bg-black/5 p-1 border border-black/10">
                                    {(['light', 'medium', 'dark'] as const).map(level => (
                                      <button
                                        key={level}
                                        type="button"
                                        onClick={() => setHomeSettings({
                                          ...homeSettings,
                                          showcase: {
                                            ...showcaseData,
                                            gradientIntensity: level
                                          }
                                        })}
                                        className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          (showcaseData.gradientIntensity || 'medium') === level 
                                            ? 'bg-cobalt text-white shadow-xs' 
                                            : 'text-ink/60 hover:text-ink'
                                        }`}
                                      >
                                        {level === 'light' ? 'Light (10%)' : level === 'medium' ? 'Medium (30%)' : 'Dark (50%)'}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {isShowcaseEnabled && (() => {
                            const safeActiveTab = Math.min(Math.max(0, activeShowcaseEditTab), Math.max(0, showcaseItems.length - 1));
                            const item = showcaseItems[safeActiveTab] || showcaseItems[0];
                            const itemIdx = safeActiveTab;

                            if (!item) return null;

                            const source = item.sourceType || 'space';
                            const targetId = item.targetId || '';
                            const candidateImages = getCandidateImages(source, targetId);
                            const selectedImgUrl = item.selectedImage || (source === 'custom' ? item.image : candidateImages[0]?.url) || '';

                            // Inherit registered hotspots from the selected Space or Journal if item.hotspots is not explicitly set
                            const inheritedHotspots: HotspotPin[] = source === 'space'
                              ? (() => {
                                  const sp = spaces.find(s => s.id === targetId) || spaces[0];
                                  if (!sp) return [];
                                  const matchBlock = (sp.contentBlocks || []).find((b: any) => b.value === selectedImgUrl && b.hotspots && b.hotspots.length > 0);
                                  return (matchBlock?.hotspots || (selectedImgUrl === sp.image ? (sp.hotspots || []) : (sp.hotspots || []))) as HotspotPin[];
                                })()
                              : source === 'journal'
                              ? (() => {
                                  const jn = journals.find(j => j.id === targetId) || journals[0];
                                  if (!jn) return [];
                                  const matchBlock = (jn.contentBlocks || []).find((b: any) => b.value === selectedImgUrl && b.hotspots && b.hotspots.length > 0);
                                  return (matchBlock?.hotspots || (selectedImgUrl === jn.image ? (jn.hotspots || []) : (jn.hotspots || []))) as HotspotPin[];
                                })()
                              : [];

                            const currentHotspots: HotspotPin[] = (item.hotspots && item.hotspots.length > 0)
                              ? item.hotspots
                              : inheritedHotspots;

                            const updateItem = (updates: Partial<HomeShowcaseItem>) => {
                              const updated = [...showcaseItems];
                              updated[itemIdx] = { ...updated[itemIdx], ...updates };
                              setHomeSettings({
                                ...homeSettings,
                                showcase: {
                                  ...showcaseData,
                                  items: updated
                                }
                              });
                            };

                            return (
                              <div className="space-y-4 animate-in fade-in duration-300">
                                {/* Horizontal Lookbook Tab Selector & Navigation */}
                                <div className="flex items-center justify-between bg-white p-2.5 border border-black/10 shadow-xs flex-wrap gap-2">
                                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-thin flex-1 min-w-0">
                                    <button
                                      type="button"
                                      disabled={safeActiveTab === 0}
                                      onClick={() => setActiveShowcaseEditTab(prev => Math.max(0, prev - 1))}
                                      className="p-1.5 border border-black/15 bg-off-white hover:bg-black/5 disabled:opacity-20 cursor-pointer shrink-0"
                                      title="Previous Lookbook"
                                    >
                                      <ChevronLeft size={14} />
                                    </button>

                                    {showcaseItems.map((sItem, sIdx) => {
                                      const isActive = sIdx === safeActiveTab;
                                      return (
                                        <button
                                          key={sItem.id || sIdx}
                                          type="button"
                                          onClick={() => setActiveShowcaseEditTab(sIdx)}
                                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer rounded-none shrink-0 ${
                                            isActive
                                              ? 'bg-cobalt text-white border-cobalt shadow-xs'
                                              : 'bg-white text-ink/70 border-black/15 hover:border-black/30'
                                          }`}
                                        >
                                          <span className="w-3.5 h-3.5 rounded-full bg-white/20 text-current text-[8px] flex items-center justify-center font-mono">
                                            {sIdx + 1}
                                          </span>
                                          <span className="truncate max-w-[120px]">
                                            {sItem.title ? sItem.title : `Lookbook #${sIdx + 1}`}
                                          </span>
                                        </button>
                                      );
                                    })}

                                    <button
                                      type="button"
                                      disabled={safeActiveTab >= showcaseItems.length - 1}
                                      onClick={() => setActiveShowcaseEditTab(prev => Math.min(showcaseItems.length - 1, prev + 1))}
                                      className="p-1.5 border border-black/15 bg-off-white hover:bg-black/5 disabled:opacity-20 cursor-pointer shrink-0"
                                      title="Next Lookbook"
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[9px] font-bold text-ink/40 uppercase hidden sm:inline">
                                      {safeActiveTab + 1} / {showcaseItems.length} Lookbooks
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newItem: HomeShowcaseItem = {
                                          id: `showcase-${Date.now()}`,
                                          sourceType: 'space',
                                          targetId: spaces[0]?.id || '',
                                          selectedImage: spaces[0]?.image || '',
                                          title: `Lookbook #${showcaseItems.length + 1}`,
                                          subtitle: 'Spatial Curation',
                                          description: 'Explore objects placed in real architectural context.',
                                          image: '',
                                          hotspots: spaces[0]?.hotspots || []
                                        };
                                        const updated = [...showcaseItems, newItem];
                                        setHomeSettings({
                                          ...homeSettings,
                                          showcase: {
                                            ...showcaseData,
                                            items: updated
                                          }
                                        });
                                        setActiveShowcaseEditTab(updated.length - 1);
                                      }}
                                      className="bg-ink text-white px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider hover:bg-cobalt transition-colors cursor-pointer rounded-none"
                                    >
                                      + Add Lookbook
                                    </button>
                                  </div>
                                </div>

                                {/* Active Lookbook Card Editor */}
                                <div key={item.id || itemIdx} className="bg-white p-5 md:p-6 rounded-none border border-black/10 shadow-xs space-y-6 relative group">
                                  {/* Item Header & Reordering */}
                                  <div className="flex items-center justify-between border-b border-black/10 pb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-cobalt text-white text-[9px] font-black flex items-center justify-center font-mono">
                                        {itemIdx + 1}
                                      </span>
                                      <span className="text-[11px] font-black uppercase text-ink tracking-wider">
                                        Showcase Lookbook #{itemIdx + 1} {item.title ? `// ${item.title}` : ''}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button 
                                        type="button" 
                                        disabled={itemIdx === 0} 
                                        onClick={() => {
                                          const next = [...showcaseItems];
                                          [next[itemIdx], next[itemIdx - 1]] = [next[itemIdx - 1], next[itemIdx]];
                                          setHomeSettings({ ...homeSettings, showcase: { ...showcaseData, items: next } });
                                          setActiveShowcaseEditTab(itemIdx - 1);
                                        }} 
                                        className="text-ink/40 hover:text-cobalt disabled:opacity-20 cursor-pointer p-1"
                                        title="Move Left (순서 앞으로 이동)"
                                      >
                                        <ChevronLeft size={15}/>
                                      </button>
                                      <button 
                                        type="button" 
                                        disabled={itemIdx === showcaseItems.length - 1} 
                                        onClick={() => {
                                          const next = [...showcaseItems];
                                          [next[itemIdx], next[itemIdx + 1]] = [next[itemIdx + 1], next[itemIdx]];
                                          setHomeSettings({ ...homeSettings, showcase: { ...showcaseData, items: next } });
                                          setActiveShowcaseEditTab(itemIdx + 1);
                                        }} 
                                        className="text-ink/40 hover:text-cobalt disabled:opacity-20 cursor-pointer p-1"
                                        title="Move Right (순서 뒤로 이동)"
                                      >
                                        <ChevronRight size={15}/>
                                      </button>
                                      {showcaseItems.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = showcaseItems.filter((_, i) => i !== itemIdx);
                                            setHomeSettings({ ...homeSettings, showcase: { ...showcaseData, items: next } });
                                            setActiveShowcaseEditTab(Math.max(0, itemIdx - 1));
                                          }}
                                          className="text-ink/30 hover:text-orange transition-colors p-1 cursor-pointer ml-1.5"
                                          title="Delete Showcase Lookbook"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Source Type Selector: Space / Journal / Custom */}
                                  <div>
                                    <label className="block text-[9px] font-black uppercase text-ink/70 tracking-wider mb-2">
                                      Content Source Type (연동 대상 선택)
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { type: 'space', label: 'Space (공간) 연동', desc: '등록된 공간의 테마 및 세부 이미지 연동' },
                                        { type: 'journal', label: 'Journal (매거진) 연동', desc: '등록된 아티클의 스토리 이미지 연동' },
                                        { type: 'custom', label: 'Custom (홈 커스텀)', desc: '홈 전용 독립 이미지 & 핀 직접 등록' }
                                      ].map(opt => (
                                        <button
                                          key={opt.type}
                                          type="button"
                                          onClick={() => {
                                            const targetSource = opt.type as any;
                                            const defaultTargetId = targetSource === 'space' 
                                              ? (spaces[0]?.id || '') 
                                              : targetSource === 'journal' 
                                                ? (journals[0]?.id || '') 
                                                : '';
                                            const cands = getCandidateImages(targetSource, defaultTargetId);
                                            updateItem({
                                              sourceType: targetSource,
                                              targetId: defaultTargetId,
                                              selectedImage: cands[0]?.url || '',
                                              hotspots: cands[0]?.hotspots || []
                                            });
                                          }}
                                          className={`p-2.5 text-left border transition-all cursor-pointer rounded-none ${
                                            source === opt.type 
                                              ? 'border-cobalt bg-cobalt/5 ring-1 ring-cobalt' 
                                              : 'border-black/10 bg-white hover:border-black/30'
                                          }`}
                                        >
                                          <span className={`block text-[10px] font-black uppercase ${source === opt.type ? 'text-cobalt' : 'text-ink'}`}>
                                            {opt.label}
                                          </span>
                                          <span className="block text-[8px] text-ink/50 mt-0.5 font-sans">
                                            {opt.desc}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Target Space Selection & Candidate Images Strip */}
                                  {source === 'space' && (
                                    <div className="space-y-3 bg-off-white/50 p-4 border border-black/10">
                                      <div>
                                        <label className="block text-[9px] font-bold uppercase text-ink/60 mb-1">
                                          Select Space Theme (연동할 공간 선택)
                                        </label>
                                        <select
                                          value={targetId}
                                          onChange={e => {
                                            const newTargetId = e.target.value;
                                            const cands = getCandidateImages('space', newTargetId);
                                            updateItem({
                                              targetId: newTargetId,
                                              selectedImage: cands[0]?.url || '',
                                              hotspots: cands[0]?.hotspots || []
                                            });
                                          }}
                                          className="w-full border border-black/15 p-2 bg-white text-xs outline-none focus:border-cobalt font-medium"
                                        >
                                          {spaces.map(s => (
                                            <option key={s.id} value={s.id}>
                                              {s.title} ({getCandidateImages('space', s.id).length} Images Available)
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Visual Thumbnail Picker Strip for Space Images */}
                                      {candidateImages.length > 0 && (
                                        <div>
                                          <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-[9px] font-black uppercase text-cobalt tracking-wider">
                                              Select Featured Image from Space (쇼케이스에 노출할 세부 이미지 선택)
                                            </label>
                                            <span className="text-[8px] text-ink/40 font-bold uppercase">
                                              {candidateImages.length} Images Found
                                            </span>
                                          </div>
                                          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                                            {candidateImages.map((cImg, cIdx) => {
                                              const isSelected = selectedImgUrl === cImg.url;
                                              return (
                                                <div
                                                  key={cIdx}
                                                  onClick={() => {
                                                    updateItem({
                                                      selectedImage: cImg.url,
                                                      hotspots: cImg.hotspots || []
                                                    });
                                                  }}
                                                  className={`relative shrink-0 w-24 h-24 border-2 cursor-pointer transition-all overflow-hidden group/thumb ${
                                                    isSelected ? 'border-cobalt ring-2 ring-cobalt/30 scale-102 shadow-md' : 'border-black/10 opacity-70 hover:opacity-100 hover:border-black/40'
                                                  }`}
                                                >
                                                  <MediaRenderer src={cImg.url} className="w-full h-full object-cover" />
                                                  <div className="absolute top-1 left-1 bg-black/70 text-white text-[7.5px] font-bold px-1.5 py-0.5 rounded-none backdrop-blur-xs">
                                                    {cImg.label}
                                                  </div>
                                                  {cImg.pinCount > 0 && (
                                                    <div className="absolute bottom-1 right-1 bg-cobalt text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-none">
                                                      📍 {cImg.pinCount} Pins
                                                    </div>
                                                  )}
                                                  {isSelected && (
                                                    <div className="absolute inset-0 bg-cobalt/15 border border-cobalt flex items-center justify-center">
                                                      <CheckCircle2 size={16} className="text-white drop-shadow-md" />
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {source === 'journal' && (
                                    <div className="space-y-3 bg-off-white/50 p-4 border border-black/10">
                                      <div>
                                        <label className="block text-[9px] font-bold uppercase text-ink/60 mb-1">
                                          Select Journal Article (연동할 저널/매거진 선택)
                                        </label>
                                        <select
                                          value={targetId}
                                          onChange={e => {
                                            const newTargetId = e.target.value;
                                            const cands = getCandidateImages('journal', newTargetId);
                                            updateItem({
                                              targetId: newTargetId,
                                              selectedImage: cands[0]?.url || '',
                                              hotspots: cands[0]?.hotspots || []
                                            });
                                          }}
                                          className="w-full border border-black/15 p-2 bg-white text-xs outline-none focus:border-cobalt font-medium"
                                        >
                                          {journals.map(j => (
                                            <option key={j.id} value={j.id}>
                                              {j.title} ({getCandidateImages('journal', j.id).length} Images Available)
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Visual Thumbnail Picker Strip for Journal Images */}
                                      {candidateImages.length > 0 && (
                                        <div>
                                          <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-[9px] font-black uppercase text-cobalt tracking-wider">
                                              Select Story Image from Journal (쇼케이스에 노출할 스토리 이미지 선택)
                                            </label>
                                            <span className="text-[8px] text-ink/40 font-bold uppercase">
                                              {candidateImages.length} Images Found
                                            </span>
                                          </div>
                                          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                                            {candidateImages.map((cImg, cIdx) => {
                                              const isSelected = selectedImgUrl === cImg.url;
                                              return (
                                                <div
                                                  key={cIdx}
                                                  onClick={() => {
                                                    updateItem({
                                                      selectedImage: cImg.url,
                                                      hotspots: cImg.hotspots || []
                                                    });
                                                  }}
                                                  className={`relative shrink-0 w-24 h-24 border-2 cursor-pointer transition-all overflow-hidden group/thumb ${
                                                    isSelected ? 'border-cobalt ring-2 ring-cobalt/30 scale-102 shadow-md' : 'border-black/10 opacity-70 hover:opacity-100 hover:border-black/40'
                                                  }`}
                                                >
                                                  <MediaRenderer src={cImg.url} className="w-full h-full object-cover" />
                                                  <div className="absolute top-1 left-1 bg-black/70 text-white text-[7.5px] font-bold px-1.5 py-0.5 rounded-none backdrop-blur-xs">
                                                    {cImg.label}
                                                  </div>
                                                  {cImg.pinCount > 0 && (
                                                    <div className="absolute bottom-1 right-1 bg-cobalt text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-none">
                                                      📍 {cImg.pinCount} Pins
                                                    </div>
                                                  )}
                                                  {isSelected && (
                                                    <div className="absolute inset-0 bg-cobalt/15 border border-cobalt flex items-center justify-center">
                                                      <CheckCircle2 size={16} className="text-white drop-shadow-md" />
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {source === 'custom' && (
                                    <div className="space-y-4 bg-off-white/50 p-4 border border-black/10">
                                      <MediaUploadInput 
                                        label="Showcase Custom Cover Image/Video" 
                                        value={item.image || ''} 
                                        onChange={val => updateItem({ image: val, selectedImage: val })} 
                                      />
                                      <div className="flex justify-between items-center pt-2">
                                        <span className="text-[10px] font-bold uppercase text-ink/70 font-mono">
                                          Custom Image Hotspot Pins ({currentHotspots.length} Registered)
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setHotspotEditorTarget({
                                              imageSrc: item.image || '',
                                              title: `Showcase #${itemIdx + 1} Interactive Pins Editor`,
                                              hotspots: currentHotspots,
                                              onSave: (updated) => {
                                                updateItem({ hotspots: updated });
                                                setHotspotEditorTarget(null);
                                              }
                                            });
                                          }}
                                          className="bg-cobalt text-white px-4 py-1.5 text-[9.5px] font-black uppercase tracking-wider hover:bg-ink transition-colors cursor-pointer rounded-none shadow-xs"
                                        >
                                          Manage Pins (핀 추가/편집)
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Typography & Headings */}
                                  <div className="space-y-3 pt-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1">Subtitle / Slogan</label>
                                        <input 
                                          value={item.subtitle || ''} 
                                          placeholder="Spatial Curation"
                                          onChange={e => updateItem({ subtitle: e.target.value })}
                                          className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white font-sans text-ink" 
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1">Main Heading Title</label>
                                        <input 
                                          value={item.title || ''} 
                                          placeholder="Shop The Space"
                                          onChange={e => updateItem({ title: e.target.value })}
                                          className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white font-sans text-ink" 
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1">Description</label>
                                      <textarea 
                                        value={item.description || ''} 
                                        placeholder="Explore objects placed in real architectural context. Hover or tap the interactive pins to preview details."
                                        onChange={e => updateItem({ description: e.target.value })}
                                        className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none resize-none bg-white font-sans text-ink"
                                        rows={2}
                                      />
                                    </div>
                                  </div>

                                  {/* Full Natural Lookbook Interactive Pin Preview with Direct Edit */}
                                  {selectedImgUrl && (
                                    <div className="space-y-2 pt-1">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase text-ink/70 tracking-wider flex items-center gap-1.5">
                                          <span>Lookbook #{itemIdx + 1} Interactive Preview ({currentHotspots.length} Pins)</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setHotspotEditorTarget({
                                              imageSrc: selectedImgUrl,
                                              title: `Showcase #${itemIdx + 1} Interactive Pins Editor`,
                                              hotspots: currentHotspots,
                                              onSave: (updated) => {
                                                updateItem({ hotspots: updated });
                                                setHotspotEditorTarget(null);
                                              }
                                            });
                                          }}
                                          className="text-[9px] font-bold text-cobalt hover:underline cursor-pointer flex items-center gap-1"
                                        >
                                          <span>✏️ Open Pin Editor</span>
                                        </button>
                                      </div>

                                      <div 
                                        onClick={() => {
                                          setHotspotEditorTarget({
                                            imageSrc: selectedImgUrl,
                                            title: `Showcase #${itemIdx + 1} Interactive Pins Editor`,
                                            hotspots: currentHotspots,
                                            onSave: (updated) => {
                                              updateItem({ hotspots: updated });
                                              setHotspotEditorTarget(null);
                                            }
                                          });
                                        }}
                                        className="w-full aspect-[16/9] max-h-[480px] bg-black/95 relative overflow-hidden border border-black/15 group/preview cursor-pointer"
                                        title="Click to open Interactive Pin Editor"
                                      >
                                        <ImageHotspots 
                                          src={selectedImgUrl} 
                                          alt={`Lookbook #${itemIdx + 1} preview`}
                                          hotspots={currentHotspots}
                                          products={products}
                                          className="w-full h-full pointer-events-none"
                                          imageClassName="w-full h-full object-cover"
                                        />

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-30">
                                          <span className="bg-cobalt text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-lg">
                                            Click Image to Edit Hotspots ({currentHotspots.length} Active Pins)
                                          </span>
                                        </div>

                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between p-3 pointer-events-none z-20">
                                          <div>
                                            <span className="text-[8px] font-bold uppercase text-white/70 block tracking-widest font-mono">
                                              LOOKBOOK #{itemIdx + 1} // {source.toUpperCase()}
                                            </span>
                                            <span className="text-[11px] font-black uppercase text-white tracking-wider">
                                              {item.title || 'Shop The Space'}
                                            </span>
                                          </div>
                                          <span className="text-[8px] font-black text-white bg-cobalt px-2.5 py-0.5 shadow-xs">
                                            {currentHotspots.length} Pins Registered
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* 5. Category Banners (Collection / Space / Journal) - Placed at Bottom */}
                        <div className="bg-black/5 p-3.5 sm:p-6 md:p-8 rounded-none border border-black/5 shadow-sm min-w-0 w-full max-w-full overflow-hidden">
                          <h3 className="font-bold text-xs uppercase text-cobalt mb-6">Category Banners (Curated Gallery Intros)</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(['collection', 'space', 'journal'] as const).map(cat => (
                              <div key={cat} className="p-4 bg-white rounded-none border border-black/5 shadow-sm space-y-4">
                                <span className="text-[10px] font-black uppercase text-orange">{cat} Intro</span>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                                  <input value={homeSettings.intros?.[cat]?.title || ''} onChange={e => {
                                    const next = { ...(homeSettings.intros || {}) };
                                    next[cat] = { ...next[cat], title: e.target.value };
                                    setHomeSettings({...homeSettings, intros: next as any});
                                  }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                                  <textarea value={homeSettings.intros?.[cat]?.description || ''} onChange={e => {
                                    const next = { ...(homeSettings.intros || {}) };
                                    next[cat] = { ...next[cat], description: e.target.value };
                                    setHomeSettings({...homeSettings, intros: next as any});
                                  }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" rows={2} />
                                </div>
                                <MediaUploadInput label="Banner Media" value={homeSettings.intros?.[cat]?.image || ''} onChange={val => {
                                  const next = { ...(homeSettings.intros || {}) };
                                  next[cat] = { ...next[cat], image: val };
                                  setHomeSettings({...homeSettings, intros: next as any});
                                }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'collection' && (
                <div className="space-y-6">
                  {/* Live Preview & Direct Interactive Media Manager: Actual image grid matching product detail layout */}
                  <div className="bg-black/5 rounded-none border border-black/10 overflow-hidden shadow-none space-y-2 p-3">
                    <div className="flex justify-between items-center px-1 pb-1">
                      <span className="block text-[10px] font-bold uppercase text-ink/50">
                        INTERACTIVE GALLERY
                      </span>
                      <span className="block text-[10px] font-bold uppercase text-cobalt">
                        {(form.images || []).filter(Boolean).length} IMAGES
                      </span>
                    </div>

                    {(form.images || []).filter(Boolean).length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 bg-black/10 p-1">
                        {(() => {
                          const originalImages = (form.images || []).filter(Boolean);
                          const portraitList = form.portraitImages || [];
                          const hoverList = form.hoverImages || [];

                          return originalImages.map((img, realIdx) => {
                            const normImg = normalizeMediaUrl(img);
                            const normalizedPortraitList = portraitList.map(normalizeMediaUrl);
                            const isForcedPortrait = normalizedPortraitList.includes(normImg) || portraitList.includes(img);
                            const physicalAspect = previewAspects[normImg] || previewAspects[img] || (isForcedPortrait ? 'portrait' : 'landscape');
                            const isLandscape = !isForcedPortrait && physicalAspect === 'landscape';
                            const isHover = hoverList.includes(img);
                            const isMenuOpen = activeMenuImgIndex === realIdx;
                            const isUrlShowing = showUrlImgIndex === realIdx;

                            const spanClass = isLandscape ? "col-span-2 aspect-[16/10]" : "col-span-1 aspect-[4/5]";
                            const isDragging = draggedPreviewImgIndex === realIdx;
                            const isDragOver = dragOverPreviewImgIndex === realIdx && draggedPreviewImgIndex !== realIdx;

                            return (
                              <div 
                                key={`img-item-${realIdx}`} 
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.setData('text/plain', realIdx.toString());
                                  setDraggedPreviewImgIndex(realIdx);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverPreviewImgIndex(realIdx);
                                }}
                                onDragLeave={() => {
                                  if (dragOverPreviewImgIndex === realIdx) setDragOverPreviewImgIndex(null);
                                }}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  
                                  // Case 1: External Computer File Drop Direct Upload
                                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                    const rawFiles = Array.from(e.dataTransfer.files) as File[];
                                    const files = rawFiles.filter((f: File) => f.type.startsWith('image/') || f.type.startsWith('video/'));
                                    if (files.length > 0) {
                                      setUploadingCellIndex(realIdx);
                                      try {
                                        const uploadedUrls = await Promise.all(files.map(async (file: File) => {
                                          const initRes = await fetch('/api/upload', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              filename: file.name,
                                              contentType: file.type || 'application/octet-stream'
                                            }),
                                          });
                                          if (!initRes.ok) throw new Error('Upload prepare failed');
                                          const { uploadUrl, url } = await initRes.json();
                                          const putRes = await fetch(uploadUrl, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': file.type || 'application/octet-stream' },
                                            body: file,
                                          });
                                          if (!putRes.ok) throw new Error('Upload to R2 failed');
                                          return url;
                                        }));

                                        if (uploadedUrls.length > 0) {
                                          setForm((prev: any) => {
                                            const current = [...(prev.images || [])];
                                            const oldUrl = current[realIdx] || '';
                                            const newUrl = uploadedUrls[0];
                                            current[realIdx] = newUrl;
                                            if (uploadedUrls.length > 1) {
                                              current.splice(realIdx + 1, 0, ...uploadedUrls.slice(1));
                                            }

                                            // Preserve & transfer Portrait & Hover settings if oldUrl existed
                                            let nextHover = prev.hoverImages || [];
                                            let nextPortrait = prev.portraitImages || [];
                                            if (oldUrl && newUrl && oldUrl !== newUrl) {
                                              nextHover = nextHover.map((url: string) => (url === oldUrl || normalizeMediaUrl(url) === normalizeMediaUrl(oldUrl)) ? newUrl : url);
                                              nextPortrait = nextPortrait.map((url: string) => (url === oldUrl || normalizeMediaUrl(url) === normalizeMediaUrl(oldUrl)) ? newUrl : url);
                                            }

                                            return {
                                              ...prev,
                                              images: current,
                                              hoverImages: nextHover,
                                              portraitImages: nextPortrait
                                            };
                                          });
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setUploadingCellIndex(null);
                                      }
                                    }
                                  } 
                                  // Case 2: Internal Reordering Drag Drop
                                  else if (draggedPreviewImgIndex !== null && draggedPreviewImgIndex !== realIdx) {
                                    const current = [...originalImages];
                                    const [moved] = current.splice(draggedPreviewImgIndex, 1);
                                    current.splice(realIdx, 0, moved);
                                    setForm((prev: any) => ({ ...prev, images: current }));
                                  }

                                  setDraggedPreviewImgIndex(null);
                                  setDragOverPreviewImgIndex(null);
                                }}
                                onDragEnd={() => {
                                  setDraggedPreviewImgIndex(null);
                                  setDragOverPreviewImgIndex(null);
                                }}
                                className={`${spanClass} bg-silver/10 relative group border transition-all cursor-grab active:cursor-grabbing ${
                                  isDragging ? 'opacity-30 border-dashed border-cobalt' :
                                  isDragOver ? 'ring-4 ring-cobalt border-cobalt scale-[1.01]' :
                                  'border-black/10 hover:border-cobalt/60'
                                }`}
                              >
                                {/* Media Display Inner Container — overflow-hidden isolated to prevent popup clipping */}
                                <div className="absolute inset-0 w-full h-full overflow-hidden">
                                  <MediaRenderer src={img} alt={`Preview ${realIdx+1}`} className="w-full h-full object-cover pointer-events-none" />
                                  {uploadingCellIndex === realIdx && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-40 animate-in fade-in duration-150">
                                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1.5 inline-block" />
                                      <span className="text-[9px] font-black uppercase tracking-wider font-mono">Uploading...</span>
                                    </div>
                                  )}
                                </div>

                                {/* Order Badge & Flags */}
                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 pointer-events-none">
                                  <span className="bg-black/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded-none font-mono shadow-xs">
                                    #{realIdx + 1}
                                  </span>
                                  {isForcedPortrait && (
                                    <span className="bg-cobalt text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-none shadow-xs">
                                      Portrait
                                    </span>
                                  )}
                                  {isHover && (
                                    <span className="bg-orange text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-none shadow-xs">
                                      Hover Effect
                                    </span>
                                  )}
                                </div>

                                {/* Right-Top Hamburger Options Button & Popup (Unclipped z-50) */}
                                <div className="absolute top-2 right-2 z-30">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuImgIndex(isMenuOpen ? null : realIdx);
                                    }}
                                    className="w-7 h-7 bg-black/80 hover:bg-cobalt text-white flex items-center justify-center transition-colors rounded-none shadow-md cursor-pointer"
                                    title="Media Options & Settings"
                                  >
                                    <MoreVertical size={14} />
                                  </button>

                                  {/* Compact Unclipped Hamburger Menu Options Popup */}
                                  {isMenuOpen && (
                                    <div 
                                      className="absolute top-8 right-0 w-56 bg-white border border-black/20 shadow-2xl p-3 z-50 text-ink text-left space-y-2.5 rounded-none animate-in fade-in zoom-in-95 duration-150"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <div className="flex justify-between items-center border-b border-black/10 pb-1.5">
                                        <span className="text-[9px] font-black uppercase text-cobalt font-mono">
                                          Media #{realIdx + 1} Options
                                        </span>
                                        <button 
                                          type="button" 
                                          onClick={() => setActiveMenuImgIndex(null)}
                                          className="text-[9px] font-bold text-ink/40 hover:text-ink cursor-pointer px-1"
                                        >
                                          ✕
                                        </button>
                                      </div>

                                      {/* Options Toggles (Portrait & Hover) */}
                                      <div className="space-y-2 pt-0.5">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input 
                                            type="checkbox" 
                                            checked={isForcedPortrait}
                                            onChange={e => {
                                              const current = form.portraitImages || [];
                                              const next = e.target.checked 
                                                ? [...current, img] 
                                                : current.filter((x: string) => x !== img && normalizeMediaUrl(x) !== normImg);
                                              setForm({ ...form, portraitImages: next });
                                            }}
                                            className="w-3.5 h-3.5 text-cobalt border-black/20 focus:ring-cobalt rounded-none"
                                          />
                                          <span className="text-[9px] font-bold uppercase text-ink/90">Portrait (세로형 고정)</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input 
                                            type="checkbox" 
                                            checked={isHover}
                                            onChange={e => {
                                              if (e.target.checked) {
                                                setForm({ ...form, hoverImages: [img] });
                                              } else {
                                                setForm({ ...form, hoverImages: [] });
                                              }
                                            }}
                                            className="w-3.5 h-3.5 text-cobalt border-black/20 focus:ring-cobalt rounded-none"
                                          />
                                          <span className="text-[9px] font-bold uppercase text-ink/90">Hover Effect (마우스오버)</span>
                                        </label>
                                      </div>

                                      {/* Image URL Toggle & Copy */}
                                      <div className="pt-2 border-t border-black/10 space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[8px] font-black uppercase text-ink/50">Image URL</span>
                                          <button
                                            type="button"
                                            onClick={() => setShowUrlImgIndex(isUrlShowing ? null : realIdx)}
                                            className="text-[8px] font-bold uppercase text-cobalt hover:underline cursor-pointer"
                                          >
                                            {isUrlShowing ? 'Hide URL' : 'Show URL'}
                                          </button>
                                        </div>
                                        {isUrlShowing && (
                                          <input 
                                            type="text" 
                                            readOnly 
                                            value={img} 
                                            onClick={e => (e.target as HTMLInputElement).select()}
                                            className="w-full text-[9px] font-mono p-1.5 bg-black/5 border border-black/10 text-ink/80 select-all outline-none" 
                                          />
                                        )}
                                      </div>

                                      {/* Delete Action */}
                                      <div className="pt-2 border-t border-black/10 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = [...originalImages];
                                            current.splice(realIdx, 1);
                                            setForm((prev: any) => ({ ...prev, images: current }));
                                            setActiveMenuImgIndex(null);
                                          }}
                                          className="text-[9px] font-black uppercase text-orange hover:underline cursor-pointer flex items-center gap-1"
                                        >
                                          <Trash2 size={11} /> Delete Media
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-[10px] text-ink/30 font-bold uppercase border-2 border-dashed border-black/10">
                        No Media Uploaded Yet
                      </div>
                    )}

                    {/* Direct + Add Media Dropzone Slot */}
                    <div className="pt-2 border-t border-black/10">
                      <MediaUploadInput 
                        label="+ ADD MEDIA"
                        value=""
                        onChange={val => {
                          if (val) {
                            setForm((prev: any) => ({
                              ...prev,
                              images: [...(prev.images || []).filter(Boolean), val]
                            }));
                          }
                        }}
                        onBatchUpload={urls => {
                          if (urls && urls.length > 0) {
                            setForm((prev: any) => ({
                              ...prev,
                              images: [...(prev.images || []).filter(Boolean), ...urls]
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Card 1: Basic Information (Accordion) */}
                  <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => toggleSection('basic')}
                      className="w-full text-left px-6 py-4 flex justify-between items-center bg-black/[0.01] hover:bg-black/[0.03] transition-colors border-b border-black/5"
                    >
                      <span className="text-xs font-black uppercase text-cobalt tracking-wider">Basic Info</span>
                      <span className="text-ink/30">{activeSections.basic ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
                    </button>
                    {activeSections.basic && (
                      <div className="p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <EditorInput label="Product Name" required value={form.name || ''} onChange={val => setForm({...form, name: val})} />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-ink/40 tracking-wider mb-2">Category</label>
                            <select 
                              value={form.category || 'Chairs'} 
                              onChange={e => setForm({...form, category: e.target.value as Category})} 
                              className="w-full border border-black/10 rounded-none p-3 bg-white outline-none focus:border-cobalt text-xs transition-all shadow-sm"
                            >
                              <option value="Chairs">Chairs</option>
                              <option value="Furniture">Furniture</option>
                              <option value="Lighting">Lighting</option>
                              <option value="Objects">Objects</option>
                            </select>
                          </div>
                          <EditorInput label="Price ($)" type="number" required value={form.price || 0} onChange={val => setForm({...form, price: val})} />
                        </div>
                        
                        <EditorInput label="Sub Title" required value={form.subTitle || ''} onChange={val => setForm({...form, subTitle: val})} />
                        <EditorInput label="Overview Description" required rows={3} value={form.description || ''} onChange={val => setForm({...form, description: val})} />
                        
                        {/* Spatial Lookbook Configuration */}
                        <div className="border-t border-black/5 pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="block text-xs font-bold uppercase text-ink">Spatial Lookbook Section</span>
                              <span className="text-[10px] text-ink/50">Show real architectural space lookbook with interactive pins</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={form.lookbookEnabled !== false} 
                                onChange={e => setForm({...form, lookbookEnabled: e.target.checked})}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cobalt"></div>
                            </label>
                          </div>
                          {form.lookbookEnabled !== false && (
                            <EditorInput 
                              label="Lookbook Custom Title" 
                              placeholder="Seen in Architectural Context" 
                              value={form.lookbookTitle || ''} 
                              onChange={val => setForm({...form, lookbookTitle: val})} 
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Detailed Specifications (Accordion) */}
                  <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => toggleSection('specs')}
                      className="w-full text-left px-6 py-4 flex justify-between items-center bg-black/[0.01] hover:bg-black/[0.03] transition-colors border-b border-black/5"
                    >
                      <span className="text-xs font-black uppercase text-cobalt tracking-wider">Specifications</span>
                      <span className="text-ink/30">{activeSections.specs ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
                    </button>
                    {activeSections.specs && (
                      <div className="p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <EditorInput label="Material (e.g., Oak, Steel)" value={form.material || ''} onChange={val => setForm({...form, material: val})} />
                          {/* Quick Material Selection Chips from other products */}
                          {(() => {
                            const materialMap = new Map<string, string>();
                            products.forEach(p => {
                              if (p.material) {
                                p.material.split(',').forEach(m => {
                                  const trimmed = m.trim();
                                  if (trimmed) {
                                    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
                                    const key = formatted.toLowerCase();
                                    if (!materialMap.has(key)) {
                                      materialMap.set(key, formatted);
                                    }
                                  }
                                });
                              }
                            });

                            const existingMaterials = Array.from(materialMap.values());

                            const currentMaterials = (form.material || '')
                              .split(',')
                              .map((m: string) => m.trim())
                              .filter(Boolean);

                            const handleToggleMaterial = (mat: string) => {
                              let nextMaterials: string[];
                              if (currentMaterials.some((m: string) => m.toLowerCase() === mat.toLowerCase())) {
                                nextMaterials = currentMaterials.filter((m: string) => m.toLowerCase() !== mat.toLowerCase());
                              } else {
                                nextMaterials = [...currentMaterials, mat];
                              }
                              // Clean and remove any duplicates case-insensitively
                              const cleanMap = new Map<string, string>();
                              nextMaterials.forEach(m => {
                                const tr = m.trim();
                                if (tr) {
                                  const formatted = tr.charAt(0).toUpperCase() + tr.slice(1);
                                  cleanMap.set(formatted.toLowerCase(), formatted);
                                }
                              });
                              setForm({ ...form, material: Array.from(cleanMap.values()).join(', ') });
                            };

                            if (existingMaterials.length === 0) return null;

                            return (
                              <div className="mt-2.5 pt-2 border-t border-black/5 space-y-1.5">
                                <span className="text-[9px] font-bold uppercase text-ink/50 tracking-wider block">
                                  Quick Select (기존 등록된 소재 키워드 클릭 시 자동 추가/제거):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {existingMaterials.map(mat => {
                                    const isSelected = currentMaterials.some((m: string) => m.toLowerCase() === mat.toLowerCase());
                                    return (
                                      <button
                                        key={mat}
                                        type="button"
                                        onClick={() => handleToggleMaterial(mat)}
                                        className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-none border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-cobalt text-white border-cobalt shadow-xs'
                                            : 'bg-off-white text-ink/70 border-black/10 hover:border-black/30'
                                        }`}
                                      >
                                        <span>{isSelected ? `✓ ${mat}` : `+ ${mat}`}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <EditorInput label="Dimensions (e.g., H 75 x W 120 x D 60 cm)" value={form.dimensions || ''} onChange={val => setForm({...form, dimensions: val})} />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-ink/40 tracking-wider mb-2">SHIPPING</label>
                            <select
                              value={form.shipping || 'Delivery (Free)'}
                              onChange={e => setForm({...form, shipping: e.target.value})}
                              className="w-full border border-black/10 rounded-none p-3 bg-white outline-none focus:border-cobalt text-xs font-semibold transition-all shadow-sm text-ink"
                            >
                              <option value="Delivery (Free)">Delivery (Free)</option>
                              <option value="Freight (Excl.)">Freight (Excl.)</option>
                              <option value="Pickup">Pickup</option>
                            </select>
                          </div>
                          <EditorInput 
                            label="Product Code (제품코드)" 
                            value={form.sku || generateProductCode(form.category || 'Chairs', form.name || '')} 
                            onChange={val => setForm({...form, sku: val})} 
                          />
                        </div>
                        <div className="mt-4 border-t border-black/5 pt-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={form.cartEnabled !== false} 
                              onChange={e => setForm({...form, cartEnabled: e.target.checked})} 
                              className="w-3.5 h-3.5 text-cobalt border-black/20 focus:ring-cobalt rounded-none"
                            />
                            <span className="text-[10px] uppercase font-black text-ink/60 tracking-wider">Enable Add to Cart Button</span>
                          </label>
                          <p className="text-[8px] text-ink/40 uppercase tracking-widest mt-1">If unchecked, the product detail page will show a disabled button with "Coming soon".</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Color Options (Restored Accordion with Drag & Drop Reorder) */}
                  <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => toggleSection('options')}
                      className="w-full text-left px-6 py-4 flex justify-between items-center bg-black/[0.01] hover:bg-black/[0.03] transition-colors border-b border-black/5"
                    >
                      <span className="text-xs font-black uppercase text-cobalt tracking-wider">Color Options</span>
                      <span className="text-ink/30">{activeSections.options ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
                    </button>
                    {activeSections.options && (
                      <div className="p-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300 text-ink">
                        {/* Target Slot Activation Tabs Header */}
                        <div className="bg-black/5 p-4 border border-black/10 space-y-3">
                          <span className="text-[10px] font-black uppercase text-ink/60 tracking-wider block font-mono">
                            1. Select Edit Target Slot
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Body Slot Selection Box */}
                            <button
                              type="button"
                              onClick={() => setActiveColorTarget('body')}
                              className={`p-3 border text-left transition-all relative rounded-none cursor-pointer ${
                                activeColorTarget === 'body'
                                  ? 'bg-cobalt/10 border-cobalt ring-1 ring-cobalt'
                                  : 'bg-white border-black/15 hover:border-black/30'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-black uppercase tracking-wider ${activeColorTarget === 'body' ? 'text-cobalt' : 'text-ink/70'}`}>
                                  Body
                                </span>
                                {activeColorTarget === 'body' && (
                                  <span className="text-[9px] font-bold text-cobalt flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cobalt inline-block animate-pulse" />
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2" onClick={e => e.stopPropagation()}>
                                {(() => {
                                  const bodyList = form.bodyColors && Array.isArray(form.bodyColors) ? form.bodyColors : [];
                                  if (bodyList.length === 0) return <span className="text-[9px] text-ink/40 uppercase font-mono">No colors selected</span>;
                                  return bodyList.map((c: any, i: number) => (
                                    <span 
                                      key={i} 
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.setData('text/plain', i.toString());
                                        setDraggedProductSwatchIndex(i);
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverProductSwatchIndex(i);
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (draggedProductSwatchIndex !== null && draggedProductSwatchIndex !== i) {
                                          const newList = [...bodyList];
                                          const [moved] = newList.splice(draggedProductSwatchIndex, 1);
                                          newList.splice(i, 0, moved);
                                          setForm((prev: any) => ({ ...prev, bodyColors: newList }));
                                        }
                                        setDraggedProductSwatchIndex(null);
                                        setDragOverProductSwatchIndex(null);
                                      }}
                                      className={`text-[8px] bg-white border px-1.5 py-0.5 uppercase font-bold text-ink/80 flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all ${
                                        dragOverProductSwatchIndex === i && draggedProductSwatchIndex !== i ? 'border-cobalt border-2 bg-cobalt/10' : 'border-black/15'
                                      }`}
                                      title="Drag to reorder body color"
                                    >
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: typeof c === 'string' ? '#888' : (c.hex || '#888') }} />
                                      {typeof c === 'string' ? c : c.name}
                                    </span>
                                  ));
                                })()}
                              </div>
                            </button>

                            {/* Fabric Slot Selection Box */}
                            <button
                              type="button"
                              onClick={() => setActiveColorTarget('fabric')}
                              className={`p-3 border text-left transition-all relative rounded-none cursor-pointer ${
                                activeColorTarget === 'fabric'
                                  ? 'bg-orange/10 border-orange ring-1 ring-orange'
                                  : 'bg-white border-black/15 hover:border-black/30'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-black uppercase tracking-wider ${activeColorTarget === 'fabric' ? 'text-orange' : 'text-ink/70'}`}>
                                  Fabric
                                </span>
                                {activeColorTarget === 'fabric' && (
                                  <span className="text-[9px] font-bold text-orange flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange inline-block animate-pulse" />
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2" onClick={e => e.stopPropagation()}>
                                {(() => {
                                  const fabricList = form.fabricColors;
                                  if (!fabricList || !Array.isArray(fabricList) || fabricList.length === 0) return <span className="text-[9px] text-ink/40 uppercase font-mono">No colors selected</span>;
                                  return fabricList.map((c: any, i: number) => (
                                    <span 
                                      key={i} 
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.setData('text/plain', i.toString());
                                        setDraggedProductSwatchIndex(i);
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverProductSwatchIndex(i);
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (draggedProductSwatchIndex !== null && draggedProductSwatchIndex !== i) {
                                          const newList = [...fabricList];
                                          const [moved] = newList.splice(draggedProductSwatchIndex, 1);
                                          newList.splice(i, 0, moved);
                                          setForm((prev: any) => ({ ...prev, fabricColors: newList }));
                                        }
                                        setDraggedProductSwatchIndex(null);
                                        setDragOverProductSwatchIndex(null);
                                      }}
                                      className={`text-[8px] bg-white border px-1.5 py-0.5 uppercase font-bold text-ink/80 flex items-center gap-1 cursor-grab active:cursor-grabbing transition-all ${
                                        dragOverProductSwatchIndex === i && draggedProductSwatchIndex !== i ? 'border-orange border-2 bg-orange/10' : 'border-black/15'
                                      }`}
                                      title="Drag to reorder fabric color"
                                    >
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: typeof c === 'string' ? '#888' : (c.hex || '#888') }} />
                                      {typeof c === 'string' ? c : c.name}
                                    </span>
                                  ));
                                })()}
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Global Swatches Selector (2. Tap Swatch to Attach to Active Target) */}
                        <div className="bg-white p-5 border border-black/10 space-y-4 shadow-2xs">
                          <div className="flex justify-between items-center border-b border-black/5 pb-2">
                            <span className="text-[11px] font-black uppercase text-ink tracking-wider font-mono">
                              2. Tap Swatches below to attach to [{activeColorTarget.toUpperCase()}]
                            </span>
                            <button
                              type="button"
                              onClick={() => switchTab('colorAssets')}
                              className="text-[9px] font-black uppercase text-ink/40 hover:text-cobalt underline"
                            >
                              Manage Assets Dashboard →
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {(homeSettings.colorAssets || defaultColorAssets).map((asset, aIdx) => {
                              const currentList = activeColorTarget === 'body' 
                                ? (Array.isArray(form.bodyColors) ? form.bodyColors : [])
                                : (Array.isArray(form.fabricColors) ? form.fabricColors : []);

                              const isAttached = currentList.some((c: any) => (typeof c === 'string' ? c : c.name).toLowerCase() === asset.name.toLowerCase());

                              return (
                                <button
                                  key={`${asset.name}-${aIdx}`}
                                  type="button"
                                  onClick={() => handleToggleColorForTarget(asset)}
                                  className={`px-3 py-2 border text-[10px] font-bold uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer ${
                                    isAttached 
                                      ? (activeColorTarget === 'body' ? 'bg-cobalt text-white border-cobalt shadow-xs' : 'bg-orange text-white border-orange shadow-xs')
                                      : 'bg-white text-ink border-black/15 hover:border-black/40 hover:bg-black/5'
                                  }`}
                                >
                                  <span 
                                    className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0" 
                                    style={{ backgroundColor: asset.hex || '#000000' }} 
                                  />
                                  <span>{asset.name}</span>
                                  {isAttached ? (
                                    <span className="text-[9px] font-black">✓</span>
                                  ) : (
                                    <span className="text-[8px] opacity-40">+</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Add New Custom Swatch to Library & Auto-Attach */}
                        <div className="bg-off-white/70 p-4 border border-black/10 space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-ink/60 tracking-wider font-mono">
                            + Add New Swatch (New Swatch &amp; Attach to [{activeColorTarget.toUpperCase()}])
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="sm:col-span-5">
                              <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">Color Name</label>
                              <input 
                                type="text"
                                value={newCustomColorName}
                                onChange={e => setNewCustomColorName(e.target.value)}
                                placeholder="e.g. Oak, Walnut, Leather Black"
                                className="w-full border border-black/10 p-2 text-xs bg-white text-ink outline-none focus:border-cobalt rounded-none h-[34px]"
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">Hex Swatch</label>
                              <div className="flex gap-2 items-center">
                                <input 
                                  type="color"
                                  value={newCustomColorHex}
                                  onChange={e => setNewCustomColorHex(e.target.value)}
                                  className="w-7 h-[34px] border border-black/10 p-0 bg-transparent cursor-pointer flex-shrink-0"
                                />
                                <input 
                                  type="text"
                                  value={newCustomColorHex}
                                  onChange={e => setNewCustomColorHex(e.target.value)}
                                  className="w-full border border-black/10 p-2 text-xs font-mono uppercase bg-white text-ink outline-none focus:border-cobalt rounded-none h-[34px]"
                                />
                              </div>
                            </div>
                            <div className="sm:col-span-3">
                              <button
                                type="button"
                                onClick={handleAddGlobalSwatch}
                                className="w-full bg-cobalt hover:bg-ink text-white px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none cursor-pointer h-[34px] flex items-center justify-center whitespace-nowrap shadow-xs"
                              >
                                + Add Color
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 4: Story Blocks (Accordion) */}
                  <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden mb-4">
                    <button 
                      type="button"
                      onClick={() => toggleSection('story')}
                      className="w-full text-left px-6 py-4 flex justify-between items-center bg-black/[0.01] hover:bg-black/[0.03] transition-colors border-b border-black/5"
                    >
                      <span className="text-xs font-black uppercase text-cobalt tracking-wider">Story Media</span>
                      <span className="text-ink/30">{activeSections.story ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
                    </button>
                    {activeSections.story && (
                      <div className="p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {renderContentBlocksEditor()}
                      </div>
                    )}
                  </div>

                  {/* Card 5: Related Products & Linked Spaces/Journals */}
                  {(() => {
                    const sortedProducts = [...products].sort((a, b) => {
                      const aIdx = (homeSettings.globalProductOrder || []).indexOf(a.id);
                      const bIdx = (homeSettings.globalProductOrder || []).indexOf(b.id);
                      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                      if (aIdx !== -1) return 1;
                      if (bIdx !== -1) return -1;
                      return 0;
                    });
                    return (
                      <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden space-y-4 p-6">
                        <div>
                          <h3 className="font-bold text-[10px] uppercase mb-3 text-cobalt">Related Products (하단 연관 추천 상품 선택)</h3>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-black/10 p-3 bg-black/5 rounded-none">
                            {sortedProducts.filter(p => p.id !== form.id).map(p => (
                              <label key={p.id} className="flex items-center gap-2 p-2 bg-white rounded-none border border-black/5 hover:bg-silver/10 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={form.relatedProductIds?.includes(p.id)} 
                                  onChange={(e) => {
                                    const current = form.relatedProductIds || [];
                                    const next = e.target.checked ? [...current, p.id] : current.filter((id:string) => id !== p.id);
                                    setForm({...form, relatedProductIds: next});
                                  }}
                                  className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                                />
                                <span className="text-[9px] font-bold uppercase truncate">{p.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-[10px] uppercase mb-2 text-cobalt">Linked Spaces (연결된 공간 스페이스 선택)</h3>
                          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-black/10 p-3 bg-black/5 rounded-none">
                            {spaces.map(s => (
                              <label key={s.id} className="flex items-center gap-2 p-2 bg-white rounded-none border border-black/5 hover:bg-silver/10 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={form.relatedSpaceIds?.includes(s.id)} 
                                  onChange={(e) => {
                                    const current = form.relatedSpaceIds || [];
                                    const next = e.target.checked ? [...current, s.id] : current.filter((id:string) => id !== s.id);
                                    setForm({...form, relatedSpaceIds: next});
                                  }}
                                  className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                                />
                                <span className="text-[9px] font-bold uppercase truncate">{s.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-[10px] uppercase mb-2 text-cobalt">Linked Journal Stories (연결된 저널 선택)</h3>
                          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-black/10 p-3 bg-black/5 rounded-none">
                            {journals.map(j => (
                              <label key={j.id} className="flex items-center gap-2 p-2 bg-white rounded-none border border-black/5 hover:bg-silver/10 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={form.relatedJournalIds?.includes(j.id)} 
                                  onChange={(e) => {
                                    const current = form.relatedJournalIds || [];
                                    const next = e.target.checked ? [...current, j.id] : current.filter((id:string) => id !== j.id);
                                    setForm({...form, relatedJournalIds: next});
                                  }}
                                  className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                                />
                                <span className="text-[9px] font-bold uppercase truncate">{j.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'journal' && (
                <div className="space-y-4 !mt-0 !pt-0">
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                    <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                    <textarea required value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={4}/></div>
                  {renderContentBlocksEditor()}

                  <div className="border-t border-black/10 pt-4 mt-4 space-y-4">
                    <div>
                      <h3 className="font-bold text-[10px] uppercase mb-2 text-cobalt">Amplify with (Linked Products)</h3>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-black/10 p-3 bg-black/5 rounded-none">
                        {(() => {
                          const sortedProducts = [...products].sort((a, b) => {
                            const aIdx = (homeSettings.globalProductOrder || []).indexOf(a.id);
                            const bIdx = (homeSettings.globalProductOrder || []).indexOf(b.id);
                            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                            if (aIdx !== -1) return 1;
                            if (bIdx !== -1) return -1;
                            return 0;
                          });
                          return sortedProducts.map(p => (
                            <label key={p.id} className="flex items-center gap-2 p-2 bg-white rounded-none border border-black/5 hover:bg-silver/10 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={form.appliedProductIds?.includes(p.id)} 
                                onChange={(e) => {
                                  const current = form.appliedProductIds || [];
                                  const next = e.target.checked ? [...current, p.id] : current.filter((id:string) => id !== p.id);
                                  setForm({...form, appliedProductIds: next});
                                }}
                                className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                              />
                              <span className="text-[9px] font-bold uppercase truncate">{p.name}</span>
                            </label>
                          ));
                        })()}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-[10px] uppercase mb-2 text-cobalt">Related Journal Articles (하단 연관 저널 선택)</h3>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-black/10 p-3 bg-black/5 rounded-none">
                        {journals.filter(j => j.id !== form.id).map(j => (
                          <label key={j.id} className="flex items-center gap-2 p-2 bg-white rounded-none border border-black/5 hover:bg-silver/10 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={form.relatedJournalIds?.includes(j.id)} 
                              onChange={(e) => {
                                const current = form.relatedJournalIds || [];
                                const next = e.target.checked ? [...current, j.id] : current.filter((id:string) => id !== j.id);
                                setForm({...form, relatedJournalIds: next});
                              }}
                              className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                            />
                            <span className="text-[9px] font-bold uppercase truncate">{j.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'space' && (
                <>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                    <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                    <textarea required value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={4}/></div>
                  {renderContentBlocksEditor()}

                  <div className="border-t border-black/10 pt-4 mt-4 space-y-4">
                    <div>
                      <h3 className="font-bold text-[10px] uppercase mb-2 text-cobalt">Amplify with (Linked Products)</h3>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-black/10 p-3 bg-black/5 rounded-none">
                        {(() => {
                          const sortedProducts = [...products].sort((a, b) => {
                            const aIdx = (homeSettings.globalProductOrder || []).indexOf(a.id);
                            const bIdx = (homeSettings.globalProductOrder || []).indexOf(b.id);
                            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                            if (aIdx !== -1) return 1;
                            if (bIdx !== -1) return -1;
                            return 0;
                          });
                          return sortedProducts.map(p => (
                            <label key={p.id} className="flex items-center gap-2 p-2 bg-white rounded-none border border-black/5 hover:bg-silver/10 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={form.appliedProductIds?.includes(p.id)} 
                                onChange={(e) => {
                                  const current = form.appliedProductIds || [];
                                  const next = e.target.checked ? [...current, p.id] : current.filter((id:string) => id !== p.id);
                                  setForm({...form, appliedProductIds: next});
                                }}
                                className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                              />
                              <span className="text-[9px] font-bold uppercase truncate">{p.name}</span>
                            </label>
                          ));
                        })()}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-[10px] uppercase mb-2 text-cobalt">Related Spaces (하단 연관 스페이스 선택)</h3>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-black/10 p-3 bg-black/5 rounded-none">
                        {spaces.filter(s => s.id !== form.id).map(s => (
                          <label key={s.id} className="flex items-center gap-2 p-2 bg-white rounded-none border border-black/5 hover:bg-silver/10 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={form.relatedSpaceIds?.includes(s.id)} 
                              onChange={(e) => {
                                const current = form.relatedSpaceIds || [];
                                const next = e.target.checked ? [...current, s.id] : current.filter((id:string) => id !== s.id);
                                setForm({...form, relatedSpaceIds: next});
                              }}
                              className="rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                            />
                            <span className="text-[9px] font-bold uppercase truncate">{s.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              </fieldset>
            </form>
          </div>
        </div>

        {!(activeTab === 'home' || activeTab === 'orders' || activeTab === 'users') && (
          <div className="col-span-1 lg:col-span-7 lg:sticky lg:top-24">
            {/* Inventory Controls */}
            <div className="flex items-center justify-between h-10 mb-4 pb-3 border-b border-black/10">
               <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold font-sans uppercase tracking-tight">
                    {activeTab === 'collection' ? 'Collection' : activeTab === 'space' ? 'Space' : 'Journal'}
                  </h2>
                  <button onClick={handleNewItem} className="flex items-center gap-1.5 bg-cobalt text-white px-3 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest hover:bg-ink transition-all cursor-pointer">
                    <Plus size={12} /> New Item
                  </button>
                  
                  {activeTab === 'collection' && (
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-none border border-black/10 shadow-2xs">
                      <span className="text-[8.5px] font-black uppercase text-ink/40 tracking-wider">Sort By</span>
                      <select 
                        value={sortBy} 
                        onChange={e => setSortBy(e.target.value as any)}
                        className="bg-transparent text-[9.5px] font-black uppercase outline-none cursor-pointer text-cobalt"
                      >
                        <option value="user">User Order</option>
                        <option value="name">Name</option>
                        <option value="category">Category</option>
                        <option value="newest">Newest</option>
                      </select>
                    </div>
                  )}
               </div>
               
               {selectedIds.length > 0 && (
                 <div className="flex items-center gap-2 bg-black/5 p-1 rounded-none border border-black/10 animate-in fade-in slide-in-from-right-4">
                   <span className="text-[9px] font-bold px-2 border-r border-black/10">{selectedIds.length} Selected</span>
                   <button onClick={handleBulkDuplicate} className="flex items-center gap-1 hover:text-cobalt px-1.5 py-0.5 transition-colors text-[9px] font-bold uppercase cursor-pointer"><Copy size={11}/> Duplicate</button>
                   <button onClick={handleBulkDelete} className="flex items-center gap-1 hover:text-orange px-1.5 py-0.5 transition-colors text-[9px] font-bold uppercase cursor-pointer"><Trash2 size={11}/> Delete</button>
                 </div>
               )}
            </div>
   
            <div className="bg-white rounded-none border border-black/5 shadow-2xs w-full overflow-hidden lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto pr-1">
              <table className="w-full text-xs text-left table-fixed">
                <thead className="hidden md:table-header-group text-[9.5px] uppercase font-black tracking-wider text-ink/40 border-b border-black/5 bg-off-white/50">
                  <tr>
                    <th className="p-3 w-8 text-center">
                      <input type="checkbox" onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = (activeTab === 'collection' || activeTab === 'home') ? products.map(p => p.id) : activeTab === 'space' ? spaces.map(s => s.id) : journals.map(j => j.id);
                          setSelectedIds(allIds);
                        } else setSelectedIds([]);
                      }} checked={selectedIds.length > 0 && selectedIds.length === ((activeTab === 'collection' || activeTab === 'home') ? products.length : activeTab === 'space' ? spaces.length : journals.length)} />
                    </th>
                    <th className="py-3 px-2 w-12 text-center">NO</th>
                    {((activeTab === 'collection' || activeTab === 'home') ? products : activeTab === 'space' ? spaces : journals).some(item => {
                      const src = (item as any).images?.[0] || (item as any).image || '';
                      return src.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || src.includes('video');
                    }) ? (
                      <th className="py-3 px-2 w-16">MEDIA</th>
                    ) : (
                      <th className="py-3 px-2 w-16">IMAGE</th>
                    )}
                    {activeTab === 'collection' && (
                      <>
                        <th className="py-3 px-2">TITLE</th>
                        <th className="py-3 px-1 text-center w-24">CATEGORY</th>
                      </>
                    )}
                    {activeTab === 'journal' && (
                      <>
                        <th className="py-3 px-2">TITLE</th>
                        <th className="py-3 px-1 text-center w-24">LINKED</th>
                      </>
                    )}
                    {activeTab === 'space' && (
                      <>
                        <th className="py-3 px-2">TITLE</th>
                        <th className="py-3 px-1 text-center w-24">LINKED</th>
                      </>
                    )}
                    <th className="py-3 px-2 text-center w-14">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y divide-black/5">
                    {(activeTab === 'collection' || activeTab === 'home') && (() => {
                      const getSorted = () => {
                        const list = [...products];
                        if (sortBy === 'name') return list.sort((a,b) => a.name.localeCompare(b.name));
                        if (sortBy === 'category') return list.sort((a,b) => a.category.localeCompare(b.category));
                        if (sortBy === 'newest') return list;
                        return list.sort((a,b) => {
                          const orderList = homeSettings.globalProductOrder || [];
                          const aIdx = orderList.indexOf(a.id);
                          const bIdx = orderList.indexOf(b.id);
                          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                          if (aIdx !== -1) return -1;
                          if (bIdx !== -1) return 1;
                          return 0;
                        });
                      };
                      return getSorted().map((p, index) => (
                        <tr 
                          key={p.id} 
                          onClick={() => handleEdit(p)}
                          className={`flex flex-col md:table-row p-3.5 md:p-0 border-b border-black/10 md:border-b-0 hover:bg-cobalt/5 group transition-all duration-200 cursor-pointer ${selectedIds.includes(p.id) ? 'bg-cobalt/5' : ''} ${editingId === p.id ? 'bg-cobalt/10 border-l-4 border-cobalt font-semibold' : ''}`}
                        >
                          <td className="p-1 md:p-3 align-middle flex items-center justify-between md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                              <span className="text-[10px] font-bold text-ink/40 md:hidden uppercase">Select Item</span>
                            </div>
                          </td>
                          <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                            {sortBy === 'user' ? (
                              <div className="flex flex-row md:flex-col items-center gap-1 md:gap-0.5">
                                <button onClick={() => handleReorder('collection', p.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                                <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                                <button onClick={() => handleReorder('collection', p.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === products.length - 1}><ChevronDown size={14}/></button>
                              </div>
                            ) : (
                              <div className="text-left md:text-center text-ink/20 text-xs">—</div>
                            )}
                          </td>
                          <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0">
                            {(() => {
                              const mainImg = normalizeMediaUrl(p.images?.[0] || '');
                              if (mainImg.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || mainImg.includes('video')) {
                                return <video src={mainImg} className="w-12 h-12 rounded-lg object-cover bg-black/5 shrink-0" muted preload="metadata" />;
                              }
                              return <img src={mainImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply shrink-0" nopin="nopin" data-pin-no-hover="true" />;
                            })()}
                          </td>
                          <td className="py-1 md:py-3 align-middle block md:table-cell min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 min-w-0">
                              <button 
                                type="button"
                                onClick={e => { e.stopPropagation(); toggleFeatured(p.id); }}
                                className="p-1.5 rounded-full hover:bg-black/10 transition-all cursor-pointer group/star flex items-center justify-center shrink-0"
                                title="Toggle Home Selected Works (★ Featured)"
                              >
                                <Star 
                                  size={16} 
                                  className={(homeSettings.featuredProductIds || []).includes(p.id) ? "fill-orange text-orange drop-shadow-sm" : "text-ink/20 group-hover/star:text-orange/60 transition-colors"} 
                                />
                              </button>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="font-bold text-ink group-hover:text-cobalt transition-colors truncate text-xs sm:text-sm max-w-full" title={p.name}>{p.name}</div>
                                {p.subTitle && <div className="text-[10px] text-ink/40 truncate max-w-full block" title={p.subTitle}>{p.subTitle}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0 text-center px-1">
                            <span className="text-[10px] font-semibold tracking-tight text-orange px-2.5 py-0.5 border-[1.5px] border-orange/50 rounded-full inline-block whitespace-nowrap">{p.category}</span>
                          </td>
                          <td className="py-2 md:py-3 align-middle text-center block md:table-cell shrink-0 border-t border-black/5 md:border-0 mt-1 md:mt-0" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-center items-center">
                              <button 
                                type="button" 
                                onClick={e => { e.stopPropagation(); handleDelete(p.id); }} 
                                className="p-1.5 hover:bg-orange/10 text-ink/30 hover:text-orange transition-colors rounded-none cursor-pointer" 
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
  
                    {activeTab === 'space' && [...spaces].sort((a,b) => {
                      const aIdx = (homeSettings.spaceOrder || []).indexOf(a.id);
                      const bIdx = (homeSettings.spaceOrder || []).indexOf(b.id);
                      if (aIdx === -1 && bIdx === -1) return 0;
                      if (aIdx === -1) return 1;
                      if (bIdx === -1) return -1;
                      return aIdx - bIdx;
                    }).map((s, index) => (
                      <tr 
                        key={s.id} 
                        onClick={() => handleEdit(s)}
                        className={`flex flex-col md:table-row p-3.5 md:p-0 border-b border-black/10 md:border-b-0 hover:bg-cobalt/5 group transition-all duration-200 cursor-pointer ${selectedIds.includes(s.id) ? 'bg-cobalt/5' : ''} ${editingId === s.id ? 'bg-cobalt/10 border-l-4 border-cobalt font-semibold' : ''}`}
                      >
                        <td className="p-1 md:p-3 align-middle flex items-center justify-between md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                            <span className="text-[10px] font-bold text-ink/40 md:hidden uppercase">Select Item</span>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-row md:flex-col items-center gap-1 md:gap-0.5">
                            <button onClick={() => handleReorder('space', s.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                            <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                            <button onClick={() => handleReorder('space', s.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === spaces.length - 1}><ChevronDown size={14}/></button>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0">
                          {(() => {
                            const spaceImg = normalizeMediaUrl(s.images?.[0] || '');
                            if (spaceImg.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || spaceImg.includes('video')) {
                              return <video src={spaceImg} className="w-12 h-12 rounded-lg object-cover bg-black/5 shrink-0" muted preload="metadata" />;
                            }
                            return <img src={spaceImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply shrink-0" nopin="nopin" data-pin-no-hover="true" />;
                          })()}
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0">
                            <button 
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                const updated = { ...s, featured: !s.featured };
                                updateSpace(s.id, updated).then(loadData);
                              }}
                              className="p-1.5 rounded-full hover:bg-black/10 transition-all cursor-pointer group/star flex items-center justify-center shrink-0"
                              title="Toggle Featured Star (★ Featured)"
                            >
                              <Star 
                                size={16} 
                                className={s.featured ? "fill-orange text-orange drop-shadow-sm" : "text-ink/20 group-hover/star:text-orange/60 transition-colors"} 
                              />
                            </button>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="font-bold text-ink group-hover:text-cobalt transition-colors truncate text-xs sm:text-sm max-w-full" title={s.title}>{s.title}</div>
                              <div className="text-[10px] text-ink/50 truncate max-w-full block" title={s.description}>{s.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0 text-center px-1">
                          <span className="text-[10px] font-sans font-bold text-ink/40">
                            {s.appliedProductIds && s.appliedProductIds.length > 0 
                              ? `${s.appliedProductIds.length} Products` 
                              : 'None'}
                          </span>
                        </td>
                        <td className="py-2 md:py-3 align-middle text-center block md:table-cell shrink-0 border-t border-black/5 md:border-0 mt-1 md:mt-0" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-center items-center">
                            <button 
                              type="button" 
                              onClick={e => { e.stopPropagation(); handleDelete(s.id); }} 
                              className="p-1.5 hover:bg-orange/10 text-ink/30 hover:text-orange transition-colors rounded-none cursor-pointer" 
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
  
                    {activeTab === 'journal' && [...journals].sort((a,b) => {
                      const aIdx = (homeSettings.journalOrder || []).indexOf(a.id);
                      const bIdx = (homeSettings.journalOrder || []).indexOf(b.id);
                      if (aIdx === -1 && bIdx === -1) return 0;
                      if (aIdx === -1) return 1;
                      if (bIdx === -1) return -1;
                      return aIdx - bIdx;
                    }).map((j, index) => (
                      <tr 
                        key={j.id} 
                        onClick={() => handleEdit(j)}
                        className={`flex flex-col md:table-row p-3.5 md:p-0 border-b border-black/10 md:border-b-0 hover:bg-cobalt/5 group transition-all duration-200 cursor-pointer ${selectedIds.includes(j.id) ? 'bg-cobalt/5' : ''} ${editingId === j.id ? 'bg-cobalt/10 border-l-4 border-cobalt font-semibold' : ''}`}
                      >
                        <td className="p-1 md:p-3 align-middle flex items-center justify-between md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedIds.includes(j.id)} onChange={() => toggleSelect(j.id)} />
                            <span className="text-[10px] font-bold text-ink/40 md:hidden uppercase">Select Item</span>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-row md:flex-col items-center gap-1 md:gap-0.5">
                            <button onClick={() => handleReorder('journal', j.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                            <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                            <button onClick={() => handleReorder('journal', j.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === journals.length - 1}><ChevronDown size={14}/></button>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0">
                          {(() => {
                            const journalImg = normalizeMediaUrl(j.image || '');
                            if (journalImg.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || journalImg.includes('video')) {
                              return <video src={journalImg} className="w-12 h-12 rounded-lg object-cover bg-black/5 shrink-0" muted preload="metadata" />;
                            }
                            return <img src={journalImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply shrink-0" nopin="nopin" data-pin-no-hover="true" />;
                          })()}
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0">
                            <button 
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                const updated = { ...j, featured: !j.featured };
                                updateJournal(j.id, updated).then(loadData);
                              }}
                              className="p-1.5 rounded-full hover:bg-black/10 transition-all cursor-pointer group/star flex items-center justify-center shrink-0"
                              title="Toggle Featured Star (★ Featured)"
                            >
                              <Star 
                                size={16} 
                                className={j.featured ? "fill-orange text-orange drop-shadow-sm" : "text-ink/20 group-hover/star:text-orange/60 transition-colors"} 
                              />
                            </button>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="font-bold text-ink group-hover:text-cobalt transition-colors truncate text-xs sm:text-sm max-w-full" title={j.title}>{j.title}</div>
                              <div className="text-[10px] text-ink/50 truncate max-w-full block" title={j.description}>{j.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-1 md:py-3 align-middle block md:table-cell shrink-0 text-center px-1">
                          <span className="text-[10px] font-sans font-bold text-ink/40">
                            {j.appliedProductIds && j.appliedProductIds.length > 0 
                              ? `${j.appliedProductIds.length} Products` 
                              : 'None'}
                          </span>
                        </td>
                        <td className="py-2 md:py-3 align-middle text-center block md:table-cell shrink-0 border-t border-black/5 md:border-0 mt-1 md:mt-0" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-center items-center">
                            <button 
                              type="button" 
                              onClick={e => { e.stopPropagation(); handleDelete(j.id); }} 
                              className="p-1.5 hover:bg-orange/10 text-ink/30 hover:text-orange transition-colors rounded-none cursor-pointer" 
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}
      {/* Unsaved Changes Confirmation Modal */}
      {pendingNavigation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white p-8 border-2 border-orange max-w-sm w-full mx-4 text-center shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-150 rounded-none">
            <div className="w-3 h-3 mb-4 bg-orange" />
            <h4 className="text-xs font-black uppercase tracking-widest text-ink mb-2">
              Unsaved Changes
            </h4>
            <p className="text-[10px] text-ink/60 mb-6 uppercase tracking-wider leading-relaxed">
              You have unsaved modifications.<br />
              Would you like to save them before leaving?
            </p>
            <div className="w-full flex flex-col gap-2">
              <button 
                disabled={modalSaveStatus === 'saving'}
                onClick={async () => {
                  setModalSaveStatus('saving');
                  const success = await handleSave();
                  if (success) {
                    setModalSaveStatus('saved');
                    setTimeout(() => {
                      const nav = pendingNavigation;
                      setModalSaveStatus('idle');
                      setPendingNavigation(null);
                      if (nav && nav.type === 'tab' && nav.targetTab) {
                        if (nav.targetTab === activeTab) {
                          proceedCancelEdit();
                        } else {
                          proceedTab(nav.targetTab);
                        }
                      } else if (nav && nav.type === 'edit' && nav.targetItem) {
                        proceedEdit(nav.targetItem);
                      } else if (nav && nav.type === 'url' && nav.targetUrl) {
                        navigate(nav.targetUrl);
                      }
                    }, 300);
                  } else {
                    setModalSaveStatus('idle');
                  }
                }}
                className={`py-2.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-none w-full cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  modalSaveStatus === 'saving' ? 'bg-cobalt text-white opacity-80 cursor-wait pointer-events-none' :
                  modalSaveStatus === 'saved' ? 'bg-emerald-600 text-white' :
                  'bg-cobalt text-white hover:bg-ink'
                }`}
              >
                {modalSaveStatus === 'saving' ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    <span>SAVING...</span>
                  </>
                ) : modalSaveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 size={10} />
                    <span>SAVED</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
              <button 
                disabled={modalSaveStatus === 'saving'}
                onClick={() => {
                  const nav = pendingNavigation;
                  setIsDirty(false);
                  setPendingNavigation(null);
                  if (nav && nav.type === 'tab' && nav.targetTab) {
                    if (nav.targetTab === activeTab) {
                      proceedCancelEdit();
                    } else {
                      proceedTab(nav.targetTab);
                    }
                  } else if (nav && nav.type === 'edit' && nav.targetItem) {
                    proceedEdit(nav.targetItem);
                  } else if (nav && nav.type === 'url' && nav.targetUrl) {
                    navigate(nav.targetUrl);
                  }
                }}
                className="bg-ink text-white py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-orange transition-colors rounded-none w-full cursor-pointer disabled:opacity-50"
              >
                Discard
              </button>
              <button 
                disabled={modalSaveStatus === 'saving'}
                onClick={() => {
                  setPendingNavigation(null);
                }}
                className="bg-black/5 text-ink/60 border border-black/5 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-black/10 transition-colors rounded-none w-full cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-300"
          onClick={() => setToast(null)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className={`p-8 bg-white border-2 rounded-none shadow-2xl flex flex-col items-center text-center max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200 ${
              toast.type === 'success' ? 'border-cobalt' :
              toast.type === 'error' ? 'border-orange' :
              'border-ink'
            }`}
          >
            <div className={`w-3 h-3 mb-4 rounded-none ${
              toast.type === 'success' ? 'bg-cobalt' :
              toast.type === 'error' ? 'bg-orange' :
              'bg-ink'
            }`} />
            <h4 className="text-sm font-black uppercase tracking-widest text-ink mb-2">
              {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Notification'}
            </h4>
            <p className="text-xs text-ink/60 mb-6 uppercase tracking-wider">{toast.message}</p>
            <button 
              onClick={() => setToast(null)}
              className="bg-ink text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-cobalt transition-colors rounded-none w-full"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Left Dock: Circular SAVE Button & Circular VIEW Button */}
      {(() => {
        const targetViewUrl = editingId 
          ? (activeTab === 'collection' ? `/product/${editingId}` : activeTab === 'space' ? `/space/${editingId}` : activeTab === 'journal' ? `/journal/${editingId}` : '/')
          : (activeTab === 'home' ? '/' : activeTab === 'collection' ? '/collection' : activeTab === 'space' ? '/space' : activeTab === 'journal' ? '/journal' : '/');

        return (
          <div className="fixed bottom-6 left-6 z-[150] flex items-center gap-3 select-none">
            {/* Save Button */}
            <button
              type="button"
              onClick={(e) => handleSave(e)}
              disabled={saveStatus === 'saving'}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                saveStatus === 'saving'
                  ? 'bg-cobalt text-white opacity-90 scale-95 pointer-events-none'
                  : saveStatus === 'saved'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-ink hover:bg-cobalt text-white hover:scale-105 active:scale-95'
              }`}
              title="Quick Save Content"
            >
              {saveStatus === 'saving' ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 size={16} />
                  <span className="text-[7.5px] font-black uppercase tracking-wider mt-0.5 font-mono">SAVED</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span className="text-[8px] font-black uppercase tracking-wider mt-0.5 font-mono">SAVE</span>
                </>
              )}
            </button>

            {/* View Page Return Button with Unsaved Changes Interception */}
            <button
              type="button"
              onClick={() => {
                if (isDirty) {
                  setPendingNavigation({ type: 'url', targetUrl: targetViewUrl });
                } else {
                  navigate(targetViewUrl);
                }
              }}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-2xl bg-white hover:bg-off-white text-ink border-2 border-black/15 hover:border-cobalt hover:text-cobalt flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group/viewbtn"
              title="Return to Page View (페이지 뷰로 돌아가기)"
            >
              <RotateCcw size={16} className="text-current group-hover/viewbtn:-rotate-45 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-wider mt-0.5 font-mono">VIEW</span>
            </button>
          </div>
        );
      })()}

      {/* Visual Hotspot Pin Editor Modal */}
      {hotspotEditorTarget && (
        <AdminHotspotEditor
          isOpen={true}
          onClose={() => setHotspotEditorTarget(null)}
          imageSrc={hotspotEditorTarget.imageSrc}
          title={hotspotEditorTarget.title}
          hotspots={hotspotEditorTarget.hotspots}
          onSaveHotspots={hotspotEditorTarget.onSave}
          products={products}
          initialAspectMode={hotspotEditorTarget.initialAspectMode}
        />
      )}
    </div>
  );
}
