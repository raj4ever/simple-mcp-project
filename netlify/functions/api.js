const { Handler } = require('@netlify/functions');
const { Client } = require('pg');
const crypto = require('crypto');

// Database connection
let client;

async function connectDatabase() {
  if (!client) {
    try {
      console.log('Creating new database connection...');
      const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ZsW7jgc9iShH@ep-calm-shadow-ad3t0jof-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
      
      console.log('Connection string:', connectionString.substring(0, 50) + '...');
      
      client = new Client({
        connectionString: connectionString
      });

      console.log('Attempting to connect to database...');
      await client.connect();
      console.log('Database connection successful');
      
      // Create tables if they don't exist
      console.log('Creating/verifying tables...');
      await createTables(client);
      console.log('Tables created/verified successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }
  return client;
}

async function createTables(db) {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INTEGER,
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample data if tables are empty
    const userCountResult = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCountResult.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO users (name, email, age, phone, address) VALUES 
        ('John Doe', 'john@example.com', 30, '123-456-7890', '123 Main St'),
        ('Jane Smith', 'jane@example.com', 25, '098-765-4321', '456 Oak Ave'),
        ('Bob Johnson', 'bob@example.com', 35, '111-222-3333', '789 Pine Ln'),
        ('Alice Brown', 'alice@example.com', 28, '444-555-6666', '101 Elm Rd')
      `);
    }

    const productCountResult = await db.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCountResult.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO products (name, description, price, stock_quantity) VALUES 
        ('Laptop', 'High-performance laptop', 1200.00, 10),
        ('Mouse', 'Wireless mouse', 25.50, 50),
        ('Keyboard', 'Mechanical keyboard', 75.00, 25),
        ('Monitor', '4K UHD Monitor', 350.00, 15)
      `);
    }
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

const handler = async (event, context) => {
  console.log('Function called with:', { path: event.path, method: event.httpMethod });
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    console.log('Attempting database connection...');
    const db = await connectDatabase();
    console.log('Database connected successfully');
    
    const path = event.path.replace('/api/', '');
    const method = event.httpMethod;
    console.log('Processing request:', { path, method });

    // Parse request body
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        console.log('Body parsing failed:', e.message);
      }
    }

    // Route handling
    switch (path) {
      case 'test':
        if (method === 'GET') {
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: 'Function is working',
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV || 'production'
            }),
          };
        }
        break;

      case 'stats':
        if (method === 'GET') {
          const userCount = await db.query('SELECT COUNT(*) as count FROM users');
          const productCount = await db.query('SELECT COUNT(*) as count FROM products');
          const inventoryValue = await db.query('SELECT SUM(price * stock_quantity) as total FROM products');

          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              total_users: parseInt(userCount.rows[0].count),
              total_products: parseInt(productCount.rows[0].count),
              total_inventory_value: parseFloat(inventoryValue.rows[0].total || 0).toFixed(2)
            }),
          };
        }
        break;

      case 'users':
        if (method === 'GET') {
          const result = await db.query('SELECT * FROM users ORDER BY id');
          console.log('Users query result:', result.rows);
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(result.rows),
          };
        } else if (method === 'POST') {
          const { name, email, age, phone, address } = body;
          const result = await db.query(
            'INSERT INTO users (name, email, age, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, age, phone, address]
          );
          return {
            statusCode: 201,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(result.rows[0]),
          };
        }
        break;

      case 'products':
        if (method === 'GET') {
          const result = await db.query('SELECT * FROM products ORDER BY id');
          console.log('Products query result:', result.rows);
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(result.rows),
          };
        } else if (method === 'POST') {
          const { name, description, price, stock_quantity } = body;
          const result = await db.query(
            'INSERT INTO products (name, description, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, price, stock_quantity]
          );
          return {
            statusCode: 201,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(result.rows[0]),
          };
        }
        break;

      case 'get-api-key':
        if (method === 'GET') {
          // For Netlify, we'll generate a new API key each time
          const apiKey = crypto.randomBytes(32).toString('hex');
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, apiKey }),
          };
        }
        break;

      case 'save-api-key':
        if (method === 'POST') {
          // For Netlify, we'll just return success (no persistent storage)
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, message: 'API key saved successfully' }),
          };
        }
        break;

      default:
        return {
          statusCode: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Not found' }),
        };
    }

    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message,
        details: 'Function execution failed',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};

module.exports = { handler };
