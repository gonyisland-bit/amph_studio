import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  getProducts, Product, deleteProduct, updateProduct, addProduct, Category, ContentBlock,
  getJournals, JournalArticle, deleteJournal, updateJournal, addJournal,
  getSpaces, SpaceModel, deleteSpace, updateSpace, addSpace,
  HomeSettings, getHomeSettings, updateHomeSettings, defaultHomeSettings, deleteBlob, generateProductCode, defaultColorAssets, MagazineCard
} from "../lib/data";
import { Plus, Trash2, Copy, LogOut, CheckCircle2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Star, Lock } from "lucide-react";
import { MediaRenderer, normalizeMediaUrl } from "../components/MediaRenderer";

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
  title: '', description: '', images: [''], appliedProductIds: [], contentBlocks: [
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
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full border border-black/10 rounded-none p-3 bg-white outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt/20 text-xs transition-all duration-300 shadow-sm resize-none overflow-hidden"
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
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
  label 
}: { 
  value?: string, 
  onChange: (val: string) => void, 
  onBatchUpload?: (urls: string[]) => void,
  label?: string 
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

  const isExternalUrl = value && !value.includes('blob.vercel-storage.com');
  const [showUrl, setShowUrl] = useState(!!isExternalUrl);

  useEffect(() => {
    if (isExternalUrl) {
      setShowUrl(true);
    }
  }, [value]);

  return (
    <div className="w-full mb-4">
      {label && <label className="block text-[10px] font-bold uppercase text-ink/50 mb-2">{label}</label>}
      <div 
        className={`relative border-2 border-dashed rounded-none flex flex-col items-center justify-center p-4 transition-colors cursor-pointer min-h-[120px] overflow-hidden ${dragActive ? 'border-cobalt bg-cobalt/5' : 'border-black/20 bg-black/5 hover:bg-black/10'}`}
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
           <div className="text-orange text-xs animate-pulse font-bold">Uploading...</div>
        ) : value ? (
           <div className="relative group/preview w-full flex justify-center">
             {isVideo ? (
               <video src={normalizeMediaUrl(value)} className="h-24 w-auto object-contain rounded-none" muted preload="metadata" />
             ) : (
               <img src={normalizeMediaUrl(value)} alt="Preview" className="h-24 w-auto object-contain mix-blend-multiply" nopin="nopin" data-pin-no-hover="true" />
             )}
             <button 
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Delete this media from server?')) {
                  await deleteBlob(value);
                  onChange('');
                }
              }}
              className="remove-btn absolute -top-2 -right-2 bg-orange text-white w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-bold shadow-md hover:scale-110 transition-transform z-10"
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
  const [previewAspects, setPreviewAspects] = useState<Record<string, 'portrait' | 'landscape'>>({});

  // Unsaved changes tracking states
  const [isDirty, setIsDirty] = useState(false);
  const [originalForm, setOriginalForm] = useState<any>(null);
  const [originalHomeSettings, setOriginalHomeSettings] = useState<any>(null);
  const [pendingNavigation, setPendingNavigation] = useState<{
    type: 'tab' | 'edit' | 'router';
    targetTab?: 'home'|'journal'|'space'|'collection'|'colorAssets'|'orders'|'users';
    targetItem?: any;
  } | null>(null);

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

  // Monitor form input changes to set dirty state
  useEffect(() => {
    if (!originalForm) {
      setIsDirty(false);
      return;
    }
    const currentStr = JSON.stringify(form);
    const originalStr = JSON.stringify(originalForm);
    if (currentStr !== originalStr) {
      setIsDirty(true);
      if (saveStatus === 'saved') {
        setSaveStatus('idle');
      }
    } else {
      setIsDirty(false);
    }
  }, [form, originalForm]);

  // Monitor home settings changes
  useEffect(() => {
    if (!originalHomeSettings) {
      setIsDirty(false);
      return;
    }
    const currentStr = JSON.stringify(homeSettings);
    const originalStr = JSON.stringify(originalHomeSettings);
    if (currentStr !== originalStr) {
      setIsDirty(true);
      if (saveStatus === 'saved') {
        setSaveStatus('idle');
      }
    } else {
      setIsDirty(false);
    }
  }, [homeSettings, originalHomeSettings]);


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

  useEffect(() => {
    if (activeTab === 'collection' && form) {
      let parsedColors: any[] = [];
      if (form.color) {
        if (Array.isArray(form.color)) {
          parsedColors = form.color;
        } else if (typeof form.color === 'string') {
          if (form.color.trim().startsWith('[')) {
            try {
              parsedColors = JSON.parse(form.color);
            } catch (e) {
              parsedColors = form.color.split(',').map(c => ({ name: c.trim(), hex: '#888888' }));
            }
          } else {
            parsedColors = form.color.split(',').map(c => ({ name: c.trim(), hex: '#888888' }));
          }
        }
      }
      setColorOptions(parsedColors);
    } else {
      setColorOptions([]);
    }
  }, [form?.id, form?.color, activeTab]);

  const handleAddColorOption = () => {
    if (!newColorName.trim()) {
      showToast("Please enter a color name.", "error");
      return;
    }
    const colorNameTrimmed = newColorName.trim();
    const exists = colorOptions.some(c => c.name.toLowerCase() === colorNameTrimmed.toLowerCase());
    if (exists) {
      showToast("Color name already added to this product.", "error");
      return;
    }
    const newColorItem = { name: colorNameTrimmed, hex: newColorHex };
    const updated = [...colorOptions, newColorItem];
    setColorOptions(updated);
    setForm((prev: any) => ({ ...prev, color: updated }));

    // Global Asset auto-registration and instant backend save
    const currentAssets = homeSettings.colorAssets || defaultColorAssets;
    const globalExists = currentAssets.some(c => c.name.toLowerCase() === colorNameTrimmed.toLowerCase());
    if (!globalExists) {
      const updatedAssets = [...currentAssets, newColorItem];
      const nextSettings = { ...homeSettings, colorAssets: updatedAssets };
      setHomeSettings(nextSettings);
      updateHomeSettings(nextSettings)
        .then(() => setOriginalHomeSettings(JSON.parse(JSON.stringify(nextSettings))))
        .catch(console.error);
      showToast(`Added '${colorNameTrimmed}' to Product & Global Assets Library!`, "success");
    } else {
      showToast(`Added '${colorNameTrimmed}' to Product option!`, "success");
    }

    setNewColorName("");
  };

  const handleSelectGlobalAsset = (asset: { name: string, hex: string }) => {
    const exists = colorOptions.some(c => c.name.toLowerCase() === asset.name.toLowerCase());
    if (exists) return;
    const updated = [...colorOptions, asset];
    setColorOptions(updated);
    setForm((prev: any) => ({ ...prev, color: updated }));
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

  // Sync editing item with ?edit= query parameter (Initial load only)
  useEffect(() => {
    if (!isAuthenticated || editingId) return;
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    const tabParam = params.get('tab');

    if (editId) {
      if ((!tabParam || tabParam === 'collection') && products.length > 0) {
        const found = products.find(p => p.id === editId);
        if (found) {
          setEditingId(found.id);
          const cloned = JSON.parse(JSON.stringify(found));
          const autoSpaces = spaces.filter(s => s.appliedProductIds?.includes(found.id)).map(s => s.id);
          const autoJournals = journals.filter(j => j.appliedProductIds?.includes(found.id)).map(j => j.id);
          cloned.relatedSpaceIds = Array.from(new Set([...(cloned.relatedSpaceIds || []), ...autoSpaces]));
          cloned.relatedJournalIds = Array.from(new Set([...(cloned.relatedJournalIds || []), ...autoJournals]));
          setForm(cloned);
          setOriginalForm(JSON.parse(JSON.stringify(cloned)));
          setActiveSections({ basic: true, specs: false, options: false, media: false, story: false });
        }
      } else if (tabParam === 'space' && spaces.length > 0) {
        const found = spaces.find(s => s.id === editId);
        if (found) {
          setEditingId(found.id);
          const cloned = JSON.parse(JSON.stringify(found));
          setForm(cloned);
          setOriginalForm(JSON.parse(JSON.stringify(cloned)));
        }
      } else if (tabParam === 'journal' && journals.length > 0) {
        const found = journals.find(j => j.id === editId);
        if (found) {
          setEditingId(found.id);
          const cloned = JSON.parse(JSON.stringify(found));
          setForm(cloned);
          setOriginalForm(JSON.parse(JSON.stringify(cloned)));
        }
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
    setForm(empty);
    setOriginalForm(JSON.parse(JSON.stringify(empty)));
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
        const cleanedForm = { ...form, images: cleanedImages, color: colorOptions };
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
        if (editingId) {
          await updateJournal(editingId, form);
          savedData = form;
        } else {
          const newId = `j-${Date.now()}`;
          const newJournal = { ...form, id: newId };
          await addJournal(newJournal);
          setEditingId(newId);
          savedData = newJournal;
        }

        // Bi-directional cross-save to Products
        const journalId = savedData.id;
        const currentAppliedProds: string[] = form.appliedProductIds || [];
        for (const p of products) {
          const hasJournal = p.relatedJournalIds?.includes(journalId);
          const shouldHaveJournal = currentAppliedProds.includes(p.id);
          if (shouldHaveJournal && !hasJournal) {
            await updateProduct(p.id, { ...p, relatedJournalIds: [...(p.relatedJournalIds || []), journalId] });
          } else if (!shouldHaveJournal && hasJournal) {
            await updateProduct(p.id, { ...p, relatedJournalIds: (p.relatedJournalIds || []).filter(id => id !== journalId) });
          }
        }
      } else if (activeTab === 'space') {
        let cleanedImages = (form.images || []).filter(Boolean);
        if (form.image) {
          cleanedImages = [form.image, ...cleanedImages.filter((x: string) => x !== form.image)];
        }
        const heroImg = form.image || cleanedImages[0] || '';
        const cleanedForm = { ...form, image: heroImg, images: cleanedImages };
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

        // Bi-directional cross-save to Products
        const spaceId = savedData.id;
        const currentAppliedProds: string[] = cleanedForm.appliedProductIds || [];
        for (const p of products) {
          const hasSpace = p.relatedSpaceIds?.includes(spaceId);
          const shouldHaveSpace = currentAppliedProds.includes(p.id);
          if (shouldHaveSpace && !hasSpace) {
            await updateProduct(p.id, { ...p, relatedSpaceIds: [...(p.relatedSpaceIds || []), spaceId] });
          } else if (!shouldHaveSpace && hasSpace) {
            await updateProduct(p.id, { ...p, relatedSpaceIds: (p.relatedSpaceIds || []).filter(id => id !== spaceId) });
          }
        }
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
    setForm(cloned);
    setOriginalForm(JSON.parse(JSON.stringify(cloned)));
    setIsDirty(false);
    setSaveStatus('idle');
    setActiveSections({ basic: true, specs: false, options: false, media: false, story: false });
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
    const moveBlock = (fromIndex: number, toIndex: number) => {
      setForm(prev => {
        const blocks = [...(prev.contentBlocks || [])];
        if (toIndex < 0 || toIndex >= blocks.length) return prev;
        const [moved] = blocks.splice(fromIndex, 1);
        blocks.splice(toIndex, 0, moved);
        
        // Auto sync hero cover for Space and Journal if first block changed
        const newForm: any = { ...prev, contentBlocks: blocks };
        if (activeTab !== 'collection') {
          const mediaBlocks = blocks.filter(b => (b.type === 'image' || !b.type) && b.value);
          if (mediaBlocks.length > 0 && (!prev.image || !mediaBlocks.some(b => b.value === prev.image))) {
            const firstMedia = mediaBlocks[0].value;
            const currentImages = (prev.images || []).filter((x: string) => x !== firstMedia);
            newForm.image = firstMedia;
            newForm.images = [firstMedia, ...currentImages];
          }
        }
        return newForm;
      });
    };

    // Ensure all blocks have unique IDs
    const contentBlocksWithIds = (form.contentBlocks || []).map((cb: ContentBlock, idx: number) => ({
      ...cb,
      id: cb.id || `block-${idx}-${Math.random().toString(36).substring(2, 9)}`
    }));

    return (
      <div className="mb-4 space-y-4">
        <div className="flex justify-between items-center border-b border-black/5 pb-2">
          <label className="block text-[10px] font-bold uppercase text-ink/60 tracking-wider">Editorial Story Blocks</label>
          <span className="text-[9px] text-ink/40 font-medium">Reorder, Image & Text Blocks</span>
        </div>
        {contentBlocksWithIds.map((cb: ContentBlock & { id: string }, i: number) => (
          <div key={cb.id} className="flex flex-col gap-3 mb-3 bg-black/[0.02] border border-black/5 p-3 rounded-none">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-ink/40">#{i + 1}</span>
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
                  className="border border-black/15 bg-white p-1 text-[10px] uppercase font-bold text-ink outline-none rounded-none"
                >
                  <option value="image">Media / Image / Video (이미지/영상)</option>
                  <option value="text">Text Only (텍스트)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 border-r border-black/10 pr-3">
                  <button 
                    type="button" 
                    disabled={i === 0} 
                    onClick={() => moveBlock(i, i - 1)} 
                    className="p-1 hover:bg-black/10 disabled:opacity-20 text-ink/60 hover:text-ink cursor-pointer rounded-none transition-colors" 
                    title="Move Up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    type="button" 
                    disabled={i === contentBlocksWithIds.length - 1} 
                    onClick={() => moveBlock(i, i + 1)} 
                    className="p-1 hover:bg-black/10 disabled:opacity-20 text-ink/60 hover:text-ink cursor-pointer rounded-none transition-colors" 
                    title="Move Down"
                  >
                    <ChevronDown size={14} />
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
                  className="text-orange text-[10px] font-bold uppercase tracking-wider hover:underline"
                >
                  Remove Block
                </button>
              </div>
            </div>
          {(cb.type === 'image' || !cb.type) ? (
            <div className="space-y-2">
              <MediaUploadInput 
                label="Editorial Media (Image or Video)" 
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
                    // For Space and Journal: Preserve Hero Cover designation property if replaced image was Hero Cover
                    if (activeTab !== 'collection') {
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
                <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">Image Below Text / Caption (선택사항)</label>
                <textarea 
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
                  className="w-full border border-black/15 bg-white p-2 text-xs outline-none rounded-none font-sans" 
                  placeholder="Enter text to display below this image (optional)..." 
                  rows={2}
                />
              </div>
              {cb.value && (
                <div className="pt-2 border-t border-black/5 flex items-center justify-between">
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
                      {form.image === cb.value ? "✓ Hero Cover (히어로 커버 지정됨)" : "Set as Hero Cover (히어로 커버 지정)"}
                    </span>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">Text Content</label>
              <textarea 
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
                className="w-full border border-black/15 bg-white p-2 text-xs outline-none rounded-none font-sans" 
                placeholder="Text Content" 
                rows={3}
              />
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <button 
          type="button" 
          onClick={() => {
            const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            setForm(prev => ({
              ...prev,
              contentBlocks: [...(prev.contentBlocks || []), { id: newBlockId, type: 'image', value: '', caption: '' }]
            }));
          }} 
          className="flex-1 py-2.5 bg-cobalt/5 hover:bg-cobalt text-cobalt hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors border border-cobalt/20 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus size={12} /> Add Media Block (미디어 추가)
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
          className="flex-1 py-2.5 bg-black/5 hover:bg-ink text-ink hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors border border-black/10 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus size={12} /> Add Text Block (텍스트 추가)
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

          {/* Color Assets Grid Manager */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {(homeSettings.colorAssets || defaultColorAssets).map((asset, idx) => {
              const usageCount = products.filter(p => {
                if (!p.color) return false;
                if (Array.isArray(p.color)) {
                  return p.color.some(c => (typeof c === 'string' ? c : c.name).toLowerCase() === asset.name.toLowerCase());
                }
                return p.color.toLowerCase().includes(asset.name.toLowerCase());
              }).length;

              return (
                <div key={`${asset.name}-${idx}`} className="bg-white border border-black/10 p-4 shadow-sm flex flex-col justify-between group hover:border-cobalt transition-all rounded-none">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-8 h-8 rounded-full border border-black/20 shadow-inner flex-shrink-0"
                        style={{ backgroundColor: asset.hex || '#000000' }}
                        title={asset.name}
                      />
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

                    <input
                      type="text"
                      value={asset.name}
                      onChange={e => {
                        const val = e.target.value;
                        const current = [...(homeSettings.colorAssets || defaultColorAssets)];
                        current[idx] = { ...current[idx], name: val };
                        setHomeSettings({ ...homeSettings, colorAssets: current });
                      }}
                      className="w-full font-black text-xs uppercase text-ink border-b border-transparent focus:border-cobalt outline-none bg-transparent mb-1"
                    />
                    
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
                        className="w-4 h-4 rounded-full border-none cursor-pointer bg-transparent p-0"
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
                        className="font-mono text-[10px] text-ink/50 uppercase border-b border-transparent focus:border-cobalt outline-none bg-transparent w-full"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[9px]">
                    <span className="font-mono text-ink/40">USAGE</span>
                    <span className="font-bold text-cobalt bg-cobalt/10 px-2 py-0.5 rounded-full">
                      {usageCount} {usageCount === 1 ? 'Product' : 'Products'}
                    </span>
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
              <h2 className="text-xl font-semibold mb-6 flex items-center justify-between border-b border-black/10 pb-4">
                <span>{editingId ? 'Edit Content' : 'Add Content'}</span>
                {activeTab !== 'home' && (
                  <div className="flex items-center gap-2">
                    {/* 바로가기 (Go to Page) 버튼 */}
                    {(() => {
                      const pageUrl = editingId 
                        ? (activeTab === 'collection' ? `/product/${editingId}` : activeTab === 'space' ? `/space/${editingId}` : activeTab === 'journal' ? `/journal/${editingId}` : null)
                        : null;
                      
                      if (pageUrl) {
                        return (
                          <Link 
                            to={pageUrl} 
                            target="_blank"
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

                    {/* Save 버튼 — form 바깥이므로 form="editor-form" 속성으로 연결 */}
                    <button 
                      type="submit"
                      form="editor-form"
                      disabled={saveStatus === 'saving'}
                      className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-none cursor-pointer ${
                        saveStatus === 'saving' ? 'bg-black/10 text-ink/30 cursor-not-allowed' :
                        saveStatus === 'saved' ? 'bg-[#ff0000] text-white hover:bg-[#d60000]' :
                        'bg-cobalt text-white hover:bg-ink'
                      }`}
                    >
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
                    </button>

                    {editingId && (
                      <button 
                        type="button"
                        onClick={handleCancelEdit} 
                        className="text-[9px] uppercase font-bold text-orange hover:underline ml-1"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </h2>
              <form id="editor-form" key={editingId || 'new'} onSubmit={handleSave} className="space-y-4 text-sm">
                <fieldset disabled={saveStatus === 'saving'} className="space-y-4 w-full border-none p-0 m-0">
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

                  {/* Hero Slides */}
                  <div className="bg-black/5 p-6 rounded-none border border-black/5">
                    <h3 className="font-bold text-xs uppercase text-cobalt mb-6 flex items-center justify-between">
                      <span>Hero Slides</span>
                      <button type="button" onClick={() => {
                        const newSlides = [...(homeSettings.heroSlides || []), { id: Date.now().toString(), title: '', subtitle: '', image: '' }];
                        setHomeSettings({...homeSettings, heroSlides: newSlides});
                      }} className="bg-ink text-white px-3.5 py-1.5 rounded-none text-[9px] font-black uppercase tracking-wider hover:bg-cobalt transition-colors cursor-pointer">+ Add Slide</button>
                    </h3>
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

                  {/* Category Intros */}
                  <div className="bg-black/5 p-3.5 sm:p-6 md:p-8 rounded-none border border-black/5 shadow-sm min-w-0 w-full max-w-full overflow-hidden">
                    <h3 className="font-bold text-xs uppercase text-cobalt mb-6">Category Banners</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(['collection', 'space', 'journal'] as const).map(cat => (
                        <div key={cat} className="p-4 bg-white rounded-none border border-black/5 shadow-sm space-y-4">
                          <span className="text-[10px] font-black uppercase text-orange">{cat} Intro</span>
                          <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                            <input value={homeSettings.intros?.[cat]?.title || ''} onChange={e => {
                              const next = { ...(homeSettings.intros || {}) };
                              next[cat] = { ...next[cat], title: e.target.value };
                              setHomeSettings({...homeSettings, intros: next as any});
                            }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" /></div>
                          <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                            <textarea value={homeSettings.intros?.[cat]?.description || ''} onChange={e => {
                              const next = { ...(homeSettings.intros || {}) };
                              next[cat] = { ...next[cat], description: e.target.value };
                              setHomeSettings({...homeSettings, intros: next as any});
                            }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" rows={2} /></div>
                          <MediaUploadInput label="Banner Media" value={homeSettings.intros?.[cat]?.image || ''} onChange={val => {
                            const next = { ...(homeSettings.intros || {}) };
                            next[cat] = { ...next[cat], image: val };
                            setHomeSettings({...homeSettings, intros: next as any});
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

                    return (
                      <>
                        {/* Featured Products (Selected Works Order & Selection Manager with Interleaved Magazine Cards) */}
                        <div className="bg-black/5 p-3.5 sm:p-6 md:p-8 rounded-none border border-black/5 shadow-sm space-y-6 min-w-0 w-full max-w-full overflow-hidden">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-xs uppercase text-cobalt flex items-center gap-2">
                              <span>Selected Works Order & Selection (홈 추천 제품 및 매거진 카드 배치 미리보기)</span>
                            </h3>
                            <span className="text-[10px] font-black text-cobalt bg-cobalt/10 px-2.5 py-1 rounded-full uppercase">
                              {homeSettings.featuredProductIds.length} Products / {effectiveMagCards.length} Magazine Cards
                            </span>
                          </div>

                          {/* Active Order Manager (Chosen items + Magazine cards interleaved) */}
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

                          {/* Checkbox grid for adding/removing items */}
                          <div>
                            <h4 className="text-[10px] font-black uppercase text-ink/60 tracking-wider mb-3">
                              Toggle Products to Add/Remove
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[350px] overflow-y-auto p-4 bg-white rounded-none border border-black/10 shadow-inner">
                              {products.map(p => {
                                const isSelected = homeSettings.featuredProductIds.includes(p.id);
                                return (
                                  <label key={p.id} className={`flex items-center gap-3 p-3 rounded-none border transition-all cursor-pointer ${isSelected ? 'bg-cobalt/5 border-cobalt shadow-xs' : 'bg-transparent border-black/10 hover:border-black/30'}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isSelected} 
                                      onChange={(e) => {
                                        const current = homeSettings.featuredProductIds || [];
                                        const next = e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id);
                                        setHomeSettings({...homeSettings, featuredProductIds: next});
                                      }}
                                      className="w-4 h-4 rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                                    />
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                      <MediaRenderer src={p.images[0]} className="w-8 h-8 rounded-none object-cover mix-blend-multiply flex-shrink-0 border border-black/5" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black uppercase truncate">{p.name}</span>
                                        <span className="text-[9px] text-ink/40 uppercase truncate">{p.category}</span>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Unlimited Magazine Cards Manager */}
                        <div className="bg-black/5 p-3.5 sm:p-6 md:p-8 rounded-none border border-black/5 shadow-sm space-y-6 min-w-0 w-full max-w-full overflow-hidden">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-xs uppercase text-cobalt flex items-center gap-2">
                                <span>Magazine Cards (Home Grid Interleaving)</span>
                              </h3>
                              <p className="text-[10px] text-ink/50 mt-1 font-sans">
                                매거진 카드를 제한 없이 추가하고, Selected Works 제품 몇 번째 뒤에 끼워 노출할지 배치 위치를 자유롭게 지정합니다. (선택된 제품 수: {homeSettings.featuredProductIds.length}개)
                              </p>
                            </div>
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
                              }}
                              className="bg-ink text-white px-4 py-2 font-black uppercase text-[10px] tracking-wider hover:bg-cobalt transition-colors cursor-pointer rounded-none"
                            >
                              + Add Magazine Card
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {effectiveMagCards.map((card, idx) => {
                              const dimMode = (card.overlayMode || 'DARK').toUpperCase();
                              const isLightMode = dimMode === 'LIGHT';

                              return (
                                <div key={card.id || idx} className="p-3.5 bg-white rounded-none border border-black/10 shadow-xs space-y-3 relative group">
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

                                  {/* 4:5 Aspect Ratio Integrated Media Drag & Live Card Simulator (4:5 일체형 렌더링 시뮬레이터) */}
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <label className="block text-[9px] font-black uppercase text-cobalt tracking-wider">
                                        4:5 Cover Media & Live Simulator (미디어 드래그 & 라이브 시뮬레이터)
                                      </label>
                                      <span className="text-[8px] text-ink/40 font-bold uppercase">4:5 Aspect Ratio</span>
                                    </div>
                                    <div 
                                      className="aspect-[4/5] w-full p-4 relative overflow-hidden border border-black/20 flex flex-col justify-between shadow-inner group/sim"
                                      style={{ backgroundColor: card.bgColor || '#1c1c1c' }}
                                    >
                                      {/* Background Image & Dimming Overlay (DARK, LIGHT, OFF) */}
                                      {card.image && (
                                        <div className="absolute inset-0 w-full h-full z-0">
                                          <MediaRenderer src={card.image} alt="Cover Preview" className="w-full h-full object-cover" />
                                          {dimMode === 'DARK' && <div className="absolute inset-0 bg-black/60" />}
                                          {dimMode === 'LIGHT' && <div className="absolute inset-0 bg-white/80" />}
                                        </div>
                                      )}

                                      {/* Actual Font Shape Simulator Overlay (실제 피드와 동일한 대형 볼드 타이틀 폰트) */}
                                      <div className="relative z-10 flex flex-col justify-between h-full min-h-0 pointer-events-none">
                                        <span className={`text-[8.5px] uppercase tracking-[0.2em] font-black block truncate ${
                                          isLightMode ? 'text-ink/60' : 'text-white/60'
                                        }`}>
                                          {card.title || 'CARD TITLE PREVIEW'}
                                        </span>
                                        <div className="my-auto overflow-hidden py-1">
                                          <p className={`text-base sm:text-lg md:text-xl font-sans font-black uppercase tracking-tighter leading-[1.05] break-words line-clamp-4 ${
                                            isLightMode ? 'text-ink' : 'text-white'
                                          }`}>
                                            "{card.quote || 'DESIGN PHILOSOPHY CONTENT'}"
                                          </p>
                                        </div>
                                        <span className={`text-[8px] uppercase tracking-widest font-bold block truncate ${
                                          isLightMode ? 'text-ink/40' : 'text-white/40'
                                        }`}>
                                          {card.author || '// AMPH STUDIO'}
                                        </span>
                                      </div>

                                      {/* Floating Quick Media Action Overlay on hover */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/sim:opacity-100 transition-opacity z-20 flex flex-col items-center justify-center p-3 gap-2 backdrop-blur-[1px]">
                                        <span className="text-[9px] text-white font-black uppercase tracking-widest">
                                          {card.image ? 'Change Media' : 'Drag & Drop Media'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Media URL Input Controls */}
                                    <div className="mt-1.5">
                                      <MediaUploadInput
                                        label="Cover Media Image URL"
                                        value={card.image || ''}
                                        onChange={val => {
                                          const current = [...effectiveMagCards];
                                          current[idx] = { ...current[idx], image: val };
                                          setHomeSettings({ ...homeSettings, magazineCards: current });
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Insertion Position Setting */}
                                  <div className="bg-cobalt/5 p-2.5 border border-cobalt/20 space-y-1">
                                    <label className="block text-[9.5px] font-black uppercase text-cobalt">
                                      Insert Position (배치 위치 지정: Max {Math.max(1, homeSettings.featuredProductIds.length)})
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8.5px] uppercase text-ink/60 font-bold">Selected Work 제품</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={Math.max(1, homeSettings.featuredProductIds.length)}
                                        value={Math.min(card.insertAfterIndex || (idx + 1) * 2, Math.max(1, homeSettings.featuredProductIds.length))}
                                        onChange={e => {
                                          const maxVal = Math.max(1, homeSettings.featuredProductIds.length);
                                          const val = Math.min(maxVal, Math.max(1, Number(e.target.value)));
                                          const current = [...effectiveMagCards];
                                          current[idx] = { ...current[idx], insertAfterIndex: val };
                                          setHomeSettings({ ...homeSettings, magazineCards: current });
                                        }}
                                        className="w-14 border border-black/20 p-1 text-xs text-center font-bold bg-white outline-none focus:border-cobalt rounded-none text-ink"
                                      />
                                      <span className="text-[8.5px] uppercase text-ink/60 font-bold">번째 뒤에 노출</span>
                                    </div>
                                  </div>

                                  {/* Text Fields (Title, Quote, Author) */}
                                  <div className="space-y-2">
                                    <div>
                                      <label className="block text-[9px] font-bold uppercase text-ink/50 mb-0.5">Title</label>
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
                                      <label className="block text-[9px] font-bold uppercase text-ink/50 mb-0.5">Quote / Content</label>
                                      <textarea
                                        value={card.quote || ''}
                                        onChange={e => {
                                          const current = [...effectiveMagCards];
                                          current[idx] = { ...current[idx], quote: e.target.value };
                                          setHomeSettings({ ...homeSettings, magazineCards: current });
                                        }}
                                        onInput={(e: any) => {
                                          e.target.style.height = 'auto';
                                          e.target.style.height = `${e.target.scrollHeight}px`;
                                        }}
                                        className="w-full border border-black/10 p-1.5 text-xs outline-none focus:border-cobalt rounded-none bg-white font-sans resize-none overflow-hidden text-ink min-h-[60px]"
                                        rows={2}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold uppercase text-ink/50 mb-0.5">Author / Subtitle</label>
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
                                      <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1">
                                        Card Bg Color (단색 배경)
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
                                          className="w-6 h-6 border border-black/10 p-0 bg-transparent cursor-pointer flex-shrink-0"
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
                                          className="w-full border border-black/10 p-1 text-[11px] outline-none focus:border-cobalt rounded-none bg-white font-mono text-ink"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold uppercase text-ink/50 mb-1">
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
                                              <span className="block text-[9px] font-black uppercase">{opt.label}</span>
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
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'collection' && (
                <div className="space-y-6">
                  {/* Live Preview: Actual image grid matching the product detail layout */}
                  <div className="bg-black/5 rounded-none border border-black/10 overflow-hidden shadow-none">
                    {(form.images || []).filter(Boolean).length > 0 ? (
                      <div className="grid grid-cols-2 gap-px bg-black/10">
                        {(() => {
                          const originalImages = (form.images || []).filter(Boolean);
                          const portraitList = form.portraitImages || [];
                          const gridItems: Array<{ type: 'image'; src: string; isLandscape: boolean } | { type: 'blank' }> = [];
                          let col = 0;
                          
                          originalImages.forEach(img => {
                            const normImg = normalizeMediaUrl(img);
                            const normalizedPortraitList = portraitList.map(normalizeMediaUrl);
                            const isForcedPortrait = normalizedPortraitList.includes(normImg) || portraitList.includes(img);
                            const physicalAspect = previewAspects[normImg] || previewAspects[img] || (isForcedPortrait ? 'portrait' : 'landscape');
                            const isLandscape = !isForcedPortrait && physicalAspect === 'landscape';
                            
                            if (isLandscape) {
                              if (col === 1) {
                                gridItems.push({ type: 'blank' });
                                col = 0;
                              }
                              gridItems.push({ type: 'image', src: img, isLandscape: true });
                            } else {
                              gridItems.push({ type: 'image', src: img, isLandscape: false });
                              col = (col + 1) % 2;
                            }
                          });
                          
                          if (col === 1) {
                            gridItems.push({ type: 'blank' });
                          }
                          
                          return gridItems.map((item, idx) => {
                            if (item.type === 'blank') {
                              return (
                                <div key={`blank-${idx}`} className="col-span-1 aspect-[4/5] bg-white" />
                              );
                            }
                            const spanClass = item.isLandscape ? "col-span-2 aspect-[16/10]" : "col-span-1 aspect-[4/5]";
                            return (
                              <div key={`img-${idx}`} className={`${spanClass} overflow-hidden bg-silver/5 relative`}>
                                <MediaRenderer src={item.src} alt={`Preview ${idx+1}`} className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-[10px] text-ink/20 font-bold uppercase">No Media Uploaded</div>
                    )}
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

                  {/* Card: Options (Color Swatches) (Accordion) */}
                  <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => toggleSection('options')}
                      className="w-full text-left px-6 py-4 flex justify-between items-center bg-black/[0.01] hover:bg-black/[0.03] transition-colors border-b border-black/5"
                    >
                      <span className="text-xs font-black uppercase text-cobalt tracking-wider">Product Options (Colors)</span>
                      <span className="text-ink/30">{activeSections.options ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
                    </button>
                    {activeSections.options && (
                      <div className="p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 text-ink">
                        {/* Global Assets Quick Picker */}
                        <div className="bg-white p-4 border border-black/10 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-cobalt tracking-wider flex items-center gap-1">
                              ★ Global Color Assets Quick Selector
                            </span>
                            <button
                              type="button"
                              onClick={() => switchTab('colorAssets')}
                              className="text-[9px] font-black uppercase text-ink/40 hover:text-cobalt underline"
                            >
                              Manage Assets Dashboard →
                            </button>
                          </div>
                          <p className="text-[9px] text-ink/50 uppercase font-sans">Click any global asset below to instantly attach it to this product:</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {(homeSettings.colorAssets || defaultColorAssets).map((asset, aIdx) => {
                              const isAlreadyAdded = colorOptions.some(c => c.name.toLowerCase() === asset.name.toLowerCase());
                              return (
                                <button
                                  key={`${asset.name}-${aIdx}`}
                                  type="button"
                                  disabled={isAlreadyAdded}
                                  onClick={() => handleSelectGlobalAsset(asset)}
                                  className={`px-3 py-1.5 border text-[10px] font-bold uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer ${
                                    isAlreadyAdded 
                                      ? 'bg-black/5 text-ink/30 border-black/10 cursor-not-allowed opacity-50' 
                                      : 'bg-white text-ink border-black/15 hover:border-cobalt hover:text-cobalt hover:bg-cobalt/5 shadow-xs'
                                  }`}
                                  title={isAlreadyAdded ? 'Already added' : `Add ${asset.name}`}
                                >
                                  <span 
                                    className="w-3 h-3 rounded-full border border-black/20 flex-shrink-0" 
                                    style={{ backgroundColor: asset.hex || '#000000' }} 
                                  />
                                  <span>{asset.name}</span>
                                  {isAlreadyAdded && <span className="text-[8px] text-cobalt font-black">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Add Color Form */}
                        <div className="bg-off-white/50 p-4 border border-black/5 space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-ink/60 tracking-wider">Add Color Option</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                              <label className="block text-[8px] font-black uppercase text-ink/40 mb-1.5">Color Name</label>
                              <input 
                                type="text"
                                value={newColorName}
                                onChange={e => setNewColorName(e.target.value)}
                                className="w-full border-b border-black/10 focus:border-cobalt outline-none py-1.5 text-xs bg-transparent rounded-none"
                                placeholder="e.g. Cobalt Blue"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black uppercase text-ink/40 mb-1.5">Hex Color Value</label>
                              <div className="flex gap-2 items-center">
                                <input 
                                  type="color"
                                  value={newColorHex}
                                  onChange={e => setNewColorHex(e.target.value)}
                                  className="w-7 h-7 border border-black/10 p-0 bg-transparent cursor-pointer flex-shrink-0"
                                />
                                <input 
                                  type="text"
                                  value={newColorHex}
                                  onChange={e => setNewColorHex(e.target.value)}
                                  className="w-full border-b border-black/10 focus:border-cobalt outline-none py-1.5 text-xs bg-transparent rounded-none font-mono"
                                  placeholder="#0047AB"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddColorOption}
                              className="w-full bg-ink hover:bg-cobalt text-white py-2 font-bold uppercase tracking-widest text-[9px] transition-colors rounded-none cursor-pointer"
                            >
                              + Add Color
                            </button>
                          </div>
                        </div>

                        {/* Colors List (Guaranteed 3 items per row on desktop grid) */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-ink/60 tracking-wider">
                            Registered Color Options ({colorOptions.length})
                          </h4>
                          {colorOptions.length === 0 ? (
                            <p className="text-[10px] uppercase tracking-wider text-ink/40">No colors added yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                              {colorOptions.map((c, index) => (
                                <div 
                                  key={`${c.name}-${index}`} 
                                  className="relative border border-black/15 p-1.5 px-2.5 bg-white shadow-xs flex items-center gap-1.5 rounded-none group hover:border-cobalt transition-all min-w-0"
                                >
                                  {/* Delete Mini Floating Badge Button (✕) on Top-Right */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColorOption(c.name)}
                                    className="absolute -top-1.5 -right-1.5 bg-white hover:bg-orange hover:text-white text-ink/40 border border-black/20 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black shadow-xs transition-all cursor-pointer z-10"
                                    title="Remove Option"
                                  >
                                    ✕
                                  </button>

                                  {/* Compact Reorder Buttons (ChevronUp/Down) on Left side */}
                                  <div className="flex flex-col items-center justify-center shrink-0 border-r border-black/10 pr-1 py-0.2">
                                    <button 
                                      type="button"
                                      disabled={index === 0} 
                                      onClick={() => handleReorderColorOption(index, 'up')}
                                      className="text-ink/30 hover:text-cobalt disabled:opacity-20 cursor-pointer p-0 leading-none"
                                      title="Move Left/Up"
                                    >
                                      <ChevronUp size={10}/>
                                    </button>
                                    <button 
                                      type="button"
                                      disabled={index === colorOptions.length - 1} 
                                      onClick={() => handleReorderColorOption(index, 'down')}
                                      className="text-ink/30 hover:text-cobalt disabled:opacity-20 cursor-pointer p-0 leading-none"
                                      title="Move Right/Down"
                                    >
                                      <ChevronDown size={10}/>
                                    </button>
                                  </div>

                                  {/* Color swatch */}
                                  <div 
                                    className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-inner" 
                                    style={{ backgroundColor: c.hex }} 
                                  />

                                  {/* Name & Hex Code */}
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <span className="block text-[10px] sm:text-[11px] font-bold uppercase text-ink whitespace-nowrap truncate leading-tight" title={c.name}>
                                      {c.name}
                                    </span>
                                    <span className="block text-[7.5px] font-mono text-ink/40 uppercase leading-none">{c.hex}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Media Gallery (Main & Hover Images) (Accordion) */}
                  <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => toggleSection('media')}
                      className="w-full text-left px-6 py-4 flex justify-between items-center bg-black/[0.01] hover:bg-black/[0.03] transition-colors border-b border-black/5"
                    >
                      <span className="text-xs font-black uppercase text-cobalt tracking-wider">Media & Images</span>
                      <span className="text-ink/30">{activeSections.media ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</span>
                    </button>
                    {activeSections.media && (
                        <div className="p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                          {/* Primary/Main Images — 2-col grid, larger drag zones */}
                          <div>
                            <h4 className="text-[10px] font-black uppercase text-ink/60 mb-3 tracking-wider">Product Main Gallery</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {(() => {
                                const currentImages = form.images || [];
                                const displayImages = [...currentImages];
                                while (displayImages.length < 3) {
                                  displayImages.push('');
                                }
                                if (displayImages[displayImages.length - 1] !== '') {
                                  displayImages.push('');
                                }
                                return displayImages.map((img: string, i: number) => (
                                  <div key={`img-${i}`} className="relative border border-black/5 p-3 bg-black/[0.01] rounded-none">
                                    <MediaUploadInput 
                                      label={i === 0 ? "Primary" : `Image ${i+1}`} 
                                      value={img} 
                                      onChange={val => { 
                                        setForm((prev: any) => {
                                          const currentImages = (prev.images || []).filter(Boolean);
                                          const oldUrl = currentImages[i] || '';
                                          let newImages = [...currentImages];
                                          if (val === '') {
                                            newImages = newImages.filter((_, idx) => idx !== i);
                                          } else {
                                            if (i < newImages.length) {
                                              newImages[i] = val;
                                            } else {
                                              newImages.push(val);
                                            }
                                          }
                                          const compacted = newImages.filter(Boolean);

                                          let nextHover = prev.hoverImages || [];
                                          let nextPortrait = prev.portraitImages || [];
                                          if (oldUrl && val && oldUrl !== val) {
                                            nextHover = nextHover.map((url: string) => url === oldUrl ? val : url);
                                            nextPortrait = nextPortrait.map((url: string) => url === oldUrl ? val : url);
                                          }

                                          return {
                                            ...prev,
                                            images: compacted,
                                            hoverImages: nextHover,
                                            portraitImages: nextPortrait
                                          };
                                        }); 
                                      }} 
                                      onBatchUpload={urls => {
                                        setForm((prev: any) => {
                                          const currentImages = (prev.images || []).filter(Boolean);
                                          const oldUrl = currentImages[i] || '';
                                          let newImages = [...currentImages];
                                          
                                          const firstUrl = urls[0];
                                          if (i < newImages.length) {
                                            newImages[i] = firstUrl;
                                          } else {
                                            newImages.push(firstUrl);
                                          }

                                          const extraUrls = urls.slice(1);
                                          newImages = [...newImages, ...extraUrls];
                                          const compacted = newImages.filter(Boolean);

                                          let nextHover = prev.hoverImages || [];
                                          let nextPortrait = prev.portraitImages || [];
                                          if (oldUrl && firstUrl && oldUrl !== firstUrl) {
                                            nextHover = nextHover.map((url: string) => url === oldUrl ? firstUrl : url);
                                            nextPortrait = nextPortrait.map((url: string) => url === oldUrl ? firstUrl : url);
                                          }

                                          return {
                                            ...prev,
                                            images: compacted,
                                            hoverImages: nextHover,
                                            portraitImages: nextPortrait
                                          };
                                        });
                                      }}
                                    />
                                    {img && (
                                      <div className="mt-2 flex flex-col gap-2 border-t border-black/5 pt-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex gap-4">
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                              <input 
                                                type="checkbox" 
                                                checked={(form.hoverImages || []).includes(img)}
                                                onChange={e => {
                                                  if (e.target.checked) {
                                                    setForm({...form, hoverImages: [img]}); // Set as hover (only one)
                                                  } else {
                                                    setForm({...form, hoverImages: []}); // Clear if unchecked
                                                  }
                                                }}
                                                className="w-3.5 h-3.5 text-cobalt border-black/20 focus:ring-cobalt rounded-none"
                                              />
                                              <span className="text-[9px] uppercase font-bold text-ink/60">Hover Effect</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                              <input 
                                                type="checkbox" 
                                                checked={(form.portraitImages || []).includes(img)}
                                                onChange={e => {
                                                  const current = form.portraitImages || [];
                                                  const next = e.target.checked 
                                                    ? [...current, img] 
                                                    : current.filter(x => x !== img);
                                                  setForm({...form, portraitImages: next});
                                                }}
                                                className="w-3.5 h-3.5 text-cobalt border-black/20 focus:ring-cobalt rounded-none"
                                              />
                                              <span className="text-[9px] uppercase font-bold text-ink/60">Portrait View</span>
                                            </label>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button 
                                              type="button" 
                                              disabled={i === 0} 
                                              onClick={() => {
                                                const currentImages = form.images || [];
                                                const newImg = [...currentImages];
                                                [newImg[i], newImg[i - 1]] = [newImg[i - 1], newImg[i]];
                                                setForm({ ...form, images: newImg.filter(Boolean) });
                                              }}
                                              className="text-ink/30 hover:text-cobalt disabled:opacity-30 cursor-pointer p-0.5"
                                              title="Move Prev"
                                            >
                                              <ChevronLeft size={14} />
                                            </button>
                                            <button 
                                              type="button" 
                                              disabled={i >= displayImages.length - 2} 
                                              onClick={() => {
                                                const currentImages = form.images || [];
                                                const newImg = [...currentImages];
                                                [newImg[i], newImg[i + 1]] = [newImg[i + 1], newImg[i]];
                                                setForm({ ...form, images: newImg.filter(Boolean) });
                                              }}
                                              className="text-ink/30 hover:text-cobalt disabled:opacity-30 cursor-pointer p-0.5"
                                              title="Move Next"
                                            >
                                              <ChevronRight size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ));
                              })()}
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
                      <span className="text-xs font-black uppercase text-cobalt tracking-wider">Product Editorial Story</span>
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
                </>
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
          <div className="col-span-1 lg:col-span-7">
            {/* Inventory Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <div className="flex items-center gap-4 flex-wrap">
                  <h2 className="text-xl font-bold font-sans uppercase tracking-tight">
                    {activeTab === 'collection' ? 'Collection' : activeTab === 'space' ? 'Space' : 'Journal'}
                  </h2>
                  <button onClick={handleNewItem} className="flex items-center gap-2 bg-cobalt text-white px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-all">
                    <Plus size={14} /> New Item
                  </button>
                  
                  {activeTab === 'collection' && (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-none border border-black/5 shadow-sm ml-2">
                      <span className="text-[9px] font-black uppercase text-ink/40 tracking-wider">Sort By</span>
                      <select 
                        value={sortBy} 
                        onChange={e => setSortBy(e.target.value as any)}
                        className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer text-cobalt"
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
                 <div className="flex items-center gap-2 bg-black/5 p-2 rounded-none border border-black/10 animate-in fade-in slide-in-from-right-4">
                   <span className="text-[10px] font-bold px-3 border-r border-black/10">{selectedIds.length} Selected</span>
                   <button onClick={handleBulkDuplicate} className="flex items-center gap-2 hover:text-cobalt px-3 py-1 transition-colors text-[9px] font-bold uppercase"><Copy size={12}/> Duplicate</button>
                   <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-orange px-3 py-1 transition-colors text-[9px] font-bold uppercase"><Trash2 size={12}/> Delete</button>
                 </div>
               )}
            </div>
   
            <div className="overflow-x-auto md:overflow-x-visible bg-white rounded-none border border-black/5 shadow-sm min-w-0 w-full max-w-full">
              <table className="w-full text-sm text-left">
                <thead className="hidden md:table-header-group text-[10px] uppercase font-black tracking-widest text-ink/40 border-b border-black/5">
                  <tr>
                    <th className="p-4 w-10">
                      <input type="checkbox" onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = (activeTab === 'collection' || activeTab === 'home') ? products.map(p => p.id) : activeTab === 'space' ? spaces.map(s => s.id) : journals.map(j => j.id);
                          setSelectedIds(allIds);
                        } else setSelectedIds([]);
                      }} checked={selectedIds.length > 0 && selectedIds.length === ((activeTab === 'collection' || activeTab === 'home') ? products.length : activeTab === 'space' ? spaces.length : journals.length)} />
                    </th>
                    <th className="py-4">Order</th>
                    {((activeTab === 'collection' || activeTab === 'home') ? products : activeTab === 'space' ? spaces : journals).some(item => {
                      const src = (item as any).images?.[0] || (item as any).image || '';
                      return src.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || src.includes('video');
                    }) ? (
                      <th className="py-4">Media</th>
                    ) : (
                      <th className="py-4">Image</th>
                    )}
                    {activeTab === 'collection' && (
                      <>
                        <th className="py-4">Title / Subtitle</th>
                        <th className="py-4">Category</th>
                      </>
                    )}
                    {activeTab === 'journal' && (
                      <>
                        <th className="py-4">Title</th>
                        <th className="py-4">Category</th>
                      </>
                    )}
                    {activeTab === 'space' && (
                      <>
                        <th className="py-4">Title / Description</th>
                        <th className="py-4">Linked Products</th>
                      </>
                    )}
                    <th className="py-4 text-right pr-6">Actions</th>
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
                          <td className="p-1 md:p-4 flex items-center justify-between md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                              <span className="text-[10px] font-bold text-ink/40 md:hidden uppercase">Select Item</span>
                            </div>
                          </td>
                          <td className="py-1 md:py-4 block md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
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
                          <div className="flex items-center gap-3 my-1.5 md:contents min-w-0 flex-1">
                            <td className="py-1 md:py-4 block md:table-cell shrink-0">
                              {(() => {
                                const mainImg = normalizeMediaUrl(p.images?.[0] || '');
                                if (mainImg.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || mainImg.includes('video')) {
                                  return <video src={mainImg} className="w-12 h-12 rounded-lg object-cover bg-black/5 shrink-0" muted preload="metadata" />;
                                }
                                return <img src={mainImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply shrink-0" nopin="nopin" data-pin-no-hover="true" />;
                              })()}
                            </td>
                            <td className="py-1 md:py-4 block md:table-cell min-w-0 flex-1 overflow-hidden">
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
                                  {p.subTitle && <div className="text-[10px] text-ink/40 truncate max-w-[150px] sm:max-w-[220px] md:max-w-[260px] block" title={p.subTitle}>{p.subTitle}</div>}
                                </div>
                              </div>
                            </td>
                          </div>
                          <td className="py-1 md:py-4 block md:table-cell shrink-0">
                            <span className="caption-nano text-orange px-2.5 py-0.5 border border-orange/30 rounded-full font-bold inline-block">{p.category}</span>
                          </td>
                          <td className="py-2 md:py-4 text-left md:text-right pr-0 md:pr-6 block md:table-cell shrink-0 border-t border-black/5 md:border-0 mt-1 md:mt-0" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-start md:justify-end gap-3 items-center">
                              <button 
                                type="button"
                                onClick={() => handleEdit(p)} 
                                className="text-cobalt text-[10px] font-bold uppercase tracking-widest hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                              <Link 
                                to={`/product/${p.id}`} 
                                target="_blank"
                                className="text-ink/30 text-[10px] font-bold uppercase tracking-widest hover:text-ink transition-colors"
                                title="View product page"
                              >
                                <ExternalLink size={13} />
                              </Link>
                              <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }} className="text-orange/40 text-[10px] font-bold uppercase tracking-widest hover:text-orange transition-colors cursor-pointer">
                                <Trash2 size={13} />
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
                        <td className="p-1 md:p-4 flex items-center justify-between md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                            <span className="text-[10px] font-bold text-ink/40 md:hidden uppercase">Select Item</span>
                          </div>
                        </td>
                        <td className="py-1 md:py-4 block md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-row md:flex-col items-center gap-1 md:gap-0.5">
                            <button onClick={() => handleReorder('space', s.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                            <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                            <button onClick={() => handleReorder('space', s.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === spaces.length - 1}><ChevronDown size={14}/></button>
                          </div>
                        </td>
                          <div className="flex items-center gap-3 my-1.5 md:contents min-w-0 flex-1">
                            <td className="py-1 md:py-4 block md:table-cell shrink-0">
                              {(() => {
                                const spaceImg = normalizeMediaUrl(s.images?.[0] || '');
                                if (spaceImg.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || spaceImg.includes('video')) {
                                  return <video src={spaceImg} className="w-12 h-12 rounded-lg object-cover bg-black/5 shrink-0" muted preload="metadata" />;
                                }
                                return <img src={spaceImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply shrink-0" nopin="nopin" data-pin-no-hover="true" />;
                              })()}
                            </td>
                            <td className="py-1 md:py-4 block md:table-cell min-w-0 flex-1 overflow-hidden">
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
                                  <div className="text-[10px] text-ink/50 truncate max-w-[150px] sm:max-w-[220px] md:max-w-[260px] block" title={s.description}>{s.description}</div>
                                </div>
                              </div>
                            </td>
                          </div>
                        <td className="py-1 md:py-4 block md:table-cell shrink-0">
                          <span className="text-[10px] font-sans font-bold text-ink/40">
                            {s.appliedProductIds && s.appliedProductIds.length > 0 
                              ? `${s.appliedProductIds.length} Products` 
                              : 'None'}
                          </span>
                        </td>
                        <td className="py-2 md:py-4 text-left md:text-right pr-0 md:pr-6 block md:table-cell shrink-0 border-t border-black/5 md:border-0 mt-1 md:mt-0" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-start md:justify-end gap-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity items-center">
                            <Link to={`/space/${s.id}`} target="_blank" className="text-ink/20 hover:text-cobalt"><ExternalLink size={14} /></Link>
                            <button onClick={() => handleEdit(s)} className="text-cobalt text-[10px] font-bold uppercase tracking-widest hover:underline cursor-pointer">Edit</button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }} className="text-orange text-[10px] font-bold uppercase tracking-widest hover:underline cursor-pointer">Delete</button>
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
                        <td className="p-1 md:p-4 flex items-center justify-between md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedIds.includes(j.id)} onChange={() => toggleSelect(j.id)} />
                            <span className="text-[10px] font-bold text-ink/40 md:hidden uppercase">Select Item</span>
                          </div>
                        </td>
                        <td className="py-1 md:py-4 block md:table-cell shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-row md:flex-col items-center gap-1 md:gap-0.5">
                            <button onClick={() => handleReorder('journal', j.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                            <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                            <button onClick={() => handleReorder('journal', j.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === journals.length - 1}><ChevronDown size={14}/></button>
                          </div>
                        </td>
                          <div className="flex items-center gap-3 my-1.5 md:contents min-w-0 flex-1">
                            <td className="py-1 md:py-4 block md:table-cell shrink-0">
                              {(() => {
                                const journalImg = normalizeMediaUrl(j.image || '');
                                if (journalImg.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || journalImg.includes('video')) {
                                  return <video src={journalImg} className="w-12 h-12 rounded-lg object-cover bg-black/5 shrink-0" muted preload="metadata" />;
                                }
                                return <img src={journalImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply shrink-0" nopin="nopin" data-pin-no-hover="true" />;
                              })()}
                            </td>
                            <td className="py-1 md:py-4 block md:table-cell min-w-0 flex-1 overflow-hidden">
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
                                  <div className="text-[10px] text-ink/50 truncate max-w-[150px] sm:max-w-[220px] md:max-w-[260px] block" title={j.description}>{j.description}</div>
                                </div>
                              </div>
                            </td>
                          </div>
                        <td className="py-2 md:py-4 text-left md:text-right pr-0 md:pr-6 block md:table-cell shrink-0 border-t border-black/5 md:border-0 mt-1 md:mt-0" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-start md:justify-end gap-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity items-center">
                            <Link to={`/journal/${j.id}`} target="_blank" className="text-ink/20 hover:text-cobalt"><ExternalLink size={14} /></Link>
                            <button onClick={() => handleEdit(j)} className="text-cobalt text-[10px] font-bold uppercase tracking-widest hover:underline cursor-pointer">Edit</button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(j.id); }} className="text-orange text-[10px] font-bold uppercase tracking-widest hover:underline cursor-pointer">Delete</button>
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
                onClick={async () => {
                  const success = await handleSave();
                  if (success) {
                    const nav = pendingNavigation;
                    setPendingNavigation(null);
                    if (nav.type === 'tab' && nav.targetTab) {
                      if (nav.targetTab === activeTab) {
                        proceedCancelEdit();
                      } else {
                        proceedTab(nav.targetTab);
                      }
                    } else if (nav.type === 'edit' && nav.targetItem) {
                      proceedEdit(nav.targetItem);
                    }
                  }
                }}
                className="bg-cobalt text-white py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-ink transition-colors rounded-none w-full cursor-pointer"
              >
                Save & Leave
              </button>
              <button 
                onClick={() => {
                  const nav = pendingNavigation;
                  setIsDirty(false);
                  setPendingNavigation(null);
                  if (nav.type === 'tab' && nav.targetTab) {
                    if (nav.targetTab === activeTab) {
                      proceedCancelEdit();
                    } else {
                      proceedTab(nav.targetTab);
                    }
                  } else if (nav.type === 'edit' && nav.targetItem) {
                    proceedEdit(nav.targetItem);
                  }
                }}
                className="bg-ink text-white py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-orange transition-colors rounded-none w-full cursor-pointer"
              >
                Discard & Leave
              </button>
              <button 
                onClick={() => {
                  setPendingNavigation(null);
                }}
                className="bg-black/5 text-ink/60 border border-black/5 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-black/10 transition-colors rounded-none w-full cursor-pointer"
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
    </div>
  );
}
