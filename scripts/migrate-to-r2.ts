import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sql } from '@vercel/postgres';

const accountId = process.env.R2_ACCOUNT_ID || 'bd0c90c36c628664f396ac294fa0e863';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'bd3036bba21c44bb0a777a530a045598';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.R2_BUCKET_NAME || 'amphstudio';
const publicDomain = (process.env.R2_PUBLIC_DOMAIN || `https://pub-${accountId}.r2.dev`).replace(/\/$/, '');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function uploadToR2(vercelUrl: string): Promise<string> {
  if (!vercelUrl || !vercelUrl.includes('public.blob.vercel-storage.com')) {
    return vercelUrl;
  }

  console.log(`[Migrating] Downloading: ${vercelUrl}`);
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || '';
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  };
  if (blobToken) {
    headers['Authorization'] = `Bearer ${blobToken}`;
  }

  let res = await fetch(vercelUrl, { headers });
  if (!res.ok && blobToken) {
    // Retry without auth header if Vercel Blob token fails on public url
    res = await fetch(vercelUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  }

  if (!res.ok) {
    console.error(`[Error] Failed to download ${vercelUrl}: ${res.status} ${res.statusText}`);
    return vercelUrl;
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const urlObj = new URL(vercelUrl);
  const pathname = urlObj.pathname.split('/').pop() || `file-${Date.now()}`;
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const key = `migrated/${Date.now()}-${pathname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  console.log(`[Uploading] Saving to R2: ${key}`);
  await r2.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  const newUrl = `${publicDomain}/${key}`;
  console.log(`[Success] Migrated: ${newUrl}`);
  return newUrl;
}

async function migrateProducts() {
  console.log('\n--- Migrating Products ---');
  const { rows } = await sql`SELECT * FROM products`;
  for (const p of rows) {
    let modified = false;
    let images: string[] = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
    let hoverImages: string[] = typeof p.hoverImages === 'string' ? JSON.parse(p.hoverImages) : (p.hoverImages || []);
    let contentBlocks = typeof p.contentBlocks === 'string' ? JSON.parse(p.contentBlocks) : (p.contentBlocks || []);

    const newImages = [];
    for (const img of images) {
      if (img && img.includes('public.blob.vercel-storage.com')) {
        const migrated = await uploadToR2(img);
        newImages.push(migrated);
        modified = true;
      } else {
        newImages.push(img);
      }
    }

    const newHover = [];
    for (const h of hoverImages) {
      if (h && h.includes('public.blob.vercel-storage.com')) {
        const migrated = await uploadToR2(h);
        newHover.push(migrated);
        modified = true;
      } else {
        newHover.push(h);
      }
    }

    const newBlocks = [];
    for (const cb of contentBlocks) {
      if (cb && cb.type === 'image' && cb.value && cb.value.includes('public.blob.vercel-storage.com')) {
        const migrated = await uploadToR2(cb.value);
        newBlocks.push({ ...cb, value: migrated });
        modified = true;
      } else {
        newBlocks.push(cb);
      }
    }

    if (modified) {
      await sql`
        UPDATE products SET 
          images = ${JSON.stringify(newImages)},
          "hoverImages" = ${JSON.stringify(newHover)},
          "contentBlocks" = ${JSON.stringify(newBlocks)}
        WHERE id = ${p.id}
      `;
      console.log(`Updated product in DB: ${p.name} (${p.id})`);
    }
  }
}

async function migrateSpaces() {
  console.log('\n--- Migrating Spaces ---');
  const { rows } = await sql`SELECT * FROM spaces`;
  for (const s of rows) {
    let modified = false;
    let images: string[] = typeof s.images === 'string' ? JSON.parse(s.images) : (s.images || []);
    let contentBlocks = typeof s.contentBlocks === 'string' ? JSON.parse(s.contentBlocks) : (s.contentBlocks || []);

    const newImages = [];
    for (const img of images) {
      if (img && img.includes('public.blob.vercel-storage.com')) {
        const migrated = await uploadToR2(img);
        newImages.push(migrated);
        modified = true;
      } else {
        newImages.push(img);
      }
    }

    const newBlocks = [];
    for (const cb of contentBlocks) {
      if (cb && cb.type === 'image' && cb.value && cb.value.includes('public.blob.vercel-storage.com')) {
        const migrated = await uploadToR2(cb.value);
        newBlocks.push({ ...cb, value: migrated });
        modified = true;
      } else {
        newBlocks.push(cb);
      }
    }

    if (modified) {
      await sql`
        UPDATE spaces SET 
          images = ${JSON.stringify(newImages)},
          "contentBlocks" = ${JSON.stringify(newBlocks)}
        WHERE id = ${s.id}
      `;
      console.log(`Updated space in DB: ${s.title} (${s.id})`);
    }
  }
}

async function migrateJournals() {
  console.log('\n--- Migrating Journals ---');
  const { rows } = await sql`SELECT * FROM journals`;
  for (const j of rows) {
    let modified = false;
    let heroImg = j.image;
    let contentBlocks = typeof j.contentBlocks === 'string' ? JSON.parse(j.contentBlocks) : (j.contentBlocks || []);

    if (heroImg && heroImg.includes('public.blob.vercel-storage.com')) {
      heroImg = await uploadToR2(heroImg);
      modified = true;
    }

    const newBlocks = [];
    for (const cb of contentBlocks) {
      if (cb && cb.type === 'image' && cb.value && cb.value.includes('public.blob.vercel-storage.com')) {
        const migrated = await uploadToR2(cb.value);
        newBlocks.push({ ...cb, value: migrated });
        modified = true;
      } else {
        newBlocks.push(cb);
      }
    }

    if (modified) {
      await sql`
        UPDATE journals SET 
          image = ${heroImg},
          "contentBlocks" = ${JSON.stringify(newBlocks)}
        WHERE id = ${j.id}
      `;
      console.log(`Updated journal in DB: ${j.title} (${j.id})`);
    }
  }
}

async function main() {
  console.log('=== Cloudflare R2 Migration Started ===');
  if (!secretAccessKey) {
    console.error('[CRITICAL] R2_SECRET_ACCESS_KEY is empty! Please set the 64-character S3 Secret Access Key in .env.local before running the migration.');
    process.exit(1);
  }

  try {
    await migrateProducts();
    await migrateSpaces();
    await migrateJournals();
    console.log('\n=== Cloudflare R2 Migration Completed Successfully ===');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

main();
