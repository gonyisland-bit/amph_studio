export type Category = 'Chairs' | 'Tables' | 'Lighting' | 'Objects';

export interface ContentBlock {
  type: 'text' | 'image';
  value: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  material: string;
  price: number;
  subTitle?: string;
  images: string[];
  hoverImages?: string[];
  contentBlocks?: ContentBlock[];
  isFeatured?: boolean;
  dimensions?: string;
  shipping?: string;
  sku?: string;
  color?: string;
}

export interface JournalArticle {
  id: string;
  title: string;
  category: string;
  date: string;
  image: string;
  contentBlocks?: ContentBlock[];
}

export interface SpaceModel {
  id: string;
  title: string;
  description: string;
  images: string[];
  appliedProductIds?: string[];
  location?: string; // keeping for compatibility
  address?: string; // keeping for compatibility
  hours?: string; // keeping for compatibility
}

const aiImg = (prompt: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1000&nologo=true`;
const _a = aiImg;

const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Cylinder Chrome Lamp",
    category: "Lighting",
    description: "A geometric study in reflection. This lamp uses its environment to complete its form.",
    material: "Polished Chrome",
    subTitle: "Geometric Reflection",
    price: 420,
    images: [
      aiImg("Minimalist geometric cylinder chrome table lamp, soft white studio background, Hay Muuto style product photography, high detail"),
      aiImg("Minimalist geometric cylinder chrome table lamp turned on, warm glowing light, dark room, interior design photography")
    ],
    hoverImages: [
      aiImg("Minimalist geometric cylinder chrome table lamp turned on, warm glowing light, dark room, interior design photography")
    ],
    contentBlocks: [
      { type: 'text', value: 'This lamp illuminates spaces dynamically. Crafted from solid brass and plated in polished chrome, each piece is painstakingly hand-finished to achieve a mirror-like perfection.' },
      { type: 'image', value: aiImg("Close up of polished chrome texture mirroring light") }
    ],
    isFeatured: true
  },
  {
    id: "prod-2",
    name: "Alloy Tray",
    category: "Objects",
    description: "Brushed steel catch-all for your everyday items. Subtly curved edges.",
    material: "Brushed Steel",
    subTitle: "Everyday Catch-all",
    price: 180,
    images: [
      aiImg("Brushed steel minimalist curved tray object, top down view on soft pink background, elegant product photography"),
      aiImg("Brushed steel minimalist curved tray with a modern keychain on it, lifestyle photography, vibrant orange accent")
    ],
    hoverImages: [aiImg("Brushed steel minimalist curved tray with a modern keychain on it, lifestyle photography, vibrant orange accent")],
    isFeatured: true
  },
  {
    id: "prod-3",
    name: "Soft Stool",
    category: "Chairs",
    description: "Vivid pink fabric stretched over a minimalist steel frame. A pop of color for brutalist spaces.",
    material: "Steel Frame, Pink Velvet",
    subTitle: "Vivid Comfort",
    price: 350,
    images: [
      aiImg("Vivid soft pink velvet stool with thin chrome steel legs, minimalist white studio background, Scandinavian design chair"),
      aiImg("Vivid soft pink velvet stool in a concrete brutalist interior space, natural sunlight, architectural digest style")
    ],
    hoverImages: [aiImg("Vivid soft pink velvet stool in a concrete brutalist interior space, natural sunlight, architectural digest style")],
    isFeatured: true
  },
  {
    id: "prod-4",
    name: "Tubular Lounge",
    category: "Chairs",
    description: "A continuous tube creating an impossibly comfortable lounge chair.",
    material: "Powder-coated Aluminum, Cobalt Boucle",
    subTitle: "Continuous Form",
    price: 890,
    images: [
      aiImg("Cobalt blue boucle lounge chair with thick tubular aluminum frame, modern trendy design, clean off-white background"),
      aiImg("Cobalt blue boucle lounge chair in a modern living room with large windows, minimalist scandinavian interior design")
    ],
    hoverImages: [aiImg("Cobalt blue boucle lounge chair in a modern living room with large windows, minimalist scandinavian interior design")]
  },
  {
    id: "prod-5",
    name: "Glass Block Table",
    category: "Tables",
    description: "Solid, translucent block resting on thin metal legs.",
    material: "Cast Glass, Steel",
    subTitle: "Translucent Block",
    price: 1200,
    images: [
      aiImg("Translucent cast glass block side table with thin silver metal legs, elegant simple product photography, studio light"),
      aiImg("Translucent cast glass block side table casting caustic light refractions on the floor, bright sunny room")
    ],
    hoverImages: [aiImg("Translucent cast glass block side table casting caustic light refractions on the floor, bright sunny room")]
  }
];

const mockJournals: JournalArticle[] = [
  { 
    id: "j-1",
    title: "The Chrome Revival", 
    category: "Material Study", 
    date: "Oct 12",
    image: _a("close up of polished chrome texture mirroring blue room, abstract photography, minimalist"),
    contentBlocks: [
      { type: 'text', value: 'Chrome is back and it is better than ever. We explore the industrial aesthetics inside our modern living spaces.' },
      { type: 'image', value: _a("modern loft showcasing chrome elements and vivid accent colors") },
      { type: 'text', value: 'By reflecting their surroundings, chrome objects effectively camouflage themselves while simultaneously asserting their presence. This duality makes polished metals endlessly fascinating.'}
    ]
  },
  { 
    id: "j-2",
    title: "Defining Casual Uniqueness", 
    category: "Brand Ethos", 
    date: "Sep 28",
    image: _a("minimalist interior design featuring vivid pink and brushed steel, editorial lighting, architectural digest") 
  },
  { 
    id: "j-3",
    title: "Behind the Tube Lounge", 
    category: "Process", 
    date: "Sep 15",
    image: _a("behind the scenes design studio, sketches of tubular chairs, industrial workshop aesthetic") 
  }
];

const mockSpaces: SpaceModel[] = [
  {
    id: "s-1",
    title: "Physical Showroom",
    description: "Experience the interplay of industrial minimalism and vivid comfort in our flagship space. A curated environment where ordinary objects become extraordinary touchpoints.",
    images: [_a("modern minimalist showroom space in Seoul, curved walls, industrial brushed steel accents, vivid pink lighting, architectural design")],
    appliedProductIds: ["prod-1", "prod-3"]
  }
];

// Simple in-memory management
let productsStore = [...mockProducts];
let journalsStore = [...mockJournals];
let spacesStore = [...mockSpaces];

let cachedProducts: Product[] | null = null;
let productsFetchPromise: Promise<Product[]> | null = null;

export const getProducts = async (): Promise<Product[]> => {
  if (cachedProducts) {
    revalidateProducts(); // Background fetch
    return [...cachedProducts];
  }
  return revalidateProducts();
};

const revalidateProducts = async (): Promise<Product[]> => {
  if (productsFetchPromise) return productsFetchPromise;
  
  productsFetchPromise = (async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      cachedProducts = data;
      return [...cachedProducts!];
    } catch (error) {
      console.error("Failed to fetch products from DB, falling back to mock store:", error);
      cachedProducts = [...productsStore];
      return [...cachedProducts];
    } finally {
      productsFetchPromise = null;
    }
  })();
  return productsFetchPromise;
};

export const getProductById = async (id: string): Promise<Product | null> => {
  const products = await getProducts();
  return products.find(p => p.id === id) || null;
};

export const addProduct = async (product: Product): Promise<Product> => {
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error('Failed to add product via API');
    if (cachedProducts) cachedProducts = [product, ...cachedProducts];
    return product;
  } catch (error) {
    console.error("Failed to add product to DB, adding to mock store:", error);
    productsStore.push(product);
    if (cachedProducts) cachedProducts = [product, ...cachedProducts];
    return Promise.resolve(product);
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  try {
    const res = await fetch(`/api/products?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update product via API');
    if (cachedProducts) cachedProducts = cachedProducts.map(p => p.id === id ? { ...p, ...updates } : p);
    return { id, ...updates } as Product;
  } catch (error) {
    console.error("Failed to update product in DB, updating mock store:", error);
    const index = productsStore.findIndex(p => p.id === id);
    if(index !== -1) { 
      productsStore[index] = { ...productsStore[index], ...updates }; 
      if (cachedProducts) cachedProducts = cachedProducts.map(p => p.id === id ? { ...p, ...updates } : p);
      return Promise.resolve(productsStore[index]); 
    }
    return Promise.reject(new Error("Product not found"));
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product via API');
    if (cachedProducts) cachedProducts = cachedProducts.filter(p => p.id !== id);
  } catch (error) {
    console.error("Failed to delete product in DB, deleting from mock store:", error);
    productsStore = productsStore.filter(p => p.id !== id);
    if (cachedProducts) cachedProducts = cachedProducts.filter(p => p.id !== id);
    return Promise.resolve();
  }
};

let cachedSpaces: SpaceModel[] | null = null;
let spacesFetchPromise: Promise<SpaceModel[]> | null = null;

export const getSpaces = async (): Promise<SpaceModel[]> => {
  if (cachedSpaces) return [...cachedSpaces];
  if (spacesFetchPromise) return spacesFetchPromise;

  spacesFetchPromise = (async () => {
    try {
      const res = await fetch('/api/spaces');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      cachedSpaces = data;
      return [...data];
    } catch (err) {
      console.error("Failed to fetch spaces, using mocks:", err);
      cachedSpaces = [...mockSpaces];
      return [...mockSpaces];
    } finally {
      spacesFetchPromise = null;
    }
  })();
  return spacesFetchPromise;
};

export const addSpace = async (space: SpaceModel): Promise<SpaceModel> => {
  try {
    const res = await fetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(space)
    });
    if (!res.ok) throw new Error('Failed to add space');
    if (cachedSpaces) cachedSpaces = [space, ...cachedSpaces];
    return space;
  } catch (err) {
    console.error(err);
    spacesStore.push(space);
    if (cachedSpaces) cachedSpaces = [space, ...cachedSpaces];
    return space;
  }
};

export const updateSpace = async (id: string, updates: Partial<SpaceModel>): Promise<SpaceModel> => {
  try {
    const res = await fetch(`/api/spaces?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update space');
    if (cachedSpaces) cachedSpaces = cachedSpaces.map(s => s.id === id ? { ...s, ...updates } : s);
    return { id, ...updates } as SpaceModel;
  } catch (err) {
    console.error(err);
    const index = spacesStore.findIndex(s => s.id === id);
    if (index !== -1) {
      spacesStore[index] = { ...spacesStore[index], ...updates };
      if (cachedSpaces) cachedSpaces = cachedSpaces.map(s => s.id === id ? { ...s, ...updates } : s);
      return spacesStore[index];
    }
    throw new Error("Space not found");
  }
};

export const deleteSpace = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`/api/spaces?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete space');
    if (cachedSpaces) cachedSpaces = cachedSpaces.filter(s => s.id !== id);
  } catch (err) {
    console.error(err);
    spacesStore = spacesStore.filter(s => s.id !== id);
    if (cachedSpaces) cachedSpaces = cachedSpaces.filter(s => s.id !== id);
  }
};

let cachedJournals: JournalArticle[] | null = null;
let journalsFetchPromise: Promise<JournalArticle[]> | null = null;

export const getJournals = async (): Promise<JournalArticle[]> => {
  if (cachedJournals) return [...cachedJournals];
  if (journalsFetchPromise) return journalsFetchPromise;

  journalsFetchPromise = (async () => {
    try {
      const res = await fetch('/api/journals');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      cachedJournals = data;
      return [...data];
    } catch (err) {
      console.error("Failed to fetch journals, using mocks:", err);
      cachedJournals = [...mockJournals];
      return [...mockJournals];
    } finally {
      journalsFetchPromise = null;
    }
  })();
  return journalsFetchPromise;
};

export const addJournal = async (journal: JournalArticle) => {
  try {
    await fetch('/api/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(journal) });
    if (cachedJournals) cachedJournals = [journal, ...cachedJournals];
    return journal;
  } catch (err) {
    journalsStore.push(journal);
    if (cachedJournals) cachedJournals = [journal, ...cachedJournals];
    return journal;
  }
};

export const updateJournal = async (id: string, updates: Partial<JournalArticle>) => {
  try {
    await fetch(`/api/journals?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    if (cachedJournals) cachedJournals = cachedJournals.map(j => j.id === id ? { ...j, ...updates } : j);
    return { id, ...updates } as JournalArticle;
  } catch (err) {
    const index = journalsStore.findIndex(j => j.id === id);
    if (index !== -1) { journalsStore[index] = { ...journalsStore[index], ...updates }; return journalsStore[index]; }
    throw new Error("Journal not found");
  }
};

export const deleteJournal = async (id: string) => {
  try {
    await fetch(`/api/journals?id=${id}`, { method: 'DELETE' });
    if (cachedJournals) cachedJournals = cachedJournals.filter(j => j.id !== id);
  } catch (err) {
    journalsStore = journalsStore.filter(j => j.id !== id);
    if (cachedJournals) cachedJournals = cachedJournals.filter(j => j.id !== id);
  }
};

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface CategoryIntro {
  title: string;
  description: string;
  image: string;
}

export interface HomeSettings {
  title: string; // legacy, keeping for compatibility
  subtitle: string; // legacy
  description: string;
  marquee: string;
  featuredProductIds: string[];
  globalProductOrder: string[];
  heroSlides: HeroSlide[];
  heroTransitionSpeed: number; // in seconds
  intros: {
    collection: CategoryIntro;
    space: CategoryIntro;
    journal: CategoryIntro;
  };
}

export const defaultHomeSettings: HomeSettings = {
  title: "Amplify\nYour\nOrdinary.",
  subtitle: "The Muse — Vol 01",
  description: "Transforming the mundane into unique experiences through chrome, steel, and vivid textures.",
  marquee: "Amplify Your Ordinary",
  featuredProductIds: [],
  globalProductOrder: [],
  heroSlides: [
    { id: '1', title: "Amplify\nYour\nOrdinary.", subtitle: "The Muse — Vol 01", image: '' }
  ],
  heroTransitionSpeed: 5,
  intros: {
    collection: { title: 'Collection', description: 'Curated objects for modern living.', image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?q=80&w=1974&auto=format&fit=crop' },
    space: { title: 'Space', description: 'Industrial minimalism in Seoul.', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070&auto=format&fit=crop' },
    journal: { title: 'Journal', description: 'Studies in chrome and steel.', image: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=1974&auto=format&fit=crop' }
  }
};

let cachedHomeSettings: HomeSettings | null = null;
let homeSettingsFetchPromise: Promise<HomeSettings> | null = null;

export const getHomeSettings = async (): Promise<HomeSettings> => {
  if (cachedHomeSettings) {
    revalidateHomeSettings();
    return { ...cachedHomeSettings };
  }
  return revalidateHomeSettings();
};

const revalidateHomeSettings = async (): Promise<HomeSettings> => {
  if (homeSettingsFetchPromise) return homeSettingsFetchPromise;

  homeSettingsFetchPromise = (async () => {
    try {
      const res = await fetch('/api/settings?id=home');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      cachedHomeSettings = { ...defaultHomeSettings, ...data };
      return { ...cachedHomeSettings! };
    } catch (err) {
      console.error(err);
      cachedHomeSettings = defaultHomeSettings;
      return { ...cachedHomeSettings };
    } finally {
      homeSettingsFetchPromise = null;
    }
  })();
  return homeSettingsFetchPromise;
};

export const updateHomeSettings = async (settings: HomeSettings): Promise<void> => {
  try {
    const res = await fetch('/api/settings?id=home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    cachedHomeSettings = settings;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const deleteBlob = async (url: string): Promise<void> => {
  if (!url || !url.includes('public.blob.vercel-storage.com')) return;
  try {
    await fetch('/api/delete-blob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  } catch (error) {
    console.error("Failed to delete blob:", error);
  }
};
