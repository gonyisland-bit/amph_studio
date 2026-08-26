import { sql } from '@vercel/postgres';

let isJournalsSchemaInitialized = false;

async function ensureJournalsSchema() {
  if (isJournalsSchemaInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS journals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        date TEXT,
        image TEXT,
        featured BOOLEAN DEFAULT false,
        "relatedJournalIds" TEXT,
        "appliedProductIds" TEXT,
        "contentBlocks" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    const columns = [
      { name: 'description', type: 'TEXT' },
      { name: 'featured', type: 'BOOLEAN DEFAULT false' },
      { name: 'relatedJournalIds', type: 'TEXT' },
      { name: 'appliedProductIds', type: 'TEXT' },
      { name: 'contentBlocks', type: 'TEXT' },
      { name: 'hotspots', type: 'TEXT' }
    ];
    for (const col of columns) {
      try {
        await sql.query(`ALTER TABLE journals ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`);
      } catch (e) {
        try { await sql.query(`ALTER TABLE journals ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`); } catch(e2) {}
      }
      if (col.name !== 'featured') {
        try { await sql.query(`ALTER TABLE journals ALTER COLUMN "${col.name}" TYPE TEXT`); } catch(e) {}
      }
    }
    isJournalsSchemaInitialized = true;
  } catch (e) {}
}

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  if (!isJournalsSchemaInitialized) {
    await ensureJournalsSchema();
  }

  if (req.method === 'GET') {
    try {
      let result;
      try {
        result = await sql`SELECT * FROM journals ORDER BY "createdAt" DESC`;
      } catch (e) {
        result = await sql`SELECT * FROM journals ORDER BY id DESC`;
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
        relatedJournalIds: safeParse(r.relatedJournalIds),
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
      const { id: bodyId, title, description, category, date, image, featured, relatedJournalIds, appliedProductIds, contentBlocks, hotspots } = req.body;
      const targetId = id || bodyId;

      if (!targetId) return res.status(400).json({ error: 'ID is required' });

      await sql`
        INSERT INTO journals (
          id, title, description, category, date, image, featured, 
          "relatedJournalIds", "appliedProductIds", "contentBlocks", hotspots
        )
        VALUES (
          ${targetId}, 
          ${title || ''}, 
          ${description || ''}, 
          ${category || ''}, 
          ${date || ''}, 
          ${image || ''}, 
          ${!!featured}, 
          ${JSON.stringify(relatedJournalIds || [])}, 
          ${JSON.stringify(appliedProductIds || [])}, 
          ${JSON.stringify(contentBlocks || [])},
          ${JSON.stringify(hotspots || [])}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          date = EXCLUDED.date,
          image = EXCLUDED.image,
          featured = EXCLUDED.featured,
          "relatedJournalIds" = EXCLUDED."relatedJournalIds",
          "appliedProductIds" = EXCLUDED."appliedProductIds",
          "contentBlocks" = EXCLUDED."contentBlocks",
          hotspots = EXCLUDED.hotspots
      `;
      return res.status(200).json({ success: true, id: targetId });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to save journal' });
    }
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      await sql`DELETE FROM journals WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
