import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  // Auto-setup table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        images TEXT,
        featured BOOLEAN DEFAULT false,
        "appliedProductIds" TEXT,
        location TEXT DEFAULT '',
        address TEXT DEFAULT '',
        hours TEXT DEFAULT '',
        image TEXT DEFAULT '',
        "contentBlocks" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    // Comprehensive Migration: ensure all possible columns exist to prevent save failures
    const columns = [
      { name: 'contentBlocks', type: 'TEXT' },
      { name: 'featured', type: 'BOOLEAN DEFAULT false' },
      { name: 'appliedProductIds', type: 'TEXT' },
      { name: 'images', type: 'TEXT' },
      { name: 'location', type: 'TEXT DEFAULT \'\'' },
      { name: 'address', type: 'TEXT DEFAULT \'\'' },
      { name: 'hours', type: 'TEXT DEFAULT \'\'' },
      { name: 'image', type: 'TEXT DEFAULT \'\'' },
      { name: 'hotspots', type: 'TEXT' }
    ];
    for (const col of columns) {
      try {
        await sql.query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`);
      } catch (e) {
        try { await sql.query(`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`); } catch(e2) {}
      }
      if (col.name !== 'featured') {
        try { await sql.query(`ALTER TABLE spaces ALTER COLUMN "${col.name}" TYPE TEXT`); } catch(e) {}
        try { await sql.query(`ALTER TABLE spaces ALTER COLUMN ${col.name} TYPE TEXT`); } catch(e2) {}
      }
    }
  } catch (e) {}

  if (req.method === 'GET') {
    try {
      // Try ordering by createdAt, fallback to id if column missing
      let result;
      try {
        result = await sql`SELECT * FROM spaces ORDER BY "createdAt" DESC`;
      } catch (e) {
        result = await sql`SELECT * FROM spaces ORDER BY id DESC`;
      }
      
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

      const parsedRows = result.rows.map(r => ({
        ...r,
        featured: Boolean(r.featured),
        images: safeParse(r.images),
        appliedProductIds: safeParse(r.appliedProductIds),
        contentBlocks: safeParse(r.contentBlocks),
        hotspots: safeParse(r.hotspots)
      }));
      return res.status(200).json(parsedRows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { id: bodyId, title, description, images, featured, appliedProductIds, contentBlocks, hotspots, image } = req.body;
      const targetId = id || bodyId;
      
      if (!targetId) return res.status(400).json({ error: 'ID is required' });

      // Extremely defensive INSERT providing values for all known columns
      await sql`
        INSERT INTO spaces (
          id, title, description, images, featured, "appliedProductIds", "contentBlocks", 
          location, address, hours, image, hotspots
        )
        VALUES (
          ${targetId}, 
          ${title || ''}, 
          ${description || ''}, 
          ${JSON.stringify(images || [])}, 
          ${!!featured},
          ${JSON.stringify(appliedProductIds || [])},
          ${JSON.stringify(contentBlocks || [])},
          '', '', '', ${image || ''},
          ${JSON.stringify(hotspots || [])}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          images = EXCLUDED.images,
          featured = EXCLUDED.featured,
          "appliedProductIds" = EXCLUDED."appliedProductIds",
          "contentBlocks" = EXCLUDED."contentBlocks",
          image = EXCLUDED.image,
          hotspots = EXCLUDED.hotspots
      `;
      return res.status(200).json({ success: true, id: targetId });
    } catch (error) {

      console.error(error);
      return res.status(500).json({ error: 'Failed to save space' });
    }
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      await sql`DELETE FROM spaces WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
