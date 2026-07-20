import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    console.log('Connecting to Vercel Postgres and creating tables...');

    // 1. Create Products Table
    const productsResult = await sql`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        material VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        images JSONB NOT NULL DEFAULT '[]',
        "hoverImages" JSONB DEFAULT '[]',
        "contentBlocks" JSONB DEFAULT '[]',
        "isFeatured" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created "products" table successfully.');

    // 2. Create Journals Table
    const journalsResult = await sql`
      CREATE TABLE IF NOT EXISTS journals (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date VARCHAR(100) NOT NULL,
        image TEXT NOT NULL,
        "contentBlocks" JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created "journals" table successfully.');

    // 3. Create Spaces Table
    const spacesResult = await sql`
      CREATE TABLE IF NOT EXISTS spaces (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        address TEXT NOT NULL,
        hours TEXT NOT NULL,
        image TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created "spaces" table successfully.');

    // Migrations to add missing fields/tables
    console.log('Running database migrations...');
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "subTitle" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "dimensions" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "shipping" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "sku" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT ''`; } catch(e) {}
    try { await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "cartEnabled" BOOLEAN DEFAULT TRUE`; } catch(e) {}

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS customer_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          name TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          address TEXT DEFAULT '',
          memo TEXT DEFAULT '',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('Created or verified "customer_users" table.');
    } catch(e) {}

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          "customerEmail" TEXT NOT NULL,
          items TEXT NOT NULL,
          "totalPrice" NUMERIC NOT NULL,
          status TEXT DEFAULT 'Pending',
          name TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          address TEXT DEFAULT '',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('Created or verified "orders" table.');
    } catch(e) {}

    console.log('Database initialization and migrations completed successfully!');
  } catch (error) {
    console.error('Error creating database tables:', error);
    process.exit(1);
  }
}

main();
