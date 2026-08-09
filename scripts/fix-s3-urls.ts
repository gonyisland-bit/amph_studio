import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sql } from '@vercel/postgres';

const publicDomain = 'https://pub-94c593a632bd4cc28bc78fa5240e509b.r2.dev';

function normalizeMediaUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('.r2.cloudflarestorage.com') || (url.includes('.r2.dev') && !url.includes('pub-94c593a632bd4cc28bc78fa5240e509b.r2.dev'))) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.replace(/^\//, '');
      const cleanKey = pathname.replace(/^amphstudio\//, '');
      if (cleanKey) {
        return `${publicDomain}/${cleanKey}`;
      }
    } catch (e) {
      return url;
    }
  }

  return url;
}

async function fixProducts() {
  console.log('\n--- Normalizing Products S3 URLs ---');
  const { rows } = await sql`SELECT * FROM products`;
  for (const p of rows) {
    let modified = false;
    let images: string[] = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
    let hoverImages: string[] = typeof p.hoverImages === 'string' ? JSON.parse(p.hoverImages) : (p.hoverImages || []);
    let contentBlocks = typeof p.contentBlocks === 'string' ? JSON.parse(p.contentBlocks) : (p.contentBlocks || []);

    const newImages = images.map(img => {
      const norm = normalizeMediaUrl(img);
      if (norm !== img) modified = true;
      return norm;
    });

    const newHover = hoverImages.map(h => {
      const norm = normalizeMediaUrl(h);
      if (norm !== h) modified = true;
      return norm;
    });

    const newBlocks = contentBlocks.map((cb: any) => {
      if (cb && cb.type === 'image' && cb.value) {
        const norm = normalizeMediaUrl(cb.value);
        if (norm !== cb.value) modified = true;
        return { ...cb, value: norm };
      }
      return cb;
    });

    if (modified) {
      await sql`
        UPDATE products SET 
          images = ${JSON.stringify(newImages)},
          "hoverImages" = ${JSON.stringify(newHover)},
          "contentBlocks" = ${JSON.stringify(newBlocks)}
        WHERE id = ${p.id}
      `;
      console.log(`Updated S3 URLs for product: ${p.name} (${p.id})`);
    }
  }
}

async function fixSpaces() {
  console.log('\n--- Normalizing Spaces S3 URLs ---');
  const { rows } = await sql`SELECT * FROM spaces`;
  for (const s of rows) {
    let modified = false;
    let images: string[] = typeof s.images === 'string' ? JSON.parse(s.images) : (s.images || []);
    let contentBlocks = typeof s.contentBlocks === 'string' ? JSON.parse(s.contentBlocks) : (s.contentBlocks || []);

    const newImages = images.map(img => {
      const norm = normalizeMediaUrl(img);
      if (norm !== img) modified = true;
      return norm;
    });

    const newBlocks = contentBlocks.map((cb: any) => {
      if (cb && cb.type === 'image' && cb.value) {
        const norm = normalizeMediaUrl(cb.value);
        if (norm !== cb.value) modified = true;
        return { ...cb, value: norm };
      }
      return cb;
    });

    if (modified) {
      await sql`
        UPDATE spaces SET 
          images = ${JSON.stringify(newImages)},
          "contentBlocks" = ${JSON.stringify(newBlocks)}
        WHERE id = ${s.id}
      `;
      console.log(`Updated S3 URLs for space: ${s.title} (${s.id})`);
    }
  }
}

async function fixJournals() {
  console.log('\n--- Normalizing Journals S3 URLs ---');
  const { rows } = await sql`SELECT * FROM journals`;
  for (const j of rows) {
    let modified = false;
    let heroImg = j.image ? normalizeMediaUrl(j.image) : j.image;
    if (heroImg !== j.image) modified = true;

    let contentBlocks = typeof j.contentBlocks === 'string' ? JSON.parse(j.contentBlocks) : (j.contentBlocks || []);
    const newBlocks = contentBlocks.map((cb: any) => {
      if (cb && cb.type === 'image' && cb.value) {
        const norm = normalizeMediaUrl(cb.value);
        if (norm !== cb.value) modified = true;
        return { ...cb, value: norm };
      }
      return cb;
    });

    if (modified) {
      await sql`
        UPDATE journals SET 
          image = ${heroImg},
          "contentBlocks" = ${JSON.stringify(newBlocks)}
        WHERE id = ${j.id}
      `;
      console.log(`Updated S3 URLs for journal: ${j.title} (${j.id})`);
    }
  }
}

async function main() {
  console.log('=== Database S3 URL Normalization Started ===');
  try {
    await fixProducts();
    await fixSpaces();
    await fixJournals();
    console.log('\n=== Database S3 URL Normalization Completed Successfully ===');
  } catch (error) {
    console.error('Database normalization error:', error);
  }
}

main();
