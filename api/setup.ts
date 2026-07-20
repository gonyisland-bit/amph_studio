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
        "contentBlocks" TEXT,
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

    // Migration: products table "cartEnabled"
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "cartEnabled" BOOLEAN DEFAULT TRUE`; } catch(e) {}

    // Migration: customer_users table
    await sql`
      CREATE TABLE IF NOT EXISTS customer_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Migration: orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        "customerEmail" TEXT NOT NULL,
        items TEXT NOT NULL,
        "totalPrice" NUMERIC NOT NULL,
        status TEXT DEFAULT 'Pending',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return res.status(200).json({ success: true, message: 'Tables and columns verified, migrations completed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to setup database', details: error });
  }
}

