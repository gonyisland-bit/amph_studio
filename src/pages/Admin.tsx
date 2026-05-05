import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  getProducts, Product, deleteProduct, updateProduct, addProduct, Category, ContentBlock,
  getJournals, JournalArticle, deleteJournal, updateJournal, addJournal,
  getSpaces, SpaceModel, deleteSpace, updateSpace, addSpace,
  HomeSettings, getHomeSettings, updateHomeSettings, defaultHomeSettings, deleteBlob
} from "../lib/data";
import { upload } from '@vercel/blob/client';
import { Plus, Trash2, Copy, LogOut, CheckCircle2, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'Chairs', description: '', subTitle: '', material: '', price: 0, images: [''], hoverImages: [], contentBlocks: []
};
const emptyJournal: Omit<JournalArticle, 'id'> = {
  title: '', category: '', date: '', image: '', contentBlocks: []
};
const emptySpace: Omit<SpaceModel, 'id'> = {
  title: '', description: '', images: [''], appliedProductIds: []
};

const ImageUploadInput = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label?: string }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const uniqueName = `${Date.now()}-${file.name}`;
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

  return (
    <div className="w-full mb-4">
      {label && <label className="block text-[10px] font-bold uppercase text-ink/50 mb-2">{label}</label>}
      <div 
        className={`relative border-2 border-dashed rounded-[12px] flex flex-col items-center justify-center p-4 transition-colors cursor-pointer min-h-[120px] ${dragActive ? 'border-cobalt bg-cobalt/5' : 'border-black/20 bg-black/5 hover:bg-black/10'}`}
        onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.remove-btn')) return;
          document.getElementById(`file-${idSafeLabel}`)?.click();
        }}
      >
        <input 
          id={`file-${idSafeLabel}`} 
          type="file" 
          accept="image/*" 
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
           <div className="relative group/preview">
             <img src={value} alt="Preview" className="h-24 w-auto object-contain mix-blend-multiply" />
             <button 
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Delete this image from server?')) {
                  await deleteBlob(value);
                  onChange('');
                }
              }}
              className="remove-btn absolute -top-2 -right-2 bg-orange text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
             >
               ✕
             </button>
           </div>
        ) : (
           <div className="text-center text-xs text-ink/50"><span className="text-cobalt font-bold">Click to upload</span> or drag and drop</div>
        )}
      </div>
      <div className="mt-2 flex gap-2 items-center">
        <span className="text-[10px] uppercase font-bold text-ink/40 whitespace-nowrap">Or URL:</span>
        <input value={value} onChange={e => onChange(e.target.value)} className="flex-1 border-b border-black/20 bg-transparent outline-none focus:border-cobalt text-xs py-1" placeholder="https://" />
      </div>
    </div>
  );
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'collection'|'journal'|'space'|'shop'>('shop');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [form, setForm] = useState<any>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [homeSettings, setHomeSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
    setSelectedIds([]);
  }, [activeTab, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'amph123') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
      window.dispatchEvent(new Event('admin_auth_change'));
    } else {
      alert('Incorrect password');
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
        <div className="w-full max-w-md bg-white p-12 rounded-[32px] shadow-xl border border-black/5">
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
            <button type="submit" className="w-full bg-ink text-white py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-cobalt transition-colors">
              Enter Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const loadData = () => {
    getProducts().then(setProducts);
    if (activeTab === 'journal') getJournals().then(setJournals);
    if (activeTab === 'space') getSpaces().then(setSpaces);
    if (activeTab === 'collection') getHomeSettings().then(setHomeSettings);
  };

  const switchTab = (tab: 'collection'|'journal'|'space'|'shop') => {
    setActiveTab(tab);
    setEditingId(null);
    if (tab === 'shop') setForm(emptyProduct);
    if (tab === 'journal') setForm(emptyJournal);
    if (tab === 'space') setForm(emptySpace);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'shop') {
      if (editingId) await updateProduct(editingId, form);
      else await addProduct({ ...form, id: `prod-${Date.now()}` });
      setForm(emptyProduct);
    } else if (activeTab === 'journal') {
      if (editingId) await updateJournal(editingId, form);
      else await addJournal({ ...form, id: `j-${Date.now()}` });
      setForm(emptyJournal);
    } else if (activeTab === 'space') {
      if (editingId) await updateSpace(editingId, form);
      else await addSpace({ ...form, id: `s-${Date.now()}` });
      setForm(emptySpace);
    }
    setEditingId(null);
    loadData();
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Delete item?')) return;
    if (activeTab === 'shop') await deleteProduct(id);
    if (activeTab === 'journal') await deleteJournal(id);
    if (activeTab === 'space') await deleteSpace(id);
    loadData();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    for (const id of selectedIds) {
      if (activeTab === 'shop') await deleteProduct(id);
      if (activeTab === 'journal') await deleteJournal(id);
      if (activeTab === 'space') await deleteSpace(id);
    }
    setSelectedIds([]);
    loadData();
  };

  const handleBulkDuplicate = async () => {
    for (const id of selectedIds) {
      let item;
      if (activeTab === 'shop') {
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
              <ImageUploadInput value={cb.value} onChange={val => {
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
      
      {/* Admin Status Banner */}
      <div className="bg-ink text-white p-4 rounded-2xl mb-8 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-400" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">System Status</p>
            <h2 className="text-sm font-bold uppercase tracking-tight">Logged in as Administrator</h2>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 bg-white/10 hover:bg-orange px-4 py-2 rounded-full transition-all text-[10px] font-bold uppercase tracking-widest">
          <LogOut size={14} /> Logout
        </button>
      </div>

      <div className="flex gap-6 mb-8 border-b border-black/10 pb-4 overflow-x-auto">
        {[
          { id: 'collection', label: 'Home Settings' },
          { id: 'shop', label: 'Collection Inventory' },
          { id: 'space', label: 'Space Inventory' },
          { id: 'journal', label: 'Journal Inventory' }
        ].map(tab => (
          <button key={tab.id} onClick={() => switchTab(tab.id as any)} className={`uppercase text-[11px] font-bold tracking-widest transition-all shrink-0 ${activeTab === tab.id ? 'text-cobalt border-b-2 border-cobalt pb-1' : 'text-ink/40 hover:text-ink'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="col-span-1 lg:col-span-1">
          <div className="sticky top-24">
            <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
              <span>{editingId ? 'Edit Content' : 'Add New Content'}</span>
              {editingId && (
                <button onClick={() => { setEditingId(null); switchTab(activeTab); }} className="text-[9px] uppercase font-bold text-ink/40 hover:text-ink">Reset to New</button>
              )}
            </h2>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              
              {activeTab === 'collection' && (
                <div className="space-y-6">
                  {/* Home settings fields (omitted for brevity but same as before) */}
                  <div className="border-b border-black/10 pb-6 mb-6">
                    <h3 className="font-bold text-xs uppercase text-ink/40 mb-4">General Copy</h3>
                    <div className="grid gap-4">
                      <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Subtitle</label>
                        <input value={homeSettings.subtitle} onChange={e => setHomeSettings({...homeSettings, subtitle: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                        <textarea value={homeSettings.title} onChange={e => setHomeSettings({...homeSettings, title: e.target.value})} rows={3} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                      <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                        <textarea value={homeSettings.description} onChange={e => setHomeSettings({...homeSettings, description: e.target.value})} rows={2} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                      <button type="button" onClick={async () => { setSavingSettings(true); await updateHomeSettings(homeSettings); setSavingSettings(false); alert('Saved!'); }} className="bg-cobalt text-white px-6 py-2 uppercase text-[10px] font-black hover:bg-ink transition-colors">{savingSettings ? 'Saving...' : 'Save All Settings'}</button>
                    </div>
                  </div>
                  {/* ... other settings fields ... */}
                </div>
              )}

              {activeTab === 'shop' && (
                <>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Name</label>
                    <input required value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Category</label>
                    <select value={form.category || 'Chairs'} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt">
                      <option>Chairs</option><option>Tables</option><option>Lighting</option><option>Objects</option>
                    </select></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Price</label>
                    <input type="number" required value={form.price || 0} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Sub Title</label>
                    <input required value={form.subTitle || ''} onChange={e => setForm({...form, subTitle: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                    <textarea required value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={3} /></div>
                  <div className="border-t border-black/10 pt-4 mt-4">
                    <h3 className="font-bold text-[10px] uppercase mb-4 text-cobalt">Gallery Images</h3>
                    {form.images?.map((img:string, i:number) => (
                      <div key={i} className="flex gap-2 mb-2 items-end">
                        <div className="flex-1"><ImageUploadInput label={i === 0 ? "Main" : `Image ${i+1}`} value={img} onChange={val => { const newI = [...form.images]; newI[i] = val; setForm({...form, images: newI}); }} /></div>
                        {i > 0 && <button type="button" onClick={() => setForm({...form, images: form.images.filter((_:any, idx:number) => idx !== i)})} className="mb-8 text-orange text-xs font-bold px-2">X</button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm({...form, images: [...(form.images || []), '']})} className="text-[10px] font-bold text-cobalt hover:underline">+ Add Image</button>
                  </div>
                  {renderContentBlocksEditor()}
                </>
              )}

              {activeTab === 'journal' && (
                <>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                    <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Category</label>
                    <input required value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Date</label>
                    <input required value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><ImageUploadInput label="Hero Image" value={form.image || ''} onChange={val => setForm({...form, image: val})} /></div>
                  {renderContentBlocksEditor()}
                </>
              )}

              {activeTab === 'space' && (
                <>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Space Title</label>
                    <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                  <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                    <textarea required value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={4}/></div>
                  <div className="border-t border-black/10 pt-4 mt-4">
                    <h3 className="font-bold text-[10px] uppercase mb-4 text-cobalt">Gallery Images</h3>
                    {form.images?.map((img:string, i:number) => (
                      <div key={i} className="flex gap-2 mb-2 items-end">
                        <div className="flex-1"><ImageUploadInput label={i === 0 ? "Main" : `Image ${i+1}`} value={img} onChange={val => { const newI = [...form.images]; newI[i] = val; setForm({...form, images: newI}); }} /></div>
                        {i > 0 && <button type="button" onClick={() => setForm({...form, images: form.images.filter((_:any, idx:number) => idx !== i)})} className="mb-8 text-orange text-xs font-bold px-2">X</button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm({...form, images: [...(form.images || []), '']})} className="text-[10px] font-bold text-cobalt hover:underline">+ Add Image</button>
                  </div>
                </>
              )}

              {activeTab !== 'collection' && (
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="bg-cobalt text-white px-8 py-3 uppercase text-[11px] font-black tracking-widest hover:bg-orange transition-colors rounded-full shadow-lg">Save Changes</button>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2">
          {/* Inventory Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
               <h2 className="text-xl font-bold font-sans uppercase tracking-tight">Inventory</h2>
               <button onClick={() => { setEditingId(null); switchTab(activeTab); }} className="flex items-center gap-2 bg-cobalt text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-all">
                 <Plus size={14} /> New Item
               </button>
            </div>
            
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-black/5 p-2 rounded-full border border-black/10 animate-in fade-in slide-in-from-right-4">
                <span className="text-[10px] font-bold px-3 border-r border-black/10">{selectedIds.length} Selected</span>
                <button onClick={handleBulkDuplicate} className="flex items-center gap-2 hover:text-cobalt px-3 py-1 transition-colors text-[9px] font-bold uppercase"><Copy size={12}/> Duplicate</button>
                <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-orange px-3 py-1 transition-colors text-[9px] font-bold uppercase"><Trash2 size={12}/> Delete</button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto bg-white rounded-3xl border border-black/5 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase font-black tracking-widest text-ink/40 border-b border-black/5">
                <tr>
                  <th className="p-4 w-10">
                    <input type="checkbox" onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = activeTab === 'shop' ? products.map(p => p.id) : activeTab === 'space' ? spaces.map(s => s.id) : journals.map(j => j.id);
                        setSelectedIds(allIds);
                      } else setSelectedIds([]);
                    }} checked={selectedIds.length > 0 && selectedIds.length === (activeTab === 'shop' ? products.length : activeTab === 'space' ? spaces.length : journals.length)} />
                  </th>
                  <th className="py-4">Order</th>
                  <th className="py-4">Image</th>
                  <th className="py-4">Details</th>
                  <th className="py-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                  {(activeTab === 'shop' || activeTab === 'collection') && [...products].sort((a,b) => {
                    const aIdx = homeSettings.globalProductOrder.indexOf(a.id);
                    const bIdx = homeSettings.globalProductOrder.indexOf(b.id);
                    if (aIdx === -1 && bIdx === -1) return 0;
                    if (aIdx === -1) return 1;
                    if (bIdx === -1) return -1;
                    return aIdx - bIdx;
                  }).map((p, index) => (
                    <tr key={p.id} className={`hover:bg-black/[0.02] group transition-colors ${selectedIds.includes(p.id) ? 'bg-cobalt/5' : ''}`}>
                      <td className="p-4">
                        <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col items-center gap-0.5">
                          <button onClick={() => { /* reorder logic */ }} className="text-ink/10 hover:text-cobalt"><ChevronUp size={14}/></button>
                          <span className="text-[9px] font-black text-ink/20">{index + 1}</span>
                          <button onClick={() => { /* reorder logic */ }} className="text-ink/10 hover:text-cobalt"><ChevronDown size={14}/></button>
                        </div>
                      </td>
                      <td className="py-4"><img src={p.images[0]} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" /></td>
                      <td className="py-4">
                        <div className="font-bold text-ink group-hover:text-cobalt transition-colors">{p.name}</div>
                        <div className="text-[9px] font-black uppercase text-orange">{p.category}</div>
                      </td>
                      <td className="py-4 text-right pr-6">
                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(p)} className="text-cobalt text-[10px] font-bold uppercase tracking-widest hover:underline">Edit</button>
                          <button onClick={() => handleDelete(p.id)} className="text-orange text-[10px] font-bold uppercase tracking-widest hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'space' && spaces.map((s) => (
                    <tr key={s.id} className={`hover:bg-black/[0.02] group transition-colors ${selectedIds.includes(s.id) ? 'bg-cobalt/5' : ''}`}>
                      <td className="p-4">
                        <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                      </td>
                      <td className="py-4"><span className="text-[9px] font-black text-ink/20">SPACE</span></td>
                      <td className="py-4"><img src={s.images?.[0]} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" /></td>
                      <td className="py-4">
                        <div className="font-bold text-ink group-hover:text-cobalt transition-colors">{s.title}</div>
                        <div className="text-[9px] font-black uppercase text-ink/30 truncate max-w-[150px]">{s.description}</div>
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

                  {activeTab === 'journal' && journals.map((j) => (
                    <tr key={j.id} className={`hover:bg-black/[0.02] group transition-colors ${selectedIds.includes(j.id) ? 'bg-cobalt/5' : ''}`}>
                      <td className="p-4">
                        <input type="checkbox" checked={selectedIds.includes(j.id)} onChange={() => toggleSelect(j.id)} />
                      </td>
                      <td className="py-4"><span className="text-[9px] font-black text-ink/20">POST</span></td>
                      <td className="py-4"><img src={j.image} className="w-12 h-12 rounded-lg object-cover mix-blend-multiply" /></td>
                      <td className="py-4">
                        <div className="font-bold text-ink group-hover:text-cobalt transition-colors">{j.title}</div>
                        <div className="text-[9px] font-black uppercase text-ink/30">{j.date}</div>
                      </td>
                      <td className="py-4 text-right pr-6">
                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>
    </div>
  );
}
