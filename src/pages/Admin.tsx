import React, { useEffect, useState } from "react";
import { 
  getProducts, Product, deleteProduct, updateProduct, addProduct, Category, ContentBlock,
  getJournals, JournalArticle, deleteJournal, updateJournal, addJournal,
  getSpaces, SpaceModel, deleteSpace, updateSpace, addSpace
} from "../lib/data";

const emptyProduct: Omit<Product, 'id'> = {
  name: '', category: 'Chairs', description: '', material: '', price: 0, images: [''], hoverImages: [], contentBlocks: []
};
const emptyJournal: Omit<JournalArticle, 'id'> = {
  title: '', category: '', date: '', image: '', contentBlocks: []
};
const emptySpace: Omit<SpaceModel, 'id'> = {
  title: '', location: '', description: '', address: '', hours: '', image: ''
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'products'|'journals'|'spaces'>('products');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [journals, setJournals] = useState<JournalArticle[]>([]);
  const [spaces, setSpaces] = useState<SpaceModel[]>([]);

  const [form, setForm] = useState<any>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
    if (activeTab === 'products') getProducts().then(setProducts);
    if (activeTab === 'journals') getJournals().then(setJournals);
    if (activeTab === 'spaces') getSpaces().then(setSpaces);
  };

  const switchTab = (tab: 'products'|'journals'|'spaces') => {
    setActiveTab(tab);
    setEditingId(null);
    if (tab === 'products') setForm(emptyProduct);
    if (tab === 'journals') setForm(emptyJournal);
    if (tab === 'spaces') setForm(emptySpace);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'products') {
      if (editingId) await updateProduct(editingId, form);
      else await addProduct({ ...form, id: `prod-${Date.now()}` });
      setForm(emptyProduct);
    } else if (activeTab === 'journals') {
      if (editingId) await updateJournal(editingId, form);
      else await addJournal({ ...form, id: `j-${Date.now()}` });
      setForm(emptyJournal);
    } else if (activeTab === 'spaces') {
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
    if (activeTab === 'products') await deleteProduct(id);
    if (activeTab === 'journals') await deleteJournal(id);
    if (activeTab === 'spaces') await deleteSpace(id);
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
              <input value={cb.value} onChange={e => {
                const newCb = [...form.contentBlocks]; newCb[i].value = e.target.value; setForm({...form, contentBlocks: newCb});
              }} className="flex-1 border border-black/20 p-1 text-xs outline-none" placeholder="Image URL"/>
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
      
      <div className="flex gap-4 mb-8 border-b border-black/10 pb-4">
        {['products', 'journals', 'spaces'].map(tab => (
          <button key={tab} onClick={() => switchTab(tab as any)} className={`capitalize text-sm font-bold tracking-widest ${activeTab === tab ? 'text-cobalt border-b-2 border-cobalt pb-1' : 'text-ink/40 hover:text-ink'}`}>
            {tab}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="col-span-1 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-6 font-sans capitalize">{editingId ? `Edit ${activeTab.slice(0,-1)}` : `Add New ${activeTab.slice(0,-1)}`}</h2>
          <form onSubmit={handleSave} className="space-y-4 font-sans text-sm">
            
            {activeTab === 'products' && (
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
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Primary Image URL</label>
                  <input required value={form.images?.[0] || ''} onChange={e => {
                    const newImages = [...(form.images || [''])]; newImages[0] = e.target.value; setForm({...form, images: newImages});
                  }} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Hover Images URLs</label>
                  {form.hoverImages?.map((img:string, i:number) => (
                    <div key={i} className="flex gap-2 mb-2">
                       <input value={img} onChange={e => {
                         const newH = [...form.hoverImages]; newH[i] = e.target.value; setForm({...form, hoverImages: newH});
                       }} className="flex-1 border border-black/20 p-1 text-xs outline-none focus:border-cobalt bg-transparent" />
                       <button type="button" onClick={() => setForm({...form, hoverImages: form.hoverImages.filter((_:any, idx:number) => idx !== i)})} className="text-orange text-xs hover:underline font-bold px-2">X</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({...form, hoverImages: [...(form.hoverImages || []), '']})} className="text-xs font-bold text-cobalt hover:underline">+ Add Hover Image</button>
                </div>
                {renderContentBlocksEditor()}
              </>
            )}

            {activeTab === 'journals' && (
              <>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Title</label>
                  <input required value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Category</label>
                  <input required value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Date</label>
                  <input required value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Hero Image URL</label>
                  <input required value={form.image || ''} onChange={e => setForm({...form, image: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
                {renderContentBlocksEditor()}
              </>
            )}

            {activeTab === 'spaces' && (
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
                <div><label className="block text-[10px] font-bold uppercase text-ink/50 mb-1">Image URL</label>
                  <input required value={form.image || ''} onChange={e => setForm({...form, image: e.target.value})} className="w-full border border-black/20 p-2 bg-transparent outline-none focus:border-cobalt" /></div>
              </>
            )}

            <div className="pt-4 flex gap-4">
              <button type="submit" className="bg-cobalt text-white px-6 py-2 uppercase text-xs tracking-widest font-bold hover:bg-orange transition-colors">Save</button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); switchTab(activeTab); }} className="text-xs uppercase font-bold text-ink/60 hover:text-ink">Cancel</button>
              )}
            </div>
          </form>
        </div>

        <div className="col-span-1 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-6 font-sans capitalize">{activeTab} Inventory</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left font-sans">
              <thead className="text-[10px] uppercase font-bold text-ink/50 border-b border-black/20">
                <tr>
                  <th className="pb-2">Image</th>
                  <th className="pb-2">Details</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {activeTab === 'products' && products.map(p => (
                    <tr key={p.id} className="border-b border-black/10 hover:bg-black/5">
                      <td className="py-3"><div className="w-12 h-12 bg-silver"><img src={p.images[0]} className="w-full h-full object-cover mix-blend-multiply" referrerPolicy="no-referrer" /></div></td>
                      <td className="py-3">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-[10px] text-orange uppercase">{p.category} - ${p.price}</div>
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleEdit(p)} className="text-cobalt text-xs font-semibold mr-4 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-orange text-xs font-semibold hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'journals' && journals.map(j => (
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
                  {activeTab === 'spaces' && spaces.map(s => (
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
