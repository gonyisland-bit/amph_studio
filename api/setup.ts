import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  try {
    // Create spaces table
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

    // Create journals table
    await sql`
      CREATE TABLE IF NOT EXISTS journals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        date TEXT,
        image TEXT,
        "contentBlocks" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return res.status(200).json({ success: true, message: 'Tables created successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create tables', details: error });
  }
}
