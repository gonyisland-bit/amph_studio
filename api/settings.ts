import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  // Ensure table exists
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}'
      )
    `;
  } catch (err) {
    console.error("Failed to ensure settings table:", err);
  }

  if (req.method === 'GET') {
    const id = req.query.id || 'home';
    try {
      const { rows } = await sql`SELECT data FROM settings WHERE id = ${id}`;
      if (rows.length === 0) {
        return res.status(200).json({});
      }
      const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
      return res.status(200).json(data);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  if (req.method === 'PUT') {
    const id = req.query.id || 'home';
    try {
      const data = req.body;
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      await sql`
        INSERT INTO settings (id, data)
        VALUES (${id}, ${jsonString})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
