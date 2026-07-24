import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  getProducts, Product, deleteProduct, updateProduct, addProduct, Category, ContentBlock,
  getJournals, JournalArticle, deleteJournal, updateJournal, addJournal,
  getSpaces, SpaceModel, deleteSpace, updateSpace, addSpace,
  HomeSettings, getHomeSettings, updateHomeSettings, defaultHomeSettings, deleteBlob
} from "../lib/data";
import { upload } from '@vercel/blob/client';
import { Plus, Trash2, Copy, LogOut, CheckCircle2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'Chairs', description: '', subTitle: '', material: '', price: 0, images: [''], hoverImages: [''], contentBlocks: [], color: '', dimensions: '', shipping: 'Delivery (Free)', sku: '', cartEnabled: true
};
const emptyJournal: Omit<JournalArticle, 'id'> = {
  title: '', category: '', date: '', image: '', contentBlocks: []
};
const emptySpace: Omit<SpaceModel, 'id'> = {
  title: '', description: '', images: [''], appliedProductIds: [], contentBlocks: []
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

const MediaUploadInput = ({ value = '', onChange, label }: { value?: string, onChange: (val: string) => void, label?: string }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const newBlob = await upload(uniqueName, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      onChange(newBlob.url);
    } catch (err) {
      console.error(err);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
  const onDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) await handleUpload(e.dataTransfer.files[0]); };

  const idSafeLabel = label ? label.replace(/\s+/g, '-') : Math.random().toString(36).substring(7);
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
          document.getElementById(`file-${idSafeLabel}`)?.click();
        }}
      >
        <input 
          id={`file-${idSafeLabel}`} 
          type="file" 
          accept="image/*,video/*" 
          className="hidden" 
          onChange={async (e) => { 
            if (e.target.files?.[0]) {
              await handleUpload(e.target.files[0]);
              e.target.value = '';
            }
          }} 
        />
        {uploading ? (
           <div className="text-orange text-xs animate-pulse font-bold">Uploading...</div>
        ) : value ? (
           <div className="relative group/preview w-full flex justify-center">
             {isVideo ? (
               <video src={value} className="h-24 w-auto object-contain rounded-none" muted />
             ) : (
               <img src={value} alt="Preview" className="h-24 w-auto object-contain mix-blend-multiply" nopin="nopin" data-pin-no-hover="true" />
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
  
  const [activeTab, setActiveTab] = useState<'home'|'journal'|'space'|'collection'|'orders'|'users'>('collection');
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
    targetTab?: 'home'|'journal'|'space'|'collection'|'orders'|'users';
    targetItem?: any;
  } | null>(null);

  useEffect(() => {
    if (!form) return;
    const images = (form.images || []).filter(Boolean);
    images.forEach((img: string) => {
      if (!img || previewAspects[img]) return;
      const i = new window.Image();
      i.src = img;
      i.onload = () => {
        const aspect = i.naturalWidth / i.naturalHeight;
        setPreviewAspects(prev => ({
          ...prev,
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
    const exists = colorOptions.some(c => c.name.toLowerCase() === newColorName.trim().toLowerCase());
    if (exists) {
      showToast("Color name already exists.", "error");
      return;
    }
    const updated = [...colorOptions, { name: newColorName.trim(), hex: newColorHex }];
    setColorOptions(updated);
    setForm((prev: any) => ({ ...prev, color: updated }));
    setNewColorName("");
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

  const proceedTab = (tab: 'home'|'journal'|'space'|'collection'|'orders'|'users') => {
    setActiveTab(tab);
    setEditingId(null);
    const empty = tab === 'collection' ? emptyProduct : tab === 'journal' ? emptyJournal : tab === 'space' ? emptySpace : emptyProduct;
    setForm(empty);
    setOriginalForm(JSON.parse(JSON.stringify(empty)));
    setIsDirty(false);
    setSaveStatus('idle');
  };

  const switchTab = (tab: 'home'|'journal'|'space'|'collection'|'orders'|'users') => {
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
      } else if (activeTab === 'space') {
        const cleanedImages = (form.images || []).filter(Boolean);
        const cleanedForm = { ...form, images: cleanedImages };
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

  const renderContentBlocksEditor = () => (
    <div className="mb-4 space-y-4">
      <div className="flex justify-between items-center border-b border-black/5 pb-2">
        <label className="block text-[10px] font-bold uppercase text-ink/60 tracking-wider">Product Editorial Story Blocks</label>
        <span className="text-[9px] text-ink/40 font-medium">Image + Optional Caption</span>
      </div>
      {form.contentBlocks?.map((cb: ContentBlock, i: number) => (
        <div key={i} className="flex flex-col gap-3 mb-3 bg-black/[0.02] border border-black/5 p-3 rounded-none">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold text-ink/40">#{i + 1}</span>
              <select 
                value={cb.type || 'image'} 
                onChange={e => {
                  const newCb = [...(form.contentBlocks || [])];
                  newCb[i] = { ...newCb[i], type: e.target.value as 'text'|'image' };
                  setForm({...form, contentBlocks: newCb});
                }} 
                className="border border-black/15 bg-white p-1 text-[10px] uppercase font-bold text-ink outline-none rounded-none"
              >
                <option value="image">Image (이미지)</option>
                <option value="text">Text Only (텍스트)</option>
              </select>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setForm({...form, contentBlocks: form.contentBlocks.filter((_:any, idx:number) => idx !== i)});
              }} 
              className="text-orange text-[10px] font-bold uppercase tracking-wider hover:underline"
            >
              Remove Block
            </button>
          </div>

          {(cb.type === 'image' || !cb.type) ? (
            <div className="space-y-2">
              <MediaUploadInput 
                label="Editorial Image" 
                value={cb.value} 
                onChange={val => {
                  const newCb = [...(form.contentBlocks || [])]; 
                  newCb[i] = { ...newCb[i], value: val }; 
                  setForm({...form, contentBlocks: newCb});
                }} 
              />
              <div>
                <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">Image Below Text / Caption (선택사항)</label>
                <textarea 
                  value={cb.caption || ''} 
                  onChange={e => {
                    const newCb = [...(form.contentBlocks || [])]; 
                    newCb[i] = { ...newCb[i], caption: e.target.value }; 
                    setForm({...form, contentBlocks: newCb});
                  }} 
                  className="w-full border border-black/15 bg-white p-2 text-xs outline-none rounded-none font-sans" 
                  placeholder="Enter text to display below this image (optional)..." 
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[8px] font-black uppercase text-ink/40 mb-1">Text Content</label>
              <textarea 
                value={cb.value} 
                onChange={e => {
                  const newCb = [...(form.contentBlocks || [])]; 
                  newCb[i] = { ...newCb[i], value: e.target.value }; 
                  setForm({...form, contentBlocks: newCb});
                }} 
                className="w-full border border-black/15 bg-white p-2 text-xs outline-none rounded-none font-sans" 
                placeholder="Text Content" 
                rows={3}
              />
            </div>
          )}
        </div>
      ))}
      <button 
        type="button" 
        onClick={() => setForm({...form, contentBlocks: [...(form.contentBlocks || []), { type: 'image', value: '', caption: '' }]})} 
        className="w-full py-2.5 bg-cobalt/5 hover:bg-cobalt text-cobalt hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors border border-cobalt/20 rounded-none cursor-pointer"
      >
        + Add Editorial Image Block
      </button>
    </div>
  );

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
              { id: 'journal', label: 'Journal' }
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
      
      {(activeTab === 'orders' || activeTab === 'users') ? (
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
                            const foundProd = products.find((p: any) => p.id === item.productId);
                            const shippingVal = getFormattedShipping(item.shipping || foundProd?.shipping);
                            return (
                              <Link 
                                key={idx} 
                                to={`/product/${item.productId}`} 
                                target="_blank" 
                                className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center border-b border-black/[0.05] pb-3 last:border-0 last:pb-0 hover:bg-black/[0.02] p-2 transition-colors group cursor-pointer rounded-none min-w-0 max-w-full"
                              >
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                  <div className="w-14 h-14 bg-silver/10 border border-black/10 shrink-0 overflow-hidden">
                                    {item.image ? (
                                      <img 
                                        src={item.image} 
                                        alt={item.name} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                        nopin="nopin" 
                                        data-pin-no-hover="true" 
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-silver/20 flex items-center justify-center text-[9px] text-ink/30 uppercase">No Img</div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-grow sm:hidden">
                                    <h4 className="text-xs font-bold text-ink uppercase tracking-tight truncate group-hover:text-cobalt transition-colors flex items-center gap-1">
                                      {item.name} <ExternalLink size={10} className="opacity-70 text-cobalt shrink-0" />
                                    </h4>
                                    <p className="text-[10px] uppercase tracking-wider text-ink/50 font-medium truncate">{item.category}</p>
                                  </div>
                                </div>
                                
                                <div className="flex-grow flex flex-col sm:flex-row justify-between sm:items-center min-w-0 w-full gap-2">
                                  <div className="min-w-0 hidden sm:block pr-3">
                                    <h4 className="text-xs md:text-sm font-bold text-ink uppercase tracking-tight truncate group-hover:text-cobalt transition-colors flex items-center gap-1.5">
                                      {item.name} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-cobalt shrink-0" />
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 min-w-0 w-full max-w-full overflow-x-hidden">
          <div className={activeTab === 'home' ? 'col-span-12 min-w-0 w-full max-w-full overflow-x-hidden' : 'col-span-1 lg:col-span-5 min-w-0 w-full max-w-full'}>
            <div className="sticky top-24 min-w-0 w-full max-w-full overflow-x-hidden">
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
                      className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-none ${
                        saveStatus === 'saving' ? 'bg-black/10 text-ink/30 cursor-not-allowed' :
                        saveStatus === 'saved' ? 'bg-[#ff0000] text-white hover:bg-[#d60000]' :
                        'bg-ink text-white hover:bg-cobalt'
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
                  <div className="bg-black/5 p-8 rounded-none border border-black/5 shadow-sm">
                    <h3 className="font-bold text-xs uppercase text-cobalt mb-6 flex items-center gap-2">
                      <ExternalLink size={14} /> Global Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Marquee Text</label>
                        <input value={homeSettings.marquee} onChange={e => setHomeSettings({...homeSettings, marquee: e.target.value})} className="w-full border border-black/20 p-2 bg-white outline-none focus:border-cobalt rounded-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Hero Transition Speed (sec)</label>
                        <input type="number" value={homeSettings.heroTransitionSpeed} onChange={e => setHomeSettings({...homeSettings, heroTransitionSpeed: Number(e.target.value)})} className="w-full border border-black/20 p-2 bg-white outline-none focus:border-cobalt rounded-none" />
                      </div>
                      <button type="button" onClick={async () => { setSavingSettings(true); await updateHomeSettings(homeSettings); setSavingSettings(false); showToast('Global settings saved!', 'success'); }} className="w-full bg-cobalt text-white py-3 uppercase text-[10px] font-black hover:bg-ink transition-colors rounded-none shadow-md">{savingSettings ? 'Saving...' : 'Save All Global Settings'}</button>
                    </div>
                  </div>

                  {/* Hero Slides */}
                  <div className="bg-black/5 p-6 rounded-none border border-black/5">
                    <h3 className="font-bold text-xs uppercase text-cobalt mb-6 flex items-center justify-between">
                      <span>Hero Slides</span>
                      <button type="button" onClick={() => {
                        const newSlides = [...(homeSettings.heroSlides || []), { id: Date.now().toString(), title: '', subtitle: '', image: '' }];
                        setHomeSettings({...homeSettings, heroSlides: newSlides});
                      }} className="bg-ink text-white px-3 py-1 rounded-none text-[9px]">+ Add Slide</button>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(homeSettings.heroSlides || []).map((slide, idx) => (
                        <div key={slide.id} className="p-4 bg-white rounded-none border border-black/5 shadow-sm space-y-4 relative">
                          <button type="button" onClick={() => {
                            const newSlides = (homeSettings.heroSlides || []).filter((_, i) => i !== idx);
                            setHomeSettings({...homeSettings, heroSlides: newSlides});
                          }} className="absolute top-2 right-2 text-orange hover:scale-110 transition-transform"><Trash2 size={14}/></button>
                          
                          <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title (use \n for line breaks)</label>
                            <textarea value={slide.title} onChange={e => {
                              const newSlides = [...(homeSettings.heroSlides || [])];
                              newSlides[idx] = { ...newSlides[idx], title: e.target.value };
                              setHomeSettings({...homeSettings, heroSlides: newSlides});
                            }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" rows={2} /></div>
                          
                          <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Subtitle</label>
                            <input value={slide.subtitle} onChange={e => {
                              const newSlides = [...(homeSettings.heroSlides || [])];
                              newSlides[idx] = { ...newSlides[idx], subtitle: e.target.value };
                              setHomeSettings({...homeSettings, heroSlides: newSlides});
                            }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" /></div>
                          
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
                  <div className="bg-black/5 p-8 rounded-none border border-black/5 shadow-sm">
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

                  {/* Hub Settings */}
                  <div className="bg-black/5 p-8 rounded-none border border-black/5 shadow-sm">
                    <h3 className="font-bold text-xs uppercase text-cobalt mb-6">Hub Page Settings (Landings)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(['collection', 'space', 'journal'] as const).map(hub => (
                        <div key={hub} className="p-4 bg-white rounded-none border border-black/5 shadow-sm space-y-4">
                          <span className="text-[10px] font-black uppercase text-ink/30">{hub} Hub</span>
                          <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Page Title</label>
                            <input value={homeSettings.hubSettings?.[hub]?.title || ''} onChange={e => {
                              const next = { ...(homeSettings.hubSettings || {}) };
                              next[hub] = { ...next[hub], title: e.target.value };
                              setHomeSettings({...homeSettings, hubSettings: next as any});
                            }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" /></div>
                          <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                            <textarea value={homeSettings.hubSettings?.[hub]?.description || ''} onChange={e => {
                              const next = { ...(homeSettings.hubSettings || {}) };
                              next[hub] = { ...next[hub], description: e.target.value };
                              setHomeSettings({...homeSettings, hubSettings: next as any});
                            }} className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt" rows={2} /></div>
                          <MediaUploadInput label="Header Media" value={homeSettings.hubSettings?.[hub]?.image || ''} onChange={val => {
                            const next = { ...(homeSettings.hubSettings || {}) };
                            next[hub] = { ...next[hub], image: val };
                            setHomeSettings({...homeSettings, hubSettings: next as any});
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Featured Products (Selected Works) */}
                  <div className="bg-black/5 p-8 rounded-none border border-black/5 shadow-sm">
                    <h3 className="font-bold text-xs uppercase text-cobalt mb-6 flex items-center justify-between">
                      <span>Selected Works (Home Featured)</span>
                      <span className="text-[10px] font-bold text-ink/30 uppercase">{homeSettings.featuredProductIds.length} Selected</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto p-4 bg-white rounded-none border border-black/5 shadow-inner">
                      {products.map(p => (
                        <label key={p.id} className={`flex items-center gap-3 p-3 rounded-none border transition-all cursor-pointer ${homeSettings.featuredProductIds.includes(p.id) ? 'bg-cobalt/5 border-cobalt shadow-sm' : 'bg-transparent border-black/5 hover:border-black/20'}`}>
                          <input 
                            type="checkbox" 
                            checked={homeSettings.featuredProductIds.includes(p.id)} 
                            onChange={(e) => {
                              const current = homeSettings.featuredProductIds || [];
                              const next = e.target.checked ? [...current, p.id] : current.filter(id => id !== p.id);
                              setHomeSettings({...homeSettings, featuredProductIds: next});
                            }}
                            className="w-4 h-4 rounded-none border-gray-300 text-cobalt focus:ring-cobalt"
                          />
                          <div className="flex items-center gap-3 overflow-hidden">
                            <img src={p.images[0]} className="w-8 h-8 rounded-none object-cover mix-blend-multiply flex-shrink-0" nopin="nopin" data-pin-no-hover="true" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-black uppercase truncate">{p.name}</span>
                              <span className="text-[9px] text-ink/30 uppercase truncate">{p.category}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Magazine Grid Cards */}
                  <div className="bg-black/5 p-8 rounded-none border border-black/5 shadow-sm space-y-6">
                    <h3 className="font-bold text-xs uppercase text-cobalt flex items-center justify-between">
                      <span>Magazine Cards (Home Grid)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Philosophy 1 Card */}
                      <div className="p-4 bg-white rounded-none border border-black/5 shadow-sm space-y-4">
                        <span className="text-[10px] font-black uppercase text-orange">Magazine Card 1 (Design Philosophy)</span>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                          <input 
                            value={homeSettings.philosophy1?.title || ''} 
                            onChange={e => {
                              const phil1 = { ...(homeSettings.philosophy1 || defaultHomeSettings.philosophy1 || { title: '', quote: '', author: '' }) };
                              phil1.title = e.target.value;
                              setHomeSettings({ ...homeSettings, philosophy1: phil1 });
                            }} 
                            className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Quote</label>
                          <textarea 
                            value={homeSettings.philosophy1?.quote || ''} 
                            onChange={e => {
                              const phil1 = { ...(homeSettings.philosophy1 || defaultHomeSettings.philosophy1 || { title: '', quote: '', author: '' }) };
                              phil1.quote = e.target.value;
                              setHomeSettings({ ...homeSettings, philosophy1: phil1 });
                            }} 
                            className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white" 
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Author / Subtitle</label>
                          <input 
                            value={homeSettings.philosophy1?.author || ''} 
                            onChange={e => {
                              const phil1 = { ...(homeSettings.philosophy1 || defaultHomeSettings.philosophy1 || { title: '', quote: '', author: '' }) };
                              phil1.author = e.target.value;
                              setHomeSettings({ ...homeSettings, philosophy1: phil1 });
                            }} 
                            className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white" 
                          />
                        </div>
                      </div>

                      {/* Philosophy 2 Card */}
                      <div className="p-4 bg-white rounded-none border border-black/5 shadow-sm space-y-4">
                        <span className="text-[10px] font-black uppercase text-orange">Magazine Card 2 (Materiality)</span>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                          <input 
                            value={homeSettings.philosophy2?.title || ''} 
                            onChange={e => {
                              const phil2 = { ...(homeSettings.philosophy2 || defaultHomeSettings.philosophy2 || { title: '', quote: '', author: '' }) };
                              phil2.title = e.target.value;
                              setHomeSettings({ ...homeSettings, philosophy2: phil2 });
                            }} 
                            className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Quote</label>
                          <textarea 
                            value={homeSettings.philosophy2?.quote || ''} 
                            onChange={e => {
                              const phil2 = { ...(homeSettings.philosophy2 || defaultHomeSettings.philosophy2 || { title: '', quote: '', author: '' }) };
                              phil2.quote = e.target.value;
                              setHomeSettings({ ...homeSettings, philosophy2: phil2 });
                            }} 
                            className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white" 
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Author / Subtitle</label>
                          <input 
                            value={homeSettings.philosophy2?.author || ''} 
                            onChange={e => {
                              const phil2 = { ...(homeSettings.philosophy2 || defaultHomeSettings.philosophy2 || { title: '', quote: '', author: '' }) };
                              phil2.author = e.target.value;
                              setHomeSettings({ ...homeSettings, philosophy2: phil2 });
                            }} 
                            className="w-full border border-black/10 p-2 text-xs outline-none focus:border-cobalt rounded-none bg-white" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'collection' && (
                <div className="space-y-6">
                  {/* Live Preview: Actual image grid matching the product detail layout */}
                  <div className="bg-black/5 rounded-none border border-black/10 overflow-hidden shadow-none">
                    {(form.images || []).filter(Boolean).length > 0 ? (
                      <div className="grid grid-cols-2 gap-px bg-black/10">
                        {(form.images || []).filter(Boolean).map((img: string, i: number) => {
                          const isLandscape = previewAspects[img] === 'landscape';
                          const spanClass = isLandscape ? "col-span-2 aspect-[16/10]" : "col-span-1 aspect-[4/5]";
                          return (
                            <div key={i} className={`${spanClass} overflow-hidden bg-silver/5 relative`}>
                              <img src={img} alt={`Preview ${i+1}`} className="absolute inset-0 w-full h-full object-cover" nopin="nopin" data-pin-no-hover="true" />
                            </div>
                          );
                        })}
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
                          <EditorInput label="제품 코드" value={form.sku || ''} onChange={val => setForm({...form, sku: val})} />
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

                        {/* Colors List */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-ink/60 tracking-wider">Registered Color Options</h4>
                          {colorOptions.length === 0 ? (
                            <p className="text-[10px] uppercase tracking-wider text-ink/40">No colors added yet.</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {colorOptions.map((c) => (
                                <div key={c.name} className="border border-black/5 p-3 flex items-center justify-between bg-off-white/30">
                                  <div className="flex items-center gap-2 truncate">
                                    <div 
                                      className="w-3.5 h-3.5 rounded-full border border-black/15 flex-shrink-0" 
                                      style={{ backgroundColor: c.hex }} 
                                    />
                                    <div className="truncate">
                                      <span className="block text-[9px] font-bold uppercase text-ink truncate">{c.name}</span>
                                      <span className="block text-[8px] font-mono text-ink/40 uppercase">{c.hex}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColorOption(c.name)}
                                    className="text-[9px] font-black text-orange hover:underline uppercase ml-2 flex-shrink-0"
                                  >
                                    Delete
                                  </button>
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
                                if (displayImages.length === 0 || displayImages[displayImages.length - 1] !== '') {
                                  displayImages.push('');
                                }
                                return displayImages.map((img: string, i: number) => (
                                  <div key={`img-${i}`} className="relative border border-black/5 p-3 bg-black/[0.01] rounded-none">
                                    <MediaUploadInput 
                                      label={i === 0 ? "Primary" : `Image ${i+1}`} 
                                      value={img} 
                                      onChange={val => { 
                                        let newImg = [...displayImages]; 
                                        newImg[i] = val; 
                                        if (val === '') {
                                          newImg = newImg.filter((_, idx) => idx !== i);
                                        }
                                        const compacted = newImg.filter(Boolean);
                                        setForm({...form, images: compacted}); 
                                      }} 
                                    />
                                    {img && (
                                      <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
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
                  <div className="bg-white rounded-none border border-black/5 shadow-sm overflow-hidden">
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
                </div>
              )}

              {activeTab === 'journal' && (
                <>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                    <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Category</label>
                    <input required value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Date</label>
                    <input required value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><MediaUploadInput label="Hero Media" value={form.image || ''} onChange={val => setForm({...form, image: val})} /></div>
                  {renderContentBlocksEditor()}
                </>
              )}

              {activeTab === 'space' && (
                <>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Space Title</label>
                    <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                    <textarea required value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={4}/></div>
                  {renderContentBlocksEditor()}

                  <div className="border-t border-black/10 pt-4 mt-4">
                    <h3 className="font-bold text-[10px] uppercase mb-4 text-cobalt">Gallery Images</h3>
                    {(() => {
                      const currentImages = form.images || [];
                      const displayImages = [...currentImages];
                      if (displayImages.length === 0 || displayImages[displayImages.length - 1] !== '') {
                        displayImages.push('');
                      }
                      return displayImages.map((img: string, i: number) => (
                        <div key={i} className="mb-2 bg-black/[0.01] border border-black/5 p-3 rounded-none">
                          <MediaUploadInput 
                            label={i === 0 ? "Main" : `Media ${i+1}`} 
                            value={img} 
                            onChange={val => { 
                              let newI = [...displayImages]; 
                              newI[i] = val; 
                              if (val === '') {
                                newI = newI.filter((_, idx) => idx !== i);
                              }
                              const compacted = newI.filter(Boolean);
                              setForm({...form, images: compacted}); 
                            }} 
                          />
                          {img && (
                            <div className="mt-2 flex items-center justify-end border-t border-black/5 pt-2">
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
                          )}
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="border-t border-black/10 pt-4 mt-4">
                    <h3 className="font-bold text-[10px] uppercase mb-4 text-cobalt">Amplify with (Linked Products)</h3>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-black/10 p-4 bg-black/5 rounded-none">
                      {products.map(p => (
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
                      ))}
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
   
            <div className="overflow-x-auto bg-white rounded-none border border-black/5 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase font-black tracking-widest text-ink/40 border-b border-black/5">
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
                <tbody className="divide-y divide-black/5">
                    {(activeTab === 'collection' || activeTab === 'home') && (() => {
                      const getSorted = () => {
                        const list = [...products];
                        if (sortBy === 'name') return list.sort((a,b) => a.name.localeCompare(b.name));
                        if (sortBy === 'category') return list.sort((a,b) => a.category.localeCompare(b.category));
                        if (sortBy === 'newest') return list;
                        return list.sort((a,b) => {
                          const aIdx = (homeSettings.globalProductOrder || []).indexOf(a.id);
                          const bIdx = (homeSettings.globalProductOrder || []).indexOf(b.id);
                          if (aIdx === -1 && bIdx === -1) return 0;
                          if (aIdx === -1) return 1;
                          if (bIdx === -1) return -1;
                          return aIdx - bIdx;
                        });
                      };
                      return getSorted().map((p, index) => (
                        <tr 
                          key={p.id} 
                          onClick={() => handleEdit(p)}
                          className={`hover:bg-cobalt/5 group transition-all duration-200 cursor-pointer ${selectedIds.includes(p.id) ? 'bg-cobalt/5' : ''} ${editingId === p.id ? 'bg-cobalt/10 border-l-4 border-cobalt font-semibold' : ''}`}
                        >
                          <td className="p-4" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                          </td>
                          <td className="py-4" onClick={e => e.stopPropagation()}>
                            {sortBy === 'user' ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <button onClick={() => handleReorder('collection', p.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                                <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                                <button onClick={() => handleReorder('collection', p.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === products.length - 1}><ChevronDown size={14}/></button>
                              </div>
                            ) : (
                              <div className="text-center text-ink/20 text-xs">—</div>
                            )}
                          </td>
                          <td className="py-4">
                            {(() => {
                              const mainImg = p.images?.[0] || '';
                              if (mainImg.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || mainImg.includes('video')) {
                                return <video src={mainImg} className="w-12 h-12 rounded-lg object-cover bg-black/5" muted />;
                              }
                              return <img src={mainImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" nopin="nopin" data-pin-no-hover="true" />;
                            })()}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <button 
                                type="button"
                                onClick={e => { e.stopPropagation(); toggleFeatured(p.id); }}
                                className="focus:outline-none transition-transform hover:scale-125 active:scale-90"
                                title="Toggle Home Selected Works"
                              >
                                {(homeSettings.featuredProductIds || []).includes(p.id) ? (
                                  <span className="text-orange text-sm">★</span>
                                ) : (
                                  <span className="text-ink/10 hover:text-orange/60 text-sm">☆</span>
                                )}
                              </button>
                              <div>
                                <div className="font-bold text-ink group-hover:text-cobalt transition-colors">{p.name}</div>
                                {p.subTitle && <div className="text-[10px] text-ink/40">{p.subTitle}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="caption-nano text-orange px-3 py-1 border border-orange/30 rounded-full font-bold">{p.category}</span>
                          </td>
                          <td className="py-4 text-right pr-6" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-3 items-center">
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
                        className={`hover:bg-black/[0.02] group transition-all duration-300 ${selectedIds.includes(s.id) ? 'bg-cobalt/5' : ''} ${editingId === s.id ? 'bg-cobalt/10 border-l-4 border-cobalt font-semibold' : ''}`}
                      >
                        <td className="p-4">
                          <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col items-center gap-0.5">
                            <button onClick={() => handleReorder('space', s.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                            <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                            <button onClick={() => handleReorder('space', s.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === spaces.length - 1}><ChevronDown size={14}/></button>
                          </div>
                        </td>
                        <td className="py-4">
                          {s.images?.[0]?.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || s.images?.[0]?.includes('video') ? (
                            <video src={s.images[0]} className="w-12 h-12 rounded-lg object-cover bg-black/5" muted />
                          ) : (
                            <img src={s.images?.[0]} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" nopin="nopin" data-pin-no-hover="true" />
                          )}
                        </td>
                        <td className="py-4">
                          <div className="font-bold text-ink group-hover:text-cobalt transition-colors">{s.title}</div>
                          <div className="text-[10px] text-ink/50 truncate max-w-[200px]">{s.description}</div>
                        </td>
                        <td className="py-4">
                          <span className="text-[10px] font-sans font-bold text-ink/40">
                            {s.appliedProductIds && s.appliedProductIds.length > 0 
                              ? `${s.appliedProductIds.length} Products` 
                              : 'None'}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-6">
                          <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                            <Link to={`/space/${s.id}`} target="_blank" className="text-ink/20 hover:text-cobalt"><ExternalLink size={14} /></Link>
                            <button onClick={() => handleEdit(s)} className="text-cobalt text-[10px] font-bold uppercase tracking-widest hover:underline">Edit</button>
                            <button onClick={() => handleDelete(s.id)} className="text-orange text-[10px] font-bold uppercase tracking-widest hover:underline">Delete</button>
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
                        className={`hover:bg-black/[0.02] group transition-all duration-300 ${selectedIds.includes(j.id) ? 'bg-cobalt/5' : ''} ${editingId === j.id ? 'bg-cobalt/10 border-l-4 border-cobalt font-semibold' : ''}`}
                      >
                        <td className="p-4">
                          <input type="checkbox" checked={selectedIds.includes(j.id)} onChange={() => toggleSelect(j.id)} />
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col items-center gap-0.5">
                            <button onClick={() => handleReorder('journal', j.id, 'up')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === 0}><ChevronUp size={14}/></button>
                            <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                            <button onClick={() => handleReorder('journal', j.id, 'down')} className="text-ink/10 hover:text-cobalt disabled:opacity-0" disabled={index === journals.length - 1}><ChevronDown size={14}/></button>
                          </div>
                        </td>
                        <td className="py-4">
                          {j.image.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/) || j.image.includes('video') ? (
                            <video src={j.image} className="w-12 h-12 rounded-lg object-cover bg-black/5" muted />
                          ) : (
                            <img src={j.image} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" nopin="nopin" data-pin-no-hover="true" />
                          )}
                        </td>
                        <td className="py-4">
                          <div className="font-bold text-ink group-hover:text-cobalt transition-colors">{j.title}</div>
                          <div className="text-[10px] text-ink/40 font-sans">{j.date}</div>
                        </td>
                        <td className="py-4">
                          <span className="caption-nano text-cobalt px-3 py-1 border border-cobalt/20 rounded-full font-bold">{j.category}</span>
                        </td>
                        <td className="py-4 text-right pr-6">
                          <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                            <Link to={`/journal/${j.id}`} target="_blank" className="text-ink/20 hover:text-cobalt"><ExternalLink size={14} /></Link>
                            <button onClick={() => handleEdit(j)} className="text-cobalt text-[10px] font-bold uppercase tracking-widest hover:underline">Edit</button>
                            <button onClick={() => handleDelete(j.id)} className="text-orange text-[10px] font-bold uppercase tracking-widest hover:underline">Delete</button>
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
