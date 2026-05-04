import React, { useEffect, useState } from "react";
import { 
  getProducts, Product, deleteProduct, updateProduct, addProduct, Category, ContentBlock,
  getJournals, JournalArticle, deleteJournal, updateJournal, addJournal,
  getSpaces, SpaceModel, deleteSpace, updateSpace, addSpace,
  HomeSettings, getHomeSettings, updateHomeSettings, defaultHomeSettings, deleteBlob
} from "../lib/data";
import { upload } from '@vercel/blob/client';

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'Chairs', description: '', material: '', price: 0, images: [''], hoverImages: [], contentBlocks: []
};
const emptyJournal: Omit<JournalArticle, 'id'> = {
  title: '', category: '', date: '', image: '', contentBlocks: []
};
const emptySpace: Omit<SpaceModel, 'id'> = {
  title: '', location: '', description: '', address: '', hours: '', image: ''
};

const ImageUploadInput = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label?: string }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const newBlob = await upload(file.name, file, {
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
              e.target.value = ''; // Reset to allow re-uploading same file
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
  const [activeTab, setActiveTab] = useState<'collection'|'journal'|'space'|'shop'>('collection');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);

  const [form, setForm] = useState<any>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [homeSettings, setHomeSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
    getProducts().then(setProducts); // Always load products for both collection and shop
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
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Delete item?')) return;
    if (activeTab === 'shop') await deleteProduct(id);
    if (activeTab === 'journal') await deleteJournal(id);
    if (activeTab === 'space') await deleteSpace(id);
    loadData();
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
    <div className="flex flex-col flex-grow p-6 md:p-12 max-w-[1400px] mx-auto w-full">
      <h1 className="text-4xl font-bold font-sans tracking-tight mb-6">Admin Dashboard</h1>
      
      <div className="flex gap-6 mb-8 border-b border-black/10 pb-4">
        {[
          { id: 'collection', label: 'Home' },
          { id: 'journal', label: 'Journal' },
          { id: 'space', label: 'Space' },
          { id: 'shop', label: 'Collection' }
        ].map(tab => (
          <button key={tab.id} onClick={() => switchTab(tab.id as any)} className={`uppercase text-[11px] font-bold tracking-widest transition-all ${activeTab === tab.id ? 'text-cobalt border-b-2 border-cobalt pb-1' : 'text-ink/40 hover:text-ink'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="col-span-1 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-6 font-sans">
            {editingId 
              ? `Edit ${activeTab === 'collection' ? 'Home' : activeTab === 'shop' ? 'Item' : activeTab === 'journal' ? 'Journal' : 'Space'}` 
              : `Add New ${activeTab === 'collection' ? 'Home' : activeTab === 'shop' ? 'Item' : activeTab === 'journal' ? 'Journal' : 'Space'}`}
          </h2>
          <form onSubmit={handleSave} className="space-y-4 font-sans text-sm">
            
            {activeTab === 'collection' && (
              <div className="space-y-6">
                <div className="border-b border-black/10 pb-6 mb-6">
                  <h3 className="font-bold text-lg mb-4">Collection Page Copy</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Subtitle (e.g. The Muse - Vol 01)</label>
                      <input value={homeSettings.subtitle} onChange={e => setHomeSettings({...homeSettings, subtitle: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title (use Enter for line breaks)</label>
                      <textarea value={homeSettings.title} onChange={e => setHomeSettings({...homeSettings, title: e.target.value})} rows={3} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                      <textarea value={homeSettings.description} onChange={e => setHomeSettings({...homeSettings, description: e.target.value})} rows={2} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Marquee Text</label>
                      <input value={homeSettings.marquee} onChange={e => setHomeSettings({...homeSettings, marquee: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" />
                    </div>
                    <button type="button" onClick={async () => {
                      setSavingSettings(true);
                      await updateHomeSettings(homeSettings);
                      setSavingSettings(false);
                      alert('Settings saved!');
                    }} className="bg-cobalt text-white px-6 py-2 uppercase text-xs tracking-widest font-bold hover:bg-orange transition-colors self-start">
                      {savingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="font-bold text-lg">Selected Featured Products</h3>
                    <a href="/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-cobalt hover:text-orange underline">Preview Collection Page ↗</a>
                  </div>
                  {homeSettings.featuredProductIds.length === 0 ? (
                    <div className="text-sm text-ink/50 italic">No products selected. Select from the right panel.</div>
                  ) : (
                    <div className="space-y-2">
                      {homeSettings.featuredProductIds.map((id, index) => {
                        const product = products.find(p => p.id === id);
                        if (!product) return null;
                        return (
                          <div key={id} className="flex items-center justify-between p-3 border border-black/10 bg-white shadow-sm">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold w-4">{index + 1}.</span>
                              <img src={product.images[0]} className="w-10 h-10 object-cover bg-silver/20" />
                              <span className="font-semibold text-sm">{product.name}</span>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => {
                                const newIds = [...homeSettings.featuredProductIds];
                                if (index > 0) { [newIds[index-1], newIds[index]] = [newIds[index], newIds[index-1]]; }
                                setHomeSettings({...homeSettings, featuredProductIds: newIds});
                              }} disabled={index === 0} className="px-2 py-1 text-xs border border-black/20 hover:bg-black/5 disabled:opacity-30">↑</button>
                              
                              <button type="button" onClick={() => {
                                const newIds = [...homeSettings.featuredProductIds];
                                if (index < newIds.length - 1) { [newIds[index+1], newIds[index]] = [newIds[index], newIds[index+1]]; }
                                setHomeSettings({...homeSettings, featuredProductIds: newIds});
                              }} disabled={index === homeSettings.featuredProductIds.length - 1} className="px-2 py-1 text-xs border border-black/20 hover:bg-black/5 disabled:opacity-30">↓</button>

                              <button type="button" onClick={async () => {
                                const newIds = homeSettings.featuredProductIds.filter(pid => pid !== id);
                                const newSettings = {...homeSettings, featuredProductIds: newIds};
                                setHomeSettings(newSettings);
                                await updateHomeSettings(newSettings);
                              }} className="px-3 py-1 text-xs text-orange border border-orange hover:bg-orange/10 ml-2">Remove</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Material</label>
                  <input required value={form.material || ''} onChange={e => setForm({...form, material: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                  <textarea required value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={3} /></div>
                <div><ImageUploadInput label="Primary Image URL" value={form.images?.[0] || ''} onChange={val => {
                    const newImages = [...(form.images || [''])]; newImages[0] = val; setForm({...form, images: newImages});
                  }} /></div>
                <div>
                  <ImageUploadInput 
                    label="Hover Image URL (One Only)" 
                    value={form.hoverImages?.[0] || ''} 
                    onChange={val => {
                      setForm({...form, hoverImages: [val]});
                    }} 
                  />
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
                <div><ImageUploadInput label="Hero Image URL" value={form.image || ''} onChange={val => setForm({...form, image: val})} /></div>
                {renderContentBlocksEditor()}
              </>
            )}

            {activeTab === 'space' && (
              <>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                  <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Location Label</label>
                  <input required value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Description</label>
                  <textarea required value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={3}/></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Address</label>
                  <textarea required value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={2}/></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Hours</label>
                  <textarea required value={form.hours || ''} onChange={e => setForm({...form, hours: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" rows={2}/></div>
                <div><ImageUploadInput label="Image URL" value={form.image || ''} onChange={val => setForm({...form, image: val})} /></div>
              </>
            )}

            {activeTab !== 'collection' && (
              <div className="pt-4 flex gap-4">
                <button type="submit" className="bg-cobalt text-white px-6 py-2 uppercase text-xs tracking-widest font-bold hover:bg-orange transition-colors">Save</button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); switchTab(activeTab); }} className="text-xs uppercase font-bold text-ink/60 hover:text-ink">Cancel</button>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="col-span-1 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-6 font-sans">
            {activeTab === 'collection' ? 'Home Content' : activeTab === 'shop' ? 'Collection Inventory' : `${activeTab} Inventory`}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left font-sans">
              <thead className="text-[10px] uppercase font-bold text-ink/50 border-b border-black/20">
                <tr>
                  <th className="pb-2 w-16">Order</th>
                  <th className="pb-2">Image</th>
                  <th className="pb-2">Details</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {(activeTab === 'shop' || activeTab === 'collection') && [...products].sort((a,b) => {
                    const aIdx = homeSettings.globalProductOrder.indexOf(a.id);
                    const bIdx = homeSettings.globalProductOrder.indexOf(b.id);
                    if (aIdx === -1 && bIdx === -1) return 0;
                    if (aIdx === -1) return 1;
                    if (bIdx === -1) return -1;
                    return aIdx - bIdx;
                  }).map((p, index, arr) => (
                    <tr key={p.id} className="border-b border-black/10 hover:bg-black/5 group">
                      <td className="py-3">
                        <div className="flex flex-col items-center gap-1">
                          <button type="button" onClick={async () => {
                            const newOrder = [...homeSettings.globalProductOrder];
                            if (newOrder.indexOf(p.id) === -1) {
                              newOrder.push(...products.map(x => x.id).filter(id => !newOrder.includes(id)));
                            }
                            const idx = newOrder.indexOf(p.id);
                            if (idx > 0) {
                              [newOrder[idx-1], newOrder[idx]] = [newOrder[idx], newOrder[idx-1]];
                              const newSettings = {...homeSettings, globalProductOrder: newOrder};
                              setHomeSettings(newSettings);
                              await updateHomeSettings(newSettings);
                            }
                          }} className="text-ink/20 hover:text-cobalt">▲</button>
                          <span className="text-[10px] font-bold text-ink/30">{index + 1}</span>
                          <button type="button" onClick={async () => {
                            const newOrder = [...homeSettings.globalProductOrder];
                            if (newOrder.indexOf(p.id) === -1) {
                              newOrder.push(...products.map(x => x.id).filter(id => !newOrder.includes(id)));
                            }
                            const idx = newOrder.indexOf(p.id);
                            if (idx < newOrder.length - 1) {
                              [newOrder[idx+1], newOrder[idx]] = [newOrder[idx], newOrder[idx+1]];
                              const newSettings = {...homeSettings, globalProductOrder: newOrder};
                              setHomeSettings(newSettings);
                              await updateHomeSettings(newSettings);
                            }
                          }} className="text-ink/20 hover:text-cobalt">▼</button>
                        </div>
                      </td>
                      <td className="py-3"><div className="w-12 h-12 bg-silver"><img src={p.images[0]} className="w-full h-full object-cover mix-blend-multiply" referrerPolicy="no-referrer" /></div></td>
                      <td className="py-3">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-[10px] text-orange uppercase">{p.category} - ${p.price}</div>
                      </td>
                      <td className="py-3 text-right">
                        {activeTab === 'shop' ? (
                          <>
                            <button onClick={() => handleEdit(p)} className="text-cobalt text-xs font-semibold mr-4 hover:underline">Edit</button>
                            <button onClick={() => handleDelete(p.id)} className="text-orange text-xs font-semibold hover:underline">Delete</button>
                          </>
                        ) : (
                          <button onClick={async () => {
                            const isSelected = homeSettings.featuredProductIds.includes(p.id);
                            const newIds = isSelected 
                              ? homeSettings.featuredProductIds.filter(id => id !== p.id)
                              : [...homeSettings.featuredProductIds, p.id];
                            const newSettings = {...homeSettings, featuredProductIds: newIds};
                            setHomeSettings(newSettings);
                            await updateHomeSettings(newSettings);
                          }} className={`text-xs font-semibold px-3 py-1 rounded-full border ${homeSettings.featuredProductIds.includes(p.id) ? 'bg-cobalt text-white border-cobalt' : 'bg-transparent text-ink/40 border-black/20 hover:border-cobalt'}`}>
                            {homeSettings.featuredProductIds.includes(p.id) ? 'Selected' : 'Select'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'journal' && journals.map(j => (
                    <tr key={j.id} className="border-b border-black/10 hover:bg-black/5">
                      <td className="py-3"><div className="w-16 h-12 bg-silver"><img src={j.image} className="w-full h-full object-cover mix-blend-multiply" referrerPolicy="no-referrer" /></div></td>
                      <td className="py-3">
                        <div className="font-semibold">{j.title}</div>
                        <div className="text-[10px] text-ink/50 uppercase">{j.category} - {j.date}</div>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleEdit(j)} className="text-cobalt text-xs font-semibold mr-4 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(j.id)} className="text-orange text-xs font-semibold hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'space' && spaces.map(s => (
                    <tr key={s.id} className="border-b border-black/10 hover:bg-black/5">
                      <td className="py-3"><div className="w-16 h-12 bg-silver"><img src={s.image} className="w-full h-full object-cover mix-blend-multiply" referrerPolicy="no-referrer" /></div></td>
                      <td className="py-3">
                        <div className="font-semibold">{s.title}</div>
                        <div className="text-[10px] text-ink/50 uppercase">{s.location}</div>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleEdit(s)} className="text-cobalt text-xs font-semibold mr-4 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="text-orange text-xs font-semibold hover:underline">Delete</button>
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
