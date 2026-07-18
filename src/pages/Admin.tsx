import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  getProducts, Product, deleteProduct, updateProduct, addProduct, Category, ContentBlock,
  getJournals, JournalArticle, deleteJournal, updateJournal, addJournal,
  getSpaces, SpaceModel, deleteSpace, updateSpace, addSpace,
  HomeSettings, getHomeSettings, updateHomeSettings, defaultHomeSettings, deleteBlob
} from "../lib/data";
import { upload } from '@vercel/blob/client';
import { Plus, Trash2, Copy, LogOut, CheckCircle2, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'Chairs', description: '', subTitle: '', material: '', price: 0, images: [''], hoverImages: [''], contentBlocks: [], color: '', dimensions: '', shipping: '', sku: ''
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
               <img src={value} alt="Preview" className="h-24 w-auto object-contain mix-blend-multiply" />
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

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'home'|'journal'|'space'|'collection'>('collection');
  const [sortBy, setSortBy] = useState<'user' | 'name' | 'category' | 'newest'>('user');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [form, setForm] = useState<any>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [homeSettings, setHomeSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [activeSections, setActiveSections] = useState<Record<string, boolean>>({ basic: true, specs: false, media: false, story: false });

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
    getHomeSettings().then(setHomeSettings);
    if (activeTab === 'journal') getJournals().then(setJournals);
    if (activeTab === 'space') getSpaces().then(setSpaces);
  };

  const location = useLocation();
  const autoEditHandled = React.useRef(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
    setSelectedIds([]);
  }, [activeTab, isAuthenticated]);

  // Auto-enter edit mode when ?edit=<id> is present in the URL — runs once per navigation
  useEffect(() => {
    if (autoEditHandled.current) return;
    if (!isAuthenticated || products.length === 0) return;
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId) {
      const found = products.find(p => p.id === editId);
      if (found) {
        autoEditHandled.current = true;
        setActiveTab('collection');
        setEditingId(found.id);
        setForm(found);
        setActiveSections({ basic: true, specs: false, media: false, story: false });
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      }
    } else {
      autoEditHandled.current = true;
    }
  }, [isAuthenticated, products, location.search]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'amph123') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
      window.dispatchEvent(new Event('admin_auth_change'));
      showToast('Welcome back, admin', 'success');
    } else {
      showToast('Incorrect password', 'error');
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

  const switchTab = (tab: 'home'|'journal'|'space'|'collection') => {
    setActiveTab(tab);
    setEditingId(null);
    if (tab === 'collection') setForm(emptyProduct);
    if (tab === 'journal') setForm(emptyJournal);
    if (tab === 'space') setForm(emptySpace);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'collection') {
        const cleanedImages = (form.images || []).filter(Boolean);
        const cleanedForm = { ...form, images: cleanedImages };
        if (editingId) await updateProduct(editingId, cleanedForm);
        else await addProduct({ ...cleanedForm, id: `prod-${Date.now()}` });
        setForm(emptyProduct);
      } else if (activeTab === 'journal') {
        if (editingId) await updateJournal(editingId, form);
        else await addJournal({ ...form, id: `j-${Date.now()}` });
        setForm(emptyJournal);
      } else if (activeTab === 'space') {
        const cleanedImages = (form.images || []).filter(Boolean);
        const cleanedForm = { ...form, images: cleanedImages };
        if (editingId) await updateSpace(editingId, cleanedForm);
        else await addSpace({ ...cleanedForm, id: `s-${Date.now()}` });
        setForm(emptySpace);
      }
      setEditingId(null);
      loadData();
      showToast('Saved successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to save. Please try again.', 'error');
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm(item);
    // Always open basic section so form content is immediately visible
    setActiveSections({ basic: true, specs: false, media: false, story: false });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
    <div className="mb-4">
      <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Content Blocks</label>
      {form.contentBlocks?.map((cb: ContentBlock, i: number) => (
        <div key={i} className="flex gap-2 mb-2 items-start bg-black/5 p-2 rounded">
          <select value={cb.type} onChange={e => {
              const newCb = [...form.contentBlocks];
              newCb[i] = { ...newCb[i], type: e.target.value as 'text'|'image' };
              setForm({...form, contentBlocks: newCb});
          }} className="border border-black/20 p-1 text-xs outline-none">
              <option value="text">Text</option>
              <option value="image">Image</option>
          </select>
          {cb.type === 'image' ? (
              <MediaUploadInput value={cb.value} onChange={val => {
                const newCb = [...form.contentBlocks]; newCb[i].value = val; setForm({...form, contentBlocks: newCb});
              }} />
          ) : (
              <textarea value={cb.value} onChange={e => {
                const newCb = [...form.contentBlocks]; newCb[i].value = e.target.value; setForm({...form, contentBlocks: newCb});
              }} className="flex-1 border border-black/20 p-1 text-xs outline-none" placeholder="Text Content" rows={2}/>
          )}
          <button type="button" onClick={() => {
            setForm({...form, contentBlocks: form.contentBlocks.filter((_:any, idx:number) => idx !== i)});
          }} className="text-orange text-xs font-bold px-2 hover:underline">X</button>
        </div>
      ))}
      <button type="button" onClick={() => setForm({...form, contentBlocks: [...(form.contentBlocks || []), { type: 'text', value: '' }]})} className="text-xs font-bold text-cobalt hover:underline">+ Add Block</button>
    </div>
  );

  return (
    <div className="flex flex-col flex-grow p-6 md:p-12 max-w-[1400px] mx-auto w-full font-sans">
      
      {/* Admin Status Banner - Redesigned to be clean and minimal with line border */}
      <div className="border border-black/10 bg-white p-6 mb-8 flex justify-between items-center rounded-none">
        <div className="flex items-center gap-4">
          <CheckCircle2 size={18} className="text-cobalt" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-ink/30">System Status</p>
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink">Logged in as Administrator</h2>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 border border-orange/20 text-orange hover:bg-orange hover:text-white px-4 py-2 rounded-none transition-all text-[9px] font-bold uppercase tracking-widest cursor-pointer">
          <LogOut size={12} /> Logout
        </button>
      </div>

      <div className="flex gap-6 mb-8 border-b border-black/10 pb-4 overflow-x-auto">
        {[
          { id: 'home', label: 'Home' },
          { id: 'collection', label: 'Collection' },
          { id: 'space', label: 'Space' },
          { id: 'journal', label: 'Journal' }
        ].map(tab => (
          <button key={tab.id} onClick={() => switchTab(tab.id as any)} className={`uppercase text-[11px] font-bold tracking-widest transition-all shrink-0 ${activeTab === tab.id ? 'text-cobalt border-b-2 border-cobalt pb-1' : 'text-ink/40 hover:text-ink'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className={activeTab === 'home' ? 'col-span-12' : 'col-span-1 lg:col-span-5'}>
          <div className="sticky top-24">
            <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
              <span>{editingId ? 'Edit Content' : 'Add New Content'}</span>
              {editingId && (
                <button onClick={() => { setEditingId(null); switchTab(activeTab); }} className="text-[9px] uppercase font-bold text-ink/40 hover:text-ink">Reset to New</button>
              )}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              
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
                            <img src={p.images[0]} className="w-8 h-8 rounded-none object-cover mix-blend-multiply flex-shrink-0" />
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
                        {(form.images || []).filter(Boolean).map((img: string, i: number) => (
                          <div key={i} className={`${i === 0 && (form.images || []).filter(Boolean).length % 2 !== 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-[4/5]'} overflow-hidden bg-silver/5 relative`}>
                            <img src={img} alt={`Preview ${i+1}`} className="absolute inset-0 w-full h-full object-contain bg-white" />
                          </div>
                        ))}
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
                        <div className="grid grid-cols-2 gap-4">
                          <EditorInput label="Material (e.g., Oak, Steel)" value={form.material || ''} onChange={val => setForm({...form, material: val})} />
                          <EditorInput label="Color Options (e.g., Black, White)" value={form.color || ''} onChange={val => setForm({...form, color: val})} />
                        </div>
                        <EditorInput label="Dimensions (e.g., H 75 x W 120 x D 60 cm)" value={form.dimensions || ''} onChange={val => setForm({...form, dimensions: val})} />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <EditorInput label="Shipping (e.g., Free shipping)" value={form.shipping || ''} onChange={val => setForm({...form, shipping: val})} />
                          <EditorInput label="SKU Code" value={form.sku || ''} onChange={val => setForm({...form, sku: val})} />
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
                                        const newImg = [...displayImages]; 
                                        newImg[i] = val; 
                                        setForm({...form, images: newImg}); 
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
                                        
                                        {i > 0 && (
                                          <button 
                                            type="button" 
                                            onClick={() => setForm({...form, images: displayImages.filter((_, idx: number) => idx !== i)})} 
                                            className="text-[9px] uppercase font-bold text-orange hover:underline"
                                          >
                                            Remove
                                          </button>
                                        )}
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
                        <div key={i} className="flex gap-2 mb-2 items-end">
                          <div className="flex-1"><MediaUploadInput label={i === 0 ? "Main" : `Media ${i+1}`} value={img} onChange={val => { const newI = [...displayImages]; newI[i] = val; setForm({...form, images: newI}); }} /></div>
                          {i > 0 && <button type="button" onClick={() => setForm({...form, images: displayImages.filter((_:any, idx:number) => idx !== i)})} className="mb-8 text-orange text-xs font-bold px-2 hover:underline">Remove</button>}
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

              {activeTab !== 'home' && (
                <div className="pt-6 border-t border-black/5 mt-6">
                  <button type="submit" className="w-full bg-ink text-white py-4 uppercase text-[11px] font-black tracking-[0.2em] hover:bg-cobalt transition-colors rounded-none shadow-md">
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {activeTab !== 'home' && (
          <div className="col-span-1 lg:col-span-7">
            {/* Inventory Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <div className="flex items-center gap-4 flex-wrap">
                  <h2 className="text-xl font-bold font-sans uppercase tracking-tight">
                    {activeTab === 'collection' ? 'Collection' : activeTab === 'space' ? 'Space' : 'Journal'}
                  </h2>
                  <button onClick={() => { setEditingId(null); switchTab(activeTab); }} className="flex items-center gap-2 bg-cobalt text-white px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-all">
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
                              return <img src={mainImg} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" />;
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
                            <div className="flex justify-end gap-3">
                              <Link 
                                to={`/product/${p.id}`} 
                                target="_blank"
                                className="text-ink/30 text-[10px] font-bold uppercase tracking-widest hover:text-ink transition-colors"
                                title="View product page"
                              >
                                <ExternalLink size={13} />
                              </Link>
                              <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }} className="text-orange/40 text-[10px] font-bold uppercase tracking-widest hover:text-orange transition-colors">
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
                            <img src={s.images?.[0]} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" />
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
                            <img src={j.image} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" />
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
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] p-4 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-black uppercase tracking-wider animate-in fade-in slide-in-from-top-4 transition-all duration-500 bg-white ${
          toast.type === 'success' ? 'border-green-200 text-green-700' :
          toast.type === 'error' ? 'border-red-200 text-red-700' :
          'border-cobalt/20 text-cobalt'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' :
            'bg-cobalt'
          }`} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
