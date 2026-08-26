import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  // Auto-setup
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        "subTitle" TEXT,
        material TEXT,
        price NUMERIC,
        images TEXT,
        "hoverImages" TEXT,
        "contentBlocks" TEXT,
        "isFeatured" BOOLEAN DEFAULT FALSE,
        dimensions TEXT,
        shipping TEXT,
        sku TEXT,
        color TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "subTitle" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "dimensions" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "shipping" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "sku" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "cartEnabled" BOOLEAN DEFAULT TRUE`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "portraitImages" TEXT DEFAULT '[]'`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "relatedProductIds" TEXT DEFAULT '[]'`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "relatedSpaceIds" TEXT DEFAULT '[]'`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "relatedJournalIds" TEXT DEFAULT '[]'`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "bodyColors" TEXT DEFAULT '[]'`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "fabricColors" TEXT DEFAULT '[]'`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "lookbookTitle" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "lookbookSubtitle" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "lookbookEnabled" BOOLEAN DEFAULT TRUE`; } catch(e) {}
  } catch (e) {}

  if (req.method === 'GET') {
    try {
      const safeParse = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
              const res = JSON.parse(trimmed);
              return Array.isArray(res) ? res : [res];
            } catch(e) {
              return [];
            }
          }
          if (trimmed) return [trimmed];
        }
        return [];
      };

      const { rows } = await sql`SELECT * FROM products ORDER BY "createdAt" DESC`;
      const parsedRows = rows.map(r => {
        let colorParsed = r.color || '';
        if (typeof r.color === 'string' && r.color.trim().startsWith('[')) {
          try {
            colorParsed = JSON.parse(r.color);
          } catch (e) {
            colorParsed = r.color;
          }
        }
        return {
          ...r,
          images: safeParse(r.images),
          hoverImages: safeParse(r.hoverImages),
          contentBlocks: safeParse(r.contentBlocks),
          color: colorParsed,
          bodyColors: safeParse(r.bodyColors),
          fabricColors: safeParse(r.fabricColors),
          cartEnabled: r.cartEnabled !== false,
          portraitImages: safeParse(r.portraitImages),
          relatedProductIds: safeParse(r.relatedProductIds),
          relatedSpaceIds: safeParse(r.relatedSpaceIds),
          relatedJournalIds: safeParse(r.relatedJournalIds),
          lookbookTitle: r.lookbookTitle || '',
          lookbookSubtitle: r.lookbookSubtitle || '',
          lookbookEnabled: r.lookbookEnabled !== false
        };
      });
      return res.status(200).json(parsedRows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  if (req.method === 'POST') {
    try {
      const b = req.body || {};
      const newId = b.id || `prod-${Date.now()}`;
      const name = b.name || '';
      const category = b.category || 'Objects';
      const description = b.description || '';
      const subTitle = b.subTitle || '';
      const material = b.material || '';
      const price = b.price !== undefined && b.price !== '' && !isNaN(Number(b.price)) ? Number(b.price) : 0;
      const images = Array.isArray(b.images) ? b.images : [];
      const hoverImages = Array.isArray(b.hoverImages) ? b.hoverImages : [];
      const contentBlocks = Array.isArray(b.contentBlocks) ? b.contentBlocks : [];
      const isFeatured = Boolean(b.isFeatured);
      const dimensions = b.dimensions || '';
      const shipping = b.shipping || '';
      const sku = b.sku || '';
      const color = b.color !== undefined ? (typeof b.color === 'string' ? b.color : JSON.stringify(b.color)) : '[]';
      const bodyColors = Array.isArray(b.bodyColors) ? b.bodyColors : [];
      const fabricColors = Array.isArray(b.fabricColors) ? b.fabricColors : [];
      const cartEnabled = b.cartEnabled !== false;
      const portraitImages = Array.isArray(b.portraitImages) ? b.portraitImages : [];
      const relatedProductIds = Array.isArray(b.relatedProductIds) ? b.relatedProductIds : [];
      const relatedSpaceIds = Array.isArray(b.relatedSpaceIds) ? b.relatedSpaceIds : [];
      const relatedJournalIds = Array.isArray(b.relatedJournalIds) ? b.relatedJournalIds : [];
      const lookbookTitle = b.lookbookTitle || '';
      const lookbookSubtitle = b.lookbookSubtitle || '';
      const lookbookEnabled = b.lookbookEnabled !== false;

      await sql`
        INSERT INTO products (
          id, name, category, description, "subTitle", material, price, images, "hoverImages", "contentBlocks", "isFeatured", dimensions, shipping, sku, color, "bodyColors", "fabricColors", "cartEnabled", "portraitImages", "relatedProductIds", "relatedSpaceIds", "relatedJournalIds", "lookbookTitle", "lookbookSubtitle", "lookbookEnabled"
        ) VALUES (
          ${newId}, ${name}, ${category}, ${description}, ${subTitle}, ${material}, ${price}, 
          ${JSON.stringify(images)}, 
          ${JSON.stringify(hoverImages)}, 
          ${JSON.stringify(contentBlocks)}, 
          ${isFeatured},
          ${dimensions},
          ${shipping},
          ${sku},
          ${color},
          ${JSON.stringify(bodyColors)},
          ${JSON.stringify(fabricColors)},
          ${cartEnabled},
          ${JSON.stringify(portraitImages)},
          ${JSON.stringify(relatedProductIds)},
          ${JSON.stringify(relatedSpaceIds)},
          ${JSON.stringify(relatedJournalIds)},
          ${lookbookTitle},
          ${lookbookSubtitle},
          ${lookbookEnabled}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          "subTitle" = EXCLUDED."subTitle",
          material = EXCLUDED.material,
          price = EXCLUDED.price,
          images = EXCLUDED.images,
          "hoverImages" = EXCLUDED."hoverImages",
          "contentBlocks" = EXCLUDED."contentBlocks",
          "isFeatured" = EXCLUDED."isFeatured",
          dimensions = EXCLUDED.dimensions,
          shipping = EXCLUDED.shipping,
          sku = EXCLUDED.sku,
          color = EXCLUDED.color,
          "bodyColors" = EXCLUDED."bodyColors",
          "fabricColors" = EXCLUDED."fabricColors",
          "cartEnabled" = EXCLUDED."cartEnabled",
          "portraitImages" = EXCLUDED."portraitImages",
          "relatedProductIds" = EXCLUDED."relatedProductIds",
          "relatedSpaceIds" = EXCLUDED."relatedSpaceIds",
          "relatedJournalIds" = EXCLUDED."relatedJournalIds",
          "lookbookTitle" = EXCLUDED."lookbookTitle",
          "lookbookSubtitle" = EXCLUDED."lookbookSubtitle",
          "lookbookEnabled" = EXCLUDED."lookbookEnabled"
      `;
      return res.status(201).json({ success: true, id: newId });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to insert' });
    }
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      const b = req.body || {};
      const name = b.name || '';
      const category = b.category || 'Objects';
      const description = b.description || '';
      const subTitle = b.subTitle || '';
      const material = b.material || '';
      const price = b.price !== undefined && b.price !== '' && !isNaN(Number(b.price)) ? Number(b.price) : 0;
      const images = Array.isArray(b.images) ? b.images : [];
      const hoverImages = Array.isArray(b.hoverImages) ? b.hoverImages : [];
      const contentBlocks = Array.isArray(b.contentBlocks) ? b.contentBlocks : [];
      const isFeatured = Boolean(b.isFeatured);
      const dimensions = b.dimensions || '';
      const shipping = b.shipping || '';
      const sku = b.sku || '';
      const color = b.color !== undefined ? (typeof b.color === 'string' ? b.color : JSON.stringify(b.color)) : '[]';
      const bodyColors = Array.isArray(b.bodyColors) ? b.bodyColors : [];
      const fabricColors = Array.isArray(b.fabricColors) ? b.fabricColors : [];
      const cartEnabled = b.cartEnabled !== false;
      const portraitImages = Array.isArray(b.portraitImages) ? b.portraitImages : [];
      const relatedProductIds = Array.isArray(b.relatedProductIds) ? b.relatedProductIds : [];
      const relatedSpaceIds = Array.isArray(b.relatedSpaceIds) ? b.relatedSpaceIds : [];
      const relatedJournalIds = Array.isArray(b.relatedJournalIds) ? b.relatedJournalIds : [];
      const lookbookTitle = b.lookbookTitle || '';
      const lookbookSubtitle = b.lookbookSubtitle || '';
      const lookbookEnabled = b.lookbookEnabled !== false;

      await sql`
        UPDATE products SET 
          name = ${name}, 
          category = ${category}, 
          description = ${description}, 
          "subTitle" = ${subTitle},
          material = ${material}, 
          price = ${price}, 
          images = ${JSON.stringify(images)}, 
          "hoverImages" = ${JSON.stringify(hoverImages)}, 
          "contentBlocks" = ${JSON.stringify(contentBlocks)}, 
          "isFeatured" = ${isFeatured},
          dimensions = ${dimensions},
          shipping = ${shipping},
          sku = ${sku},
          color = ${color},
          "bodyColors" = ${JSON.stringify(bodyColors)},
          "fabricColors" = ${JSON.stringify(fabricColors)},
          "cartEnabled" = ${cartEnabled},
          "portraitImages" = ${JSON.stringify(portraitImages)},
          "relatedProductIds" = ${JSON.stringify(relatedProductIds)},
          "relatedSpaceIds" = ${JSON.stringify(relatedSpaceIds)},
          "relatedJournalIds" = ${JSON.stringify(relatedJournalIds)},
          "lookbookTitle" = ${lookbookTitle},
          "lookbookSubtitle" = ${lookbookSubtitle},
          "lookbookEnabled" = ${lookbookEnabled}
        WHERE id = ${id}
      `;
      return res.status(200).json({ success: true, id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update' });
    }
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
