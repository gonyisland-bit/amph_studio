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
      const { id: newId, name, category, description, subTitle, material, price, images, hoverImages, contentBlocks, isFeatured, dimensions, shipping, sku, color } = req.body;
      await sql`
        INSERT INTO products (
          id, name, category, description, "subTitle", material, price, images, "hoverImages", "contentBlocks", "isFeatured", dimensions, shipping, sku, color
        ) VALUES (
          ${newId}, ${name}, ${category}, ${description}, ${subTitle || ''}, ${material}, ${price}, 
          ${JSON.stringify(images || [])}, 
          ${JSON.stringify(hoverImages || [])}, 
          ${JSON.stringify(contentBlocks || [])}, 
          ${isFeatured || false},
          ${dimensions || ''},
          ${shipping || ''},
          ${sku || ''},
          ${color || ''}
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
      const existing = await sql`SELECT * FROM products WHERE id = ${id}`;
      if (existing.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
      const current = existing.rows[0];

      const name = req.body.name !== undefined ? req.body.name : current.name;
      const category = req.body.category !== undefined ? req.body.category : current.category;
      const description = req.body.description !== undefined ? req.body.description : current.description;
      const material = req.body.material !== undefined ? req.body.material : current.material;
      const subTitle = req.body.subTitle !== undefined ? req.body.subTitle : current.subTitle;
      const price = req.body.price !== undefined ? req.body.price : current.price;
      const images = req.body.images !== undefined ? req.body.images : (typeof current.images === 'string' ? JSON.parse(current.images) : current.images);
      const hoverImages = req.body.hoverImages !== undefined ? req.body.hoverImages : (typeof current.hoverImages === 'string' ? JSON.parse(current.hoverImages) : current.hoverImages);
      const contentBlocks = req.body.contentBlocks !== undefined ? req.body.contentBlocks : (typeof current.contentBlocks === 'string' ? JSON.parse(current.contentBlocks) : current.contentBlocks);
      const isFeatured = req.body.isFeatured !== undefined ? req.body.isFeatured : current.isFeatured;

      const dimensions = req.body.dimensions !== undefined ? req.body.dimensions : current.dimensions;
      const shipping = req.body.shipping !== undefined ? req.body.shipping : current.shipping;
      const sku = req.body.sku !== undefined ? req.body.sku : current.sku;
      const color = req.body.color !== undefined ? req.body.color : current.color;

      await sql`
        UPDATE products SET 
          name = ${name}, 
          category = ${category}, 
          description = ${description}, 
          "subTitle" = ${subTitle},
          material = ${material}, 
          price = ${price}, 
          images = ${JSON.stringify(images || [])}, 
          "hoverImages" = ${JSON.stringify(hoverImages || [])}, 
          "contentBlocks" = ${JSON.stringify(contentBlocks || [])}, 
          "isFeatured" = ${isFeatured},
          dimensions = ${dimensions},
          shipping = ${shipping},
          sku = ${sku},
          color = ${color}
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
