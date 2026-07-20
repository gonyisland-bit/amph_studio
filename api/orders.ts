import { sql } from '@vercel/postgres';

interface MockOrder {
  id: string;
  customerEmail: string;
  items: string;
  totalPrice: number;
  status: string;
  createdAt: string;
}
const mockOrders: MockOrder[] = [];

export default async function handler(req: any, res: any) {
  // Auto-create table if DB is available
  try {
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
  } catch (e) {
    console.warn("DB not connected, using memory fallback for orders table creation");
  }

  if (req.method === 'POST') {
    try {
      const { customerEmail, items, totalPrice } = req.body;
      if (!customerEmail || !items || !totalPrice) {
        return res.status(400).json({ error: 'customerEmail, items and totalPrice are required' });
      }

      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const itemsString = typeof items === 'string' ? items : JSON.stringify(items);

      try {
        await sql`
          INSERT INTO orders (id, "customerEmail", items, "totalPrice", status)
          VALUES (${orderId}, ${customerEmail}, ${itemsString}, ${totalPrice}, 'Pending')
        `;
        return res.status(201).json({ success: true, orderId });
      } catch (err) {
        // Fallback to In-Memory
        const newOrder: MockOrder = {
          id: orderId,
          customerEmail,
          items: itemsString,
          totalPrice,
          status: 'Pending',
          createdAt: new Date().toISOString()
        };
        mockOrders.push(newOrder);
        return res.status(201).json({ success: true, orderId, fallback: true });
      }
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create order', details: error?.message });
    }
  }

  if (req.method === 'GET') {
    const { customerEmail } = req.query;

    try {
      if (customerEmail) {
        // Get orders for a specific customer
        const { rows } = await sql`SELECT * FROM orders WHERE "customerEmail" = ${customerEmail} ORDER BY "createdAt" DESC`;
        const parsedRows = rows.map(r => ({
          ...r,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        }));
        return res.status(200).json(parsedRows);
      } else {
        // Get all orders (for admin)
        const { rows } = await sql`SELECT * FROM orders ORDER BY "createdAt" DESC`;
        const parsedRows = rows.map(r => ({
          ...r,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        }));
        return res.status(200).json(parsedRows);
      }
    } catch (err) {
      // Fallback to In-Memory
      if (customerEmail) {
        const filtered = mockOrders
          .filter(o => o.customerEmail === customerEmail)
          .map(o => ({
            ...o,
            items: JSON.parse(o.items)
          }));
        return res.status(200).json(filtered);
      } else {
        const parsed = mockOrders.map(o => ({
          ...o,
          items: JSON.parse(o.items)
        }));
        return res.status(200).json(parsed);
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
