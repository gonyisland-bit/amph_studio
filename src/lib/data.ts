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

const mockProducts: Product[] = [];

const mockJournals: JournalArticle[] = [];

const mockSpaces: SpaceModel[] = [];

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
      console.error("Failed to fetch products from DB:", error);
      cachedProducts = [];
      return [];
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
      console.error("Failed to fetch spaces:", err);
      cachedSpaces = [];
      return [];
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

export const getSpaceById = async (id: string): Promise<SpaceModel | null> => {
  const spaces = await getSpaces();
  return spaces.find(s => s.id === id) || null;
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
      console.error("Failed to fetch journals:", err);
      cachedJournals = [];
      return [];
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

export const getJournalById = async (id: string): Promise<JournalArticle | null> => {
  const journals = await getJournals();
  return journals.find(j => j.id === id) || null;
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
  title: "",
  subtitle: "",
  description: "",
  marquee: "Amplify Your Ordinary",
  featuredProductIds: [],
  globalProductOrder: [],
  heroSlides: [
    { id: '1', title: "", subtitle: "", image: '' }
  ],
  heroTransitionSpeed: 5,
  intros: {
    collection: { title: 'Collection', description: '', image: '' },
    space: { title: 'Space', description: '', image: '' },
    journal: { title: 'Journal', description: '', image: '' }
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
