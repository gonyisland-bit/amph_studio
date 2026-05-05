import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  // Auto-setup tables if they don't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        images TEXT,
        "appliedProductIds" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (e) {
    console.error("Setup error:", e);
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM spaces ORDER BY "createdAt" DESC`;
      const parsedRows = rows.map(r => ({
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

  if (req.method === 'POST') {
    try {
      const { id: newId, title, description, images, appliedProductIds } = req.body;
      await sql`
        INSERT INTO spaces (id, title, description, images, "appliedProductIds")
        VALUES (${newId}, ${title}, ${description}, ${JSON.stringify(images || [])}, ${JSON.stringify(appliedProductIds || [])})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          images = EXCLUDED.images,
          "appliedProductIds" = EXCLUDED."appliedProductIds"
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
      const { title, description, images, appliedProductIds } = req.body;
      await sql`
        UPDATE spaces 
        SET title = ${title}, description = ${description}, images = ${JSON.stringify(images || [])}, "appliedProductIds" = ${JSON.stringify(appliedProductIds || [])}
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
      await sql`DELETE FROM spaces WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
