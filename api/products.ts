import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM products ORDER BY "createdAt" DESC`;
      const parsedRows = rows.map(r => ({
        ...r,
        images: typeof r.images === 'string' ? JSON.parse(r.images) : (r.images || []),
        hoverImages: typeof r.hoverImages === 'string' ? JSON.parse(r.hoverImages) : (r.hoverImages || []),
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
      const { id: newId, name, category, description, material, price, images, hoverImages, contentBlocks, isFeatured } = req.body;
      await sql`
        INSERT INTO products (
          id, name, category, description, material, price, images, "hoverImages", "contentBlocks", "isFeatured"
        ) VALUES (
          ${newId}, ${name}, ${category}, ${description}, ${material}, ${price}, 
          ${JSON.stringify(images || [])}, 
          ${JSON.stringify(hoverImages || [])}, 
          ${JSON.stringify(contentBlocks || [])}, 
          ${isFeatured || false}
        )
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
      return res.status(200).json({ success: true, id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update' });
    }
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID is required' });
    try {
      await sql`DELETE FROM products WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
