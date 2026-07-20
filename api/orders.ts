import { sql } from '@vercel/postgres';

interface MockOrder {
  id: string;
  customerEmail: string;
  items: string;
  totalPrice: number;
  status: string;
  name?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}
const mockOrders: MockOrder[] = [];

export default async function handler(req: any, res: any) {
  const { action } = req.query;

  // Auto-create table if DB is available
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
  } catch (e) {
    console.warn("DB not connected, using memory fallback for orders table creation");
  }

  if (req.method === 'POST') {
    if (action === 'update-status') {
      const { orderId, status } = req.body;
      if (!orderId || !status) {
        return res.status(400).json({ error: 'orderId and status are required' });
      }
      try {
        await sql`UPDATE orders SET status = ${status} WHERE id = ${orderId}`;
        return res.status(200).json({ success: true });
      } catch (err) {
        const order = mockOrders.find(o => o.id === orderId);
        if (order) {
          order.status = status;
        }
        
        // Also update local_orders in mock client-side (done client-side, but let's notify fallback success)
        return res.status(200).json({ success: true, fallback: true });
      }
    }

    try {
      const { customerEmail, items, totalPrice, name, phone, address } = req.body;
      if (!customerEmail || !items || !totalPrice) {
        return res.status(400).json({ error: 'customerEmail, items and totalPrice are required' });
      }

      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const itemsString = typeof items === 'string' ? items : JSON.stringify(items);

      try {
        await sql`
          INSERT INTO orders (id, "customerEmail", items, "totalPrice", status, name, phone, address)
          VALUES (${orderId}, ${customerEmail}, ${itemsString}, ${totalPrice}, 'Pending', ${name || ''}, ${phone || ''}, ${address || ''})
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
          name: name || '',
          phone: phone || '',
          address: address || '',
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
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
          name: r.name || '',
          phone: r.phone || '',
          address: r.address || ''
        }));
        return res.status(200).json(parsedRows);
      } else {
        // Get all orders (for admin)
        const { rows } = await sql`SELECT * FROM orders ORDER BY "createdAt" DESC`;
        const parsedRows = rows.map(r => ({
          ...r,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
          name: r.name || '',
          phone: r.phone || '',
          address: r.address || ''
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
            items: JSON.parse(o.items),
            name: o.name || '',
            phone: o.phone || '',
            address: o.address || ''
          }));
        return res.status(200).json(filtered);
      } else {
        const parsed = mockOrders.map(o => ({
          ...o,
          items: JSON.parse(o.items),
          name: o.name || '',
          phone: o.phone || '',
          address: o.address || ''
        }));
        return res.status(200).json(parsed);
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
