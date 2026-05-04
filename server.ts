import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { put } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for handling file uploads (in-memory)
const upload = multer({ storage: multer.memoryStorage() });

// --- Vercel Blob Upload Endpoint ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Vercel Blob
    const blob = await put(req.file.originalname, req.file.buffer, {
      access: 'public',
    });

    res.json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// --- Vercel Postgres Products Endpoints ---

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await sql`SELECT * FROM products ORDER BY "createdAt" DESC`;
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add a new product
app.post('/api/products', async (req, res) => {
  try {
    const { id, name, category, description, material, price, images, hoverImages, contentBlocks, isFeatured } = req.body;
    
    await sql`
      INSERT INTO products (
        id, name, category, description, material, price, images, "hoverImages", "contentBlocks", "isFeatured"
      ) VALUES (
        ${id}, ${name}, ${category}, ${description}, ${material}, ${price}, 
        ${JSON.stringify(images || [])}, 
        ${JSON.stringify(hoverImages || [])}, 
        ${JSON.stringify(contentBlocks || [])}, 
        ${isFeatured || false}
      )
    `;
    
    res.status(201).json({ success: true, id });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, material, price, images, hoverImages, contentBlocks, isFeatured } = req.body;
    
    await sql`
      UPDATE products SET 
        name = ${name}, 
        category = ${category}, 
        description = ${description}, 
        material = ${material}, 
        price = ${price}, 
        images = ${JSON.stringify(images || [])}, 
        "hoverImages" = ${JSON.stringify(hoverImages || [])}, 
        "contentBlocks" = ${JSON.stringify(contentBlocks || [])}, 
        "isFeatured" = ${isFeatured || false}
      WHERE id = ${id}
    `;
    
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM products WHERE id = ${id}`;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
