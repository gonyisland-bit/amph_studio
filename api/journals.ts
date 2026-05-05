import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM journals ORDER BY id DESC`;
      const parsedRows = rows.map(r => ({
        ...r,
        contentBlocks: typeof r.contentBlocks === 'string' ? JSON.parse(r.contentBlocks) : (r.contentBlocks || []),
      }));
      return res.status(200).json(parsedRows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id: newId, title, category, date, image, contentBlocks } = req.body;
      await sql`
        INSERT INTO journals (id, title, category, date, image, "contentBlocks")
        VALUES (${newId}, ${title}, ${category}, ${date}, ${image}, ${JSON.stringify(contentBlocks || [])})
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
      const { title, category, date, image, contentBlocks } = req.body;
      await sql`
        UPDATE journals 
        SET title = ${title}, category = ${category}, date = ${date}, image = ${image}, "contentBlocks" = ${JSON.stringify(contentBlocks || [])}
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
      await sql`DELETE FROM journals WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
