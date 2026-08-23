import { useState, useEffect } from 'react';

const WISHLIST_STORAGE_KEY = 'amph_wishlist_ids';

export function getWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read wishlist from localStorage:', e);
    return [];
  }
}

export function saveWishlist(ids: string[]): void {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event('wishlist_change'));
  } catch (e) {
    console.error('Failed to save wishlist to localStorage:', e);
  }
}

export function toggleWishlist(productId: string): boolean {
  const current = getWishlist();
  let next: string[];
  let added = false;
  if (current.includes(productId)) {
    next = current.filter(id => id !== productId);
    added = false;
  } else {
    next = [productId, ...current];
    added = true;
  }
  saveWishlist(next);
  return added;
}

export function isInWishlist(productId: string): boolean {
  return getWishlist().includes(productId);
}

export function clearWishlist(): void {
  saveWishlist([]);
}

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>(() => getWishlist());

  useEffect(() => {
    const handleUpdate = () => {
      setWishlist(getWishlist());
    };

    window.addEventListener('wishlist_change', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('wishlist_change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const toggle = (productId: string) => {
    return toggleWishlist(productId);
  };

  const isSaved = (productId: string) => {
    return wishlist.includes(productId);
  };

  return {
    wishlist,
    count: wishlist.length,
    toggle,
    isSaved,
    clear: clearWishlist
  };
}
