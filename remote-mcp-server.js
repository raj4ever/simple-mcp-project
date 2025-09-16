import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

class RemoteMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'remote-postgresql-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.client = null;
    this.apiKey = process.env.MCP_API_KEY || crypto.randomBytes(32).toString('hex');
    this.setupHandlers();
  }

  validateAPIKey(providedKey) {
    return providedKey === this.apiKey;
  }

  async connectDatabase() {
    try {
      const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ZsW7jgc9iShH@ep-calm-shadow-ad3t0jof-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
      
      this.client = new Client({
        connectionString: connectionString
      });

      await this.client.connect();
      await this.createTables();
      console.log('Connected to PostgreSQL database');
    } catch (error) {
      console.error('Error connecting to PostgreSQL:', error);
      throw error;
    }
  }

  async createTables() {
    // Create users table
    await this.client.query(`
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
    await this.client.query(`
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
    const userCountResult = await this.client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCountResult.rows[0].count) === 0) {
      await this.client.query(`
        INSERT INTO users (name, email, age, phone, address) VALUES 
        ('John Doe', 'john@example.com', 30, '123-456-7890', '123 Main St'),
        ('Jane Smith', 'jane@example.com', 25, '098-765-4321', '456 Oak Ave'),
        ('Bob Johnson', 'bob@example.com', 35, '111-222-3333', '789 Pine Ln'),
        ('Alice Brown', 'alice@example.com', 28, '444-555-6666', '101 Elm Rd')
      `);
    }

    const productCountResult = await this.client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCountResult.rows[0].count) === 0) {
      await this.client.query(`
        INSERT INTO products (name, description, price, stock_quantity) VALUES 
        ('Laptop', 'High-performance laptop', 1200.00, 10),
        ('Mouse', 'Wireless mouse', 25.50, 50),
        ('Keyboard', 'Mechanical keyboard', 75.00, 25),
        ('Monitor', '4K UHD Monitor', 350.00, 15)
      `);
    }
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_users',
            description: 'Get all users from the database',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'list_products',
            description: 'Get all products from the database',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
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
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.toolName === 'list_users') {
        return this.listUsers();
      } else if (request.toolName === 'list_products') {
        return this.listProducts();
      } else if (request.toolName === 'add_user') {
        return this.addUser(request.input);
      } else if (request.toolName === 'add_product') {
        return this.addProduct(request.input);
      } else if (request.toolName === 'update_user') {
        return this.updateUser(request.input);
      } else if (request.toolName === 'update_product') {
        return this.updateProduct(request.input);
      } else if (request.toolName === 'delete_user') {
        return this.deleteUser(request.input);
      } else if (request.toolName === 'delete_product') {
        return this.deleteProduct(request.input);
      }
      throw new Error(`Unknown tool: ${request.toolName}`);
    });
  }

  async listUsers() {
    const result = await this.client.query('SELECT * FROM users ORDER BY id');
    return { users: result.rows };
  }

  async listProducts() {
    const result = await this.client.query('SELECT * FROM products ORDER BY id');
    return { products: result.rows };
  }

  async addUser({ name, email, age, phone, address }) {
    const result = await this.client.query(
      'INSERT INTO users (name, email, age, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, age, phone, address]
    );
    return { user: result.rows[0] };
  }

  async addProduct({ name, description, price, stock_quantity }) {
    const result = await this.client.query(
      'INSERT INTO products (name, description, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, stock_quantity]
    );
    return { product: result.rows[0] };
  }

  async updateUser({ id, name, email, age, phone, address }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (email !== undefined) { fields.push(`email = $${paramIndex++}`); values.push(email); }
    if (age !== undefined) { fields.push(`age = $${paramIndex++}`); values.push(age); }
    if (phone !== undefined) { fields.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (address !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(address); }

    if (fields.length === 0) {
      return { message: 'No fields to update' };
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.client.query(query, values);
    return { user: result.rows[0] };
  }

  async updateProduct({ id, name, description, price, stock_quantity }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description); }
    if (price !== undefined) { fields.push(`price = $${paramIndex++}`); values.push(price); }
    if (stock_quantity !== undefined) { fields.push(`stock_quantity = $${paramIndex++}`); values.push(stock_quantity); }

    if (fields.length === 0) {
      return { message: 'No fields to update' };
    }

    values.push(id);
    const query = `UPDATE products SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.client.query(query, values);
    return { product: result.rows[0] };
  }

  async deleteUser({ id }) {
    const result = await this.client.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return { user: result.rows[0] };
  }

  async deleteProduct({ id }) {
    const result = await this.client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return { product: result.rows[0] };
  }

  async run() {
    try {
      await this.connectDatabase();
      
      const transport = new SSEServerTransport('/mcp', this.server);
      await this.server.connect(transport);
      
      console.log('Remote MCP API Key:', this.apiKey);
      console.log('Remote MCP Server running on SSE transport');
      console.log('Access URL: http://localhost:3000/mcp');
      
    } catch (error) {
      console.error('Failed to start remote MCP server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new RemoteMCPServer();
server.run().catch(console.error);
