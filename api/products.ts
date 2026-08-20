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
  } catch (e) {}

  if (req.method === 'GET') {
    try {
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
          images: typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []),
          hoverImages: typeof r.hoverImages === 'string' ? JSON.parse(r.hoverImages) : (r.hoverImages || []),
          contentBlocks: typeof r.contentBlocks === 'string' ? JSON.parse(r.contentBlocks) : (r.contentBlocks || []),
          color: colorParsed,
          bodyColors: typeof r.bodyColors === 'string' ? JSON.parse(r.bodyColors) : (r.bodyColors || []),
          fabricColors: typeof r.fabricColors === 'string' ? JSON.parse(r.fabricColors) : (r.fabricColors || []),
          cartEnabled: r.cartEnabled !== false,
          portraitImages: typeof r.portraitImages === 'string' ? JSON.parse(r.portraitImages) : (r.portraitImages || []),
          relatedProductIds: typeof r.relatedProductIds === 'string' ? JSON.parse(r.relatedProductIds) : (r.relatedProductIds || []),
          relatedSpaceIds: typeof r.relatedSpaceIds === 'string' ? JSON.parse(r.relatedSpaceIds) : (r.relatedSpaceIds || []),
          relatedJournalIds: typeof r.relatedJournalIds === 'string' ? JSON.parse(r.relatedJournalIds) : (r.relatedJournalIds || [])
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
      const { id: newId, name, category, description, subTitle, material, price, images, hoverImages, contentBlocks, isFeatured, dimensions, shipping, sku, color, bodyColors, fabricColors, cartEnabled, portraitImages, relatedProductIds, relatedSpaceIds, relatedJournalIds } = req.body;
      await sql`
        INSERT INTO products (
          id, name, category, description, "subTitle", material, price, images, "hoverImages", "contentBlocks", "isFeatured", dimensions, shipping, sku, color, "bodyColors", "fabricColors", "cartEnabled", "portraitImages", "relatedProductIds", "relatedSpaceIds", "relatedJournalIds"
        ) VALUES (
          ${newId}, ${name}, ${category}, ${description}, ${subTitle || ''}, ${material}, ${price}, 
          ${JSON.stringify(images || [])}, 
          ${JSON.stringify(hoverImages || [])}, 
          ${JSON.stringify(contentBlocks || [])}, 
          ${isFeatured || false},
          ${dimensions || ''},
          ${shipping || ''},
          ${sku || ''},
          ${typeof color === 'string' ? color : JSON.stringify(color || [])},
          ${JSON.stringify(bodyColors || [])},
          ${JSON.stringify(fabricColors || [])},
          ${cartEnabled !== false},
          ${JSON.stringify(portraitImages || [])},
          ${JSON.stringify(relatedProductIds || [])},
          ${JSON.stringify(relatedSpaceIds || [])},
          ${JSON.stringify(relatedJournalIds || [])}
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
          "relatedJournalIds" = EXCLUDED."relatedJournalIds"
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
      const { name, category, description, subTitle, material, price, images, hoverImages, contentBlocks, isFeatured, dimensions, shipping, sku, color, bodyColors, fabricColors, cartEnabled, portraitImages, relatedProductIds, relatedSpaceIds, relatedJournalIds } = req.body;
      await sql`
        UPDATE products SET 
          name = ${name}, 
          category = ${category}, 
          description = ${description}, 
          "subTitle" = ${subTitle},
          material = ${material}, 
          price = ${price}, 
          images = ${JSON.stringify(images || [])}, 
          "hoverImages" = ${JSON.stringify(hoverImages || [])}, 
          "contentBlocks" = ${JSON.stringify(contentBlocks || [])}, 
          "isFeatured" = ${isFeatured},
          dimensions = ${dimensions},
          shipping = ${shipping},
          sku = ${sku},
          color = ${typeof color === 'string' ? color : JSON.stringify(color || [])},
          "bodyColors" = ${JSON.stringify(bodyColors || [])},
          "fabricColors" = ${JSON.stringify(fabricColors || [])},
          "cartEnabled" = ${cartEnabled !== false},
          "portraitImages" = ${JSON.stringify(portraitImages || [])},
          "relatedProductIds" = ${JSON.stringify(relatedProductIds || [])},
          "relatedSpaceIds" = ${JSON.stringify(relatedSpaceIds || [])},
          "relatedJournalIds" = ${JSON.stringify(relatedJournalIds || [])}
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
