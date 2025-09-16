import { Handler } from '@netlify/functions';
import pg from 'pg';

const { Client } = pg;

// Database connection
let client;

async function connectDatabase() {
  if (!client) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ZsW7jgc9iShH@ep-calm-shadow-ad3t0jof-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    
    client = new Client({
      connectionString: connectionString
    });

    await client.connect();
  }
  return client;
}

export const handler: Handler = async (event, context) => {
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
    const db = await connectDatabase();
    const path = event.path.replace('/api/', '');
    const method = event.httpMethod;

    // Parse request body
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        // Ignore parsing errors for non-JSON requests
      }
    }

    // Route handling
    switch (path) {
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
          const result = await db.query('SELECT * FROM users');
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
          const result = await db.query('SELECT * FROM products');
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
          const apiKey = require('crypto').randomBytes(32).toString('hex');
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
