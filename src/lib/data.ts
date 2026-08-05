export type Category = 'Chairs' | 'Furniture' | 'Lighting' | 'Objects';

export interface ContentBlock {
  id?: string;
  type: 'text' | 'image';
  value: string;
  caption?: string;
}

export interface ColorOption {
  name: string;
  hex: string;
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
  sku?: string; // Product Code (제품코드)
  color?: string | ColorOption[];
  cartEnabled?: boolean;
  portraitImages?: string[];
  relatedProductIds?: string[];
  relatedSpaceIds?: string[];
  relatedJournalIds?: string[];
}

export const generateProductCode = (category: string, name: string): string => {
  let prefix = 'OB';
  const catLower = (category || '').toLowerCase();
  if (catLower.includes('furniture') || catLower.includes('table')) prefix = 'FU';
  else if (catLower.includes('chair')) prefix = 'CH';
  else if (catLower.includes('light')) prefix = 'LI';
  else if (catLower.includes('object')) prefix = 'OB';

  const cleanName = (name || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  const nameCode = cleanName.length >= 2 ? cleanName.slice(0, 2) : (cleanName + 'XX').slice(0, 2);

  let numHash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    numHash = (numHash << 5) - numHash + (name || '').charCodeAt(i);
    numHash |= 0;
  }
  const num4 = String(1000 + Math.abs(numHash) % 9000).padStart(4, '0');

  return `${prefix}-${nameCode}${num4}`;
};

export interface JournalArticle {
  id: string;
  title: string;
  description?: string;
  category?: string;
  date?: string;
  image: string;
  featured?: boolean;
  relatedJournalIds?: string[];
  appliedProductIds?: string[];
  contentBlocks?: ContentBlock[];
}

export interface SpaceModel {
  id: string;
  title: string;
  description: string;
  images: string[];
  image?: string;
  featured?: boolean;
  relatedSpaceIds?: string[];
  appliedProductIds?: string[];
  contentBlocks?: ContentBlock[];
}

// Global cache and fetch promises
let cachedProducts: Product[] | null = null;
let productsFetchPromise: Promise<Product[]> | null = null;

let cachedSpaces: SpaceModel[] | null = null;
let spacesFetchPromise: Promise<SpaceModel[]> | null = null;

let cachedJournals: JournalArticle[] | null = null;
let journalsFetchPromise: Promise<JournalArticle[]> | null = null;

// Helper to handle revalidation pattern
const handleGet = async <T>(
  cached: T | null,
  fetchPromise: Promise<T> | null,
  revalidateFn: () => Promise<T>
): Promise<T> => {
  if (cached) {
    revalidateFn(); // Trigger background fetch
    return cached;
  }
  return revalidateFn();
};

// --- Products ---

export const getProducts = async (): Promise<Product[]> => {
  return handleGet(cachedProducts, productsFetchPromise, revalidateProducts);
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
      console.error("Failed to fetch products:", error);
      // Don't set cachedProducts to [] if it was null, to allow retries
      return cachedProducts || [];
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
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Failed to add product');
  if (cachedProducts) cachedProducts = [product, ...cachedProducts];
  return product;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  const res = await fetch(`/api/products?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update product');
  if (cachedProducts) cachedProducts = cachedProducts.map(p => p.id === id ? { ...p, ...updates } : p);
  return { id, ...updates } as Product;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
  if (cachedProducts) cachedProducts = cachedProducts.filter(p => p.id !== id);
};

// --- Spaces ---

export const getSpaces = async (): Promise<SpaceModel[]> => {
  return handleGet(cachedSpaces, spacesFetchPromise, revalidateSpaces);
};

const revalidateSpaces = async (): Promise<SpaceModel[]> => {
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
      return cachedSpaces || [];
    } finally {
      spacesFetchPromise = null;
    }
  })();
  return spacesFetchPromise;
};

export const addSpace = async (space: SpaceModel): Promise<SpaceModel> => {
  const res = await fetch('/api/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(space)
  });
  if (!res.ok) throw new Error('Failed to add space');
  if (cachedSpaces) cachedSpaces = [space, ...cachedSpaces];
  return space;
};

export const updateSpace = async (id: string, updates: Partial<SpaceModel>): Promise<SpaceModel> => {
  const res = await fetch(`/api/spaces?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update space');
  if (cachedSpaces) cachedSpaces = cachedSpaces.map(s => s.id === id ? { ...s, ...updates } : s);
  return { id, ...updates } as SpaceModel;
};

export const getSpaceById = async (id: string): Promise<SpaceModel | null> => {
  const spaces = await getSpaces();
  return spaces.find(s => s.id === id) || null;
};

export const deleteSpace = async (id: string): Promise<void> => {
  const res = await fetch(`/api/spaces?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete space');
  if (cachedSpaces) cachedSpaces = cachedSpaces.filter(s => s.id !== id);
};

// --- Journals ---

export const getJournals = async (): Promise<JournalArticle[]> => {
  return handleGet(cachedJournals, journalsFetchPromise, revalidateJournals);
};

const revalidateJournals = async (): Promise<JournalArticle[]> => {
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
      return cachedJournals || [];
    } finally {
      journalsFetchPromise = null;
    }
  })();
  return journalsFetchPromise;
};

export const addJournal = async (journal: JournalArticle) => {
  const res = await fetch('/api/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(journal) });
  if (!res.ok) throw new Error('Failed to add journal');
  if (cachedJournals) cachedJournals = [journal, ...cachedJournals];
  return journal;
};

export const updateJournal = async (id: string, updates: Partial<JournalArticle>) => {
  const res = await fetch(`/api/journals?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
  if (!res.ok) throw new Error('Failed to update journal');
  if (cachedJournals) cachedJournals = cachedJournals.map(j => j.id === id ? { ...j, ...updates } : j);
  return { id, ...updates } as JournalArticle;
};

export const getJournalById = async (id: string): Promise<JournalArticle | null> => {
  const journals = await getJournals();
  return journals.find(j => j.id === id) || null;
};

export const deleteJournal = async (id: string) => {
  const res = await fetch(`/api/journals?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete journal');
  if (cachedJournals) cachedJournals = cachedJournals.filter(j => j.id !== id);
};

// --- Settings ---

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

export interface HubPageSettings {
  title: string;
  description: string;
  image: string;
}

export interface PhilosophyCard {
  title: string;
  quote: string;
  author: string;
}

export const defaultColorAssets: ColorOption[] = [
  { name: 'Oak', hex: '#d7c29d' },
  { name: 'Ash', hex: '#e5dec9' },
  { name: 'Walnut', hex: '#4b382a' },
  { name: 'Steel', hex: '#8a9597' },
  { name: 'Black', hex: '#1c1c1c' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Cobalt', hex: '#0047AB' },
  { name: 'Orange', hex: '#FF4500' },
  { name: 'Pink', hex: '#F8BBD0' },
  { name: 'Silver', hex: '#E0E0E2' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Cream', hex: '#FFFDD0' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Natural', hex: '#e8d8c1' }
];

export interface HomeSettings {
  logoType?: 'text' | 'image';
  logoImage?: string;
  membersOnly?: boolean;
  featuredProductIds: string[];
  globalProductOrder: string[];
  spaceOrder: string[];
  journalOrder: string[];
  heroSlides: HeroSlide[];
  heroTransitionSpeed: number;
  marquee: string;
  colorAssets?: ColorOption[];
  intros: {
    collection: CategoryIntro;
    space: CategoryIntro;
    journal: CategoryIntro;
  };
  mainTitle: string;
  mainSubTitle: string;
  hubSettings: {
    collection: HubPageSettings;
    space: HubPageSettings;
    journal: HubPageSettings;
  };
  philosophy1?: PhilosophyCard;
  philosophy2?: PhilosophyCard;
}

export const defaultHomeSettings: HomeSettings = {
  logoType: 'image',
  logoImage: '/logo.png',
  membersOnly: false,
  heroSlides: [],
  heroTransitionSpeed: 5,
  spaceOrder: [],
  journalOrder: [],
  marquee: 'Amplify Your Ordinary',
  colorAssets: defaultColorAssets,
  intros: {
    collection: { title: '', description: '', image: '' },
    space: { title: '', description: '', image: '' },
    journal: { title: '', description: '', image: '' }
  },
  featuredProductIds: [],
  globalProductOrder: [],
  mainTitle: 'AMPH STUDIO',
  mainSubTitle: 'DESIGN & OBJECT',
  hubSettings: {
    collection: { title: 'COLLECTION', description: 'Curated design objects.', image: '' },
    space: { title: 'SPACES', description: 'Inspirational environments.', image: '' },
    journal: { title: 'JOURNAL', description: 'Stories and updates.', image: '' }
  },
  philosophy1: {
    title: 'Design Philosophy',
    quote: 'Form follows function, but also emotion. Sensory simplicity for modern architectural spaces.',
    author: '// AMPH ORIGINALS'
  },
  philosophy2: {
    title: 'Materiality',
    quote: 'Materials tell stories. Raw timber, hand-finished steel, sensory wool, and architectural tension.',
    author: '// HONEST CRAFT'
  }
};

let cachedHomeSettings: HomeSettings | null = null;
let homeSettingsFetchPromise: Promise<HomeSettings> | null = null;

export const getHomeSettings = async (): Promise<HomeSettings> => {
  return handleGet(cachedHomeSettings, homeSettingsFetchPromise, revalidateHomeSettings);
};

const revalidateHomeSettings = async (): Promise<HomeSettings> => {
  if (homeSettingsFetchPromise) return homeSettingsFetchPromise;

  homeSettingsFetchPromise = (async () => {
    try {
      const res = await fetch('/api/settings?id=home');
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      cachedHomeSettings = { 
        ...defaultHomeSettings, 
        ...data,
        intros: { ...defaultHomeSettings.intros, ...(data.intros || {}) },
        hubSettings: { ...defaultHomeSettings.hubSettings, ...(data.hubSettings || {}) },
        philosophy1: { ...defaultHomeSettings.philosophy1, ...(data.philosophy1 || {}) },
        philosophy2: { ...defaultHomeSettings.philosophy2, ...(data.philosophy2 || {}) }
      };
      return { ...cachedHomeSettings! };
    } catch (err) {
      console.error(err);
      return cachedHomeSettings || defaultHomeSettings;
    } finally {
      homeSettingsFetchPromise = null;
    }
  })();
  return homeSettingsFetchPromise;
};

export const updateHomeSettings = async (settings: HomeSettings): Promise<void> => {
  const res = await fetch('/api/settings?id=home', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  cachedHomeSettings = settings;
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
