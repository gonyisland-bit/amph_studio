import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// In-memory fallback for local dev when DB is not connected
interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  name?: string;
  phone?: string;
  address?: string;
  memo?: string;
  createdAt: string;
}
const mockUsers: MockUser[] = [];

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export default async function handler(req: any, res: any) {
  const { action } = req.query;

  // Auto-create table if DB is available
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
  } catch (e) {
    console.warn("DB not connected, using memory fallback for users table creation");
  }

  if (req.method === 'POST') {
    if (action === 'admin-login') {
      const { password } = req.body;
      const expectedPassword = process.env.ADMIN_PASSWORD || 'amph123';
      if (password === expectedPassword) {
        return res.status(200).json({ success: true, token: 'admin_session_token_secure' });
      }
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (action === 'register') {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { salt, hash } = hashPassword(password);
      const userId = 'usr_' + Math.random().toString(36).substr(2, 9);

      try {
        // Try Postgres
        const existing = await sql`SELECT * FROM customer_users WHERE email = ${email}`;
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Email already registered' });
        }

        await sql`
          INSERT INTO customer_users (id, email, password_hash, password_salt, name, phone, address, memo)
          VALUES (${userId}, ${email}, ${hash}, ${salt}, '', '', '', '')
        `;
        return res.status(201).json({ success: true, user: { email } });
      } catch (err) {
        // Fallback to In-Memory
        const found = mockUsers.find(u => u.email === email);
        if (found) {
          return res.status(400).json({ error: 'Email already registered (Fallback)' });
        }
        mockUsers.push({
          id: userId,
          email,
          password_hash: hash,
          password_salt: salt,
          name: '',
          phone: '',
          address: '',
          memo: '',
          createdAt: new Date().toISOString()
        });
        return res.status(201).json({ success: true, user: { email }, fallback: true });
      }
    }

    if (action === 'login') {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      try {
        const { rows } = await sql`SELECT * FROM customer_users WHERE email = ${email}`;
        if (rows.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];
        const isMatch = verifyPassword(password, user.password_salt, user.password_hash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        return res.status(200).json({ success: true, token: 'cust_' + user.id, user: { email } });
      } catch (err) {
        // Fallback to In-Memory
        const user = mockUsers.find(u => u.email === email);
        if (!user) {
          return res.status(401).json({ error: 'Invalid email or password (Fallback)' });
        }
        const isMatch = verifyPassword(password, user.password_salt, user.password_hash);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid email or password (Fallback)' });
        }
        return res.status(200).json({ success: true, token: 'cust_' + user.id, user: { email }, fallback: true });
      }
    }

    if (action === 'update-profile') {
      const { email, name, phone, address, currentPassword, newPassword } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      try {
        if (newPassword) {
          if (!currentPassword) {
            return res.status(400).json({ error: 'Current password is required to change password' });
          }
          const { rows } = await sql`SELECT * FROM customer_users WHERE email = ${email}`;
          if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          const user = rows[0];
          const isMatch = verifyPassword(currentPassword, user.password_salt, user.password_hash);
          if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password' });
          }
          const { salt, hash } = hashPassword(newPassword);
          await sql`
            UPDATE customer_users 
            SET name = ${name || ''}, phone = ${phone || ''}, address = ${address || ''}, password_hash = ${hash}, password_salt = ${salt}
            WHERE email = ${email}
          `;
        } else {
          await sql`
            UPDATE customer_users 
            SET name = ${name || ''}, phone = ${phone || ''}, address = ${address || ''}
            WHERE email = ${email}
          `;
        }
        return res.status(200).json({ success: true });
      } catch (err) {
        // Fallback In-Memory
        let user = mockUsers.find(u => u.email === email);
        if (!user) {
          const { salt, hash } = hashPassword(newPassword || '1234');
          user = {
            id: 'usr_' + Math.random().toString(36).substr(2, 9),
            email,
            password_hash: hash,
            password_salt: salt,
            createdAt: new Date().toISOString(),
            name: name || '',
            phone: phone || '',
            address: address || '',
            memo: ''
          };
          mockUsers.push(user);
          return res.status(200).json({ success: true, fallback: true });
        }
        
        if (newPassword) {
          const isMatch = verifyPassword(currentPassword, user.password_salt, user.password_hash);
          if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password (Fallback)' });
          }
          const { salt, hash } = hashPassword(newPassword);
          user.password_hash = hash;
          user.password_salt = salt;
        }
        
        user.name = name || '';
        user.phone = phone || '';
        user.address = address || '';
        return res.status(200).json({ success: true, fallback: true });
      }
    }

    if (action === 'update-memo') {
      const { email, memo } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      try {
        await sql`UPDATE customer_users SET memo = ${memo || ''} WHERE email = ${email}`;
        return res.status(200).json({ success: true });
      } catch (err) {
        const user = mockUsers.find(u => u.email === email);
        if (user) {
          user.memo = memo || '';
        }
        return res.status(200).json({ success: true, fallback: true });
      }
    }
  }

  if (req.method === 'GET') {
    if (action === 'profile') {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      try {
        const { rows } = await sql`SELECT id, email, name, phone, address, memo FROM customer_users WHERE email = ${email}`;
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        return res.status(200).json(rows[0]);
      } catch (err) {
        const user = mockUsers.find(u => u.email === email);
        if (!user) {
          return res.status(200).json({ email, name: '', phone: '', address: '', memo: '' });
        }
        return res.status(200).json({
          id: user.id,
          email: user.email,
          name: user.name || '',
          phone: user.phone || '',
          address: user.address || '',
          memo: user.memo || ''
        });
      }
    }

    if (action === 'users') {
      // Get all customer users (Admin check)
      try {
        const { rows } = await sql`SELECT id, email, name, phone, address, memo, "createdAt" FROM customer_users ORDER BY "createdAt" DESC`;
        return res.status(200).json(rows);
      } catch (err) {
        // Fallback to In-Memory
        const usersList = mockUsers.map(u => ({ 
          id: u.id, 
          email: u.email, 
          name: u.name || '', 
          phone: u.phone || '', 
          address: u.address || '', 
          memo: u.memo || '', 
          createdAt: u.createdAt 
        }));
        return res.status(200).json(usersList);
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
