import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  try {
    // Basic table creation
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

    // Attempt to add createdAt if missing (migration)
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`; } catch(e) {}
    try { await sql`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`; } catch(e) {}
    try { await sql`ALTER TABLE journals ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`; } catch(e) {}
    
    // Spaces Migrations
    try { await sql`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "appliedProductIds" TEXT`; } catch(e) {}
    try { await sql`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "images" TEXT`; } catch(e) {}
    try { await sql`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "location" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "address" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "hours" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE spaces ADD COLUMN IF NOT EXISTS "image" TEXT DEFAULT ''`; } catch(e) {}

    return res.status(200).json({ success: true, message: 'Tables and columns verified' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to setup database', details: error });
  }
}

