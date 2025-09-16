import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

const { Client } = pg;

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
let client;
let currentApiKey = null;

async function connectDatabase() {
  try {
    const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ZsW7jgc9iShH@ep-calm-shadow-ad3t0jof-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    
    client = new Client({
      connectionString: connectionString
    });
    
    await client.connect();
    console.log('Connected to PostgreSQL database');
    
    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
  }
}

async function createTables() {
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample data if tables are empty
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO users (name, email, phone, address) VALUES 
        ('John Doe', 'john@example.com', '+1234567890', '123 Main St'),
        ('Jane Smith', 'jane@example.com', '+1234567891', '456 Oak Ave'),
        ('Bob Johnson', 'bob@example.com', '+1234567892', '789 Pine Rd'),
        ('Alice Brown', 'alice@example.com', '+1234567893', '321 Elm St')
      `);
    }

    const productCount = await client.query('SELECT COUNT(*) as count FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (name, description, price, stock_quantity) VALUES 
        ('Laptop', 'High-performance laptop', 999.99, 10),
        ('Mouse', 'Wireless mouse', 29.99, 50),
        ('Keyboard', 'Mechanical keyboard', 79.99, 25),
        ('Monitor', '4K Ultra HD Monitor', 299.99, 15)
      `);
    }

    console.log('Database tables created/verified');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// API Routes

// API Key Management
app.post('/api/save-api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }
    
    // Save to database or environment
    currentApiKey = apiKey;
    
    // You can also save to database if needed
    // await client.query('INSERT INTO api_keys (key_value, created_at) VALUES ($1, CURRENT_TIMESTAMP)', [apiKey]);
    
    res.json({ success: true, message: 'API key saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/get-api-key', async (req, res) => {
  try {
    if (currentApiKey) {
      res.json({ success: true, apiKey: currentApiKey });
    } else {
      res.json({ success: false, error: 'No API key found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    const productCount = await client.query('SELECT COUNT(*) as count FROM products');
    const inventoryValue = await client.query('SELECT SUM(price * stock_quantity) as total FROM products');
    
    res.json({
      total_users: parseInt(userCount.rows[0].count),
      total_products: parseInt(productCount.rows[0].count),
      total_inventory_value: parseFloat(inventoryValue.rows[0].total || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const result = await client.query(
      'INSERT INTO users (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, address]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new product
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, stock_quantity } = req.body;
    const result = await client.query(
      'INSERT INTO products (name, description, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, stock_quantity]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramCount++}`);
      values.push(stock_quantity);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  await connectDatabase();
  
  app.listen(PORT, () => {
    console.log(`Web server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
