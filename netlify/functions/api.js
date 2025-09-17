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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-API-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'false',
    'Cache-Control': 'no-cache',
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

      case 'mcp':
        if (method === 'GET') {
          // SSE endpoint for MCP connections
          const apiKey = event.headers['x-api-key'] || 
                        event.headers['x-api-token'] || 
                        event.headers['authorization'];
          
          let cleanApiKey = apiKey;
          if (cleanApiKey && cleanApiKey.startsWith('Bearer ')) {
            cleanApiKey = cleanApiKey.replace('Bearer ', '');
          }
          
          const expectedApiKey = process.env.MCP_API_KEY || 'f2702684e533e55d2586cd002ab834f3b56679e244c64802dd73b321dfb7653b';
          if (!cleanApiKey || cleanApiKey !== expectedApiKey) {
            return {
              statusCode: 401,
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Invalid API key for SSE endpoint' }),
            };
          }

          // Return SSE headers for Server-Sent Events
          return {
            statusCode: 200,
            headers: {
              ...headers,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no', // Disable nginx buffering
            },
            body: 'data: {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n\n',
          };
        } else if (method === 'POST') {
          // MCP Protocol endpoint for remote connections
          const mcpRequest = body;
          
          // Validate API key - handle multiple header formats
          let apiKey = event.headers['x-api-key'] || 
                      event.headers['x-api-token'] || 
                      event.headers['authorization'];
          
          // Clean up Bearer token format
          if (apiKey && apiKey.startsWith('Bearer ')) {
            apiKey = apiKey.replace('Bearer ', '');
          }
          
          // Use the provided API key for validation
          const expectedApiKey = process.env.MCP_API_KEY || 'f2702684e533e55d2586cd002ab834f3b56679e244c64802dd73b321dfb7653b';
          if (!apiKey || apiKey !== expectedApiKey) {
            return {
              statusCode: 401,
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Invalid API key' }),
            };
          }

          // Handle MCP requests
          try {
            if (mcpRequest.method === 'tools/list') {
              return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tools: [
                    {
                      name: 'list_users',
                      description: 'Get all users from the database',
                      inputSchema: { type: 'object', properties: {}, required: [] }
                    },
                    {
                      name: 'list_products', 
                      description: 'Get all products from the database',
                      inputSchema: { type: 'object', properties: {}, required: [] }
                    },
                    {
                      name: 'add_user',
                      description: 'Add a new user to the database',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: "User's name" },
                          email: { type: 'string', description: "User's email" },
                          age: { type: 'integer', description: "User's age" },
                          phone: { type: 'string', description: "User's phone number" },
                          address: { type: 'string', description: "User's address" }
                        },
                        required: ['name', 'email']
                      }
                    },
                    {
                      name: 'add_product',
                      description: 'Add a new product to the database',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: "Product's name" },
                          description: { type: 'string', description: "Product's description" },
                          price: { type: 'number', description: "Product's price" },
                          stock_quantity: { type: 'integer', description: "Product's stock quantity" }
                        },
                        required: ['name', 'price']
                      }
                    },
                    {
                      name: 'update_user',
                      description: 'Update an existing user in the database',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', description: "User's ID" },
                          name: { type: 'string', description: "New name for the user" },
                          email: { type: 'string', description: "New email for the user" },
                          age: { type: 'integer', description: "New age for the user" },
                          phone: { type: 'string', description: "New phone number for the user" },
                          address: { type: 'string', description: "New address for the user" }
                        },
                        required: ['id']
                      }
                    },
                    {
                      name: 'update_product',
                      description: 'Update an existing product in the database',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', description: "Product's ID" },
                          name: { type: 'string', description: "New name for the product" },
                          description: { type: 'string', description: "New description for the product" },
                          price: { type: 'number', description: "New price for the product" },
                          stock_quantity: { type: 'integer', description: "New stock quantity for the product" }
                        },
                        required: ['id']
                      }
                    },
                    {
                      name: 'delete_user',
                      description: 'Delete a user from the database',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', description: "User's ID to delete" }
                        },
                        required: ['id']
                      }
                    },
                    {
                      name: 'delete_product',
                      description: 'Delete a product from the database',
                      inputSchema: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', description: "Product's ID to delete" }
                        },
                        required: ['id']
                      }
                    }
                  ]
                }),
              };
            } else if (mcpRequest.method === 'tools/call') {
              const { name, arguments: args } = mcpRequest.params;
              
              let result;
              switch (name) {
                case 'list_users':
                  const usersResult = await db.query('SELECT * FROM users ORDER BY id');
                  result = { users: usersResult.rows };
                  break;
                case 'list_products':
                  const productsResult = await db.query('SELECT * FROM products ORDER BY id');
                  result = { products: productsResult.rows };
                  break;
                case 'add_user':
                  const { name: userName, email, age, phone, address } = args;
                  const addUserResult = await db.query(
                    'INSERT INTO users (name, email, age, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [userName, email, age, phone, address]
                  );
                  result = { user: addUserResult.rows[0] };
                  break;
                case 'add_product':
                  const { name: productName, description, price, stock_quantity } = args;
                  const addProductResult = await db.query(
                    'INSERT INTO products (name, description, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *',
                    [productName, description, price, stock_quantity]
                  );
                  result = { product: addProductResult.rows[0] };
                  break;
                case 'update_user':
                  const { id: userId, name: newName, email: newEmail, age: newAge, phone: newPhone, address: newAddress } = args;
                  const fields = [];
                  const values = [];
                  let paramIndex = 1;

                  if (newName !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(newName); }
                  if (newEmail !== undefined) { fields.push(`email = $${paramIndex++}`); values.push(newEmail); }
                  if (newAge !== undefined) { fields.push(`age = $${paramIndex++}`); values.push(newAge); }
                  if (newPhone !== undefined) { fields.push(`phone = $${paramIndex++}`); values.push(newPhone); }
                  if (newAddress !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(newAddress); }

                  if (fields.length === 0) {
                    result = { message: 'No fields to update' };
                  } else {
                    values.push(userId);
                    const query = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
                    const updateUserResult = await db.query(query, values);
                    result = { user: updateUserResult.rows[0] };
                  }
                  break;
                case 'update_product':
                  const { id: productId, name: newProductName, description: newDescription, price: newPrice, stock_quantity: newStockQuantity } = args;
                  const productFields = [];
                  const productValues = [];
                  let productParamIndex = 1;

                  if (newProductName !== undefined) { productFields.push(`name = $${productParamIndex++}`); productValues.push(newProductName); }
                  if (newDescription !== undefined) { productFields.push(`description = $${productParamIndex++}`); productValues.push(newDescription); }
                  if (newPrice !== undefined) { productFields.push(`price = $${productParamIndex++}`); productValues.push(newPrice); }
                  if (newStockQuantity !== undefined) { productFields.push(`stock_quantity = $${productParamIndex++}`); productValues.push(newStockQuantity); }

                  if (productFields.length === 0) {
                    result = { message: 'No fields to update' };
                  } else {
                    productValues.push(productId);
                    const productQuery = `UPDATE products SET ${productFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${productParamIndex} RETURNING *`;
                    const updateProductResult = await db.query(productQuery, productValues);
                    result = { product: updateProductResult.rows[0] };
                  }
                  break;
                case 'delete_user':
                  const { id: deleteUserId } = args;
                  const deleteUserResult = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [deleteUserId]);
                  result = { user: deleteUserResult.rows[0] };
                  break;
                case 'delete_product':
                  const { id: deleteProductId } = args;
                  const deleteProductResult = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [deleteProductId]);
                  result = { product: deleteProductResult.rows[0] };
                  break;
                default:
                  throw new Error(`Unknown tool: ${name}`);
              }

              return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(result),
              };
            }
          } catch (error) {
            return {
              statusCode: 500,
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: error.message }),
            };
          }
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
