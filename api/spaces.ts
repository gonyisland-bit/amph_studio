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
        "appliedProductIds" TEXT,
        location TEXT DEFAULT '',
        address TEXT DEFAULT '',
        hours TEXT DEFAULT '',
        image TEXT DEFAULT '',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
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
      
      const parsedRows = result.rows.map(r => ({
        ...r,
        images: typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []),
        appliedProductIds: typeof r.appliedProductIds === 'string' ? JSON.parse(r.appliedProductIds) : (r.appliedProductIds || []),
      }));
      return res.status(200).json(parsedRows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const { id: bodyId, title, description, images, appliedProductIds } = req.body;
      const targetId = id || bodyId;
      
      if (!targetId) return res.status(400).json({ error: 'ID is required' });

      // Use UPSERT for both POST and PUT to be safe
      // Providing defaults for legacy columns to avoid NOT NULL constraints if they exist
      await sql`
        INSERT INTO spaces (id, title, description, images, "appliedProductIds", location, address, hours, image)
        VALUES (
          ${targetId}, 
          ${title}, 
          ${description || ''}, 
          ${JSON.stringify(images || [])}, 
          ${JSON.stringify(appliedProductIds || [])},
          '', '', '', ''
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          images = EXCLUDED.images,
          "appliedProductIds" = EXCLUDED."appliedProductIds"
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
