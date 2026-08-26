import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  // Auto-setup & Schema Migration (Migrate all VARCHAR(255) columns to TEXT)
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

    const productCols = [
      'subTitle', 'dimensions', 'shipping', 'sku', 'color', 'cartEnabled',
      'portraitImages', 'relatedProductIds', 'relatedSpaceIds', 'relatedJournalIds',
      'bodyColors', 'fabricColors', 'lookbookTitle', 'lookbookSubtitle', 'lookbookEnabled',
      'name', 'category', 'description', 'material', 'images', 'hoverImages', 'contentBlocks'
    ];

    for (const col of productCols) {
      if (col === 'cartEnabled' || col === 'lookbookEnabled') {
        try { await sql.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "${col}" BOOLEAN DEFAULT TRUE`); } catch(e) {}
      } else {
        try { await sql.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS "${col}" TEXT DEFAULT ''`); } catch(e) {}
        // Explicitly alter existing column type to TEXT to eliminate VARCHAR(255) limit
        try { await sql.query(`ALTER TABLE products ALTER COLUMN "${col}" TYPE TEXT`); } catch(e) {}
        try { await sql.query(`ALTER TABLE products ALTER COLUMN ${col} TYPE TEXT`); } catch(e) {}
      }
    }
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

        let bodyColors = safeParse(r.bodyColors);
        let fabricColors = safeParse(r.fabricColors);

        // Dual Recovery Fallback: If bodyColors or fabricColors are empty, recover from color list
        if ((!bodyColors || bodyColors.length === 0) && Array.isArray(colorParsed)) {
          bodyColors = colorParsed.filter((c: any) => c && (c.group === 'body' || (!c.group && !c.type)));
        }
        if ((!fabricColors || fabricColors.length === 0) && Array.isArray(colorParsed)) {
          fabricColors = colorParsed.filter((c: any) => c && (c.group === 'fabric' || c.group === 'upholstery'));
        }

        return {
          ...r,
          images: safeParse(r.images),
          hoverImages: safeParse(r.hoverImages),
          contentBlocks: safeParse(r.contentBlocks),
          color: colorParsed,
          bodyColors: bodyColors,
          fabricColors: fabricColors,
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
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error?.message || 'Failed to fetch' });
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

      // Normalize color lists strictly with respective groups
      const rawBody = Array.isArray(b.bodyColors) ? b.bodyColors : [];
      const rawFabric = Array.isArray(b.fabricColors) ? b.fabricColors : [];
      const bodyColors = rawBody.map((c: any) => typeof c === 'string' ? { name: c, hex: '#888888', group: 'body' } : { name: c?.name || '', hex: c?.hex || '#888888', group: 'body' }).filter((c: any) => c.name);
      const fabricColors = rawFabric.map((c: any) => typeof c === 'string' ? { name: c, hex: '#888888', group: 'fabric' } : { name: c?.name || '', hex: c?.hex || '#888888', group: 'fabric' }).filter((c: any) => c.name);
      const color = JSON.stringify([...bodyColors, ...fabricColors]);

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
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error?.message || 'Failed to insert' });
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

      // Normalize color lists strictly with respective groups
      const rawBody = Array.isArray(b.bodyColors) ? b.bodyColors : [];
      const rawFabric = Array.isArray(b.fabricColors) ? b.fabricColors : [];
      const bodyColors = rawBody.map((c: any) => typeof c === 'string' ? { name: c, hex: '#888888', group: 'body' } : { name: c?.name || '', hex: c?.hex || '#888888', group: 'body' }).filter((c: any) => c.name);
      const fabricColors = rawFabric.map((c: any) => typeof c === 'string' ? { name: c, hex: '#888888', group: 'fabric' } : { name: c?.name || '', hex: c?.hex || '#888888', group: 'fabric' }).filter((c: any) => c.name);
      const color = JSON.stringify([...bodyColors, ...fabricColors]);

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
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error?.message || 'Failed to update' });
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
