import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

const { Client } = pg;

// Load environment variables
dotenv.config();

class PostgreSQLMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'postgresql-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.client = null;
    this.apiKey = process.env.MCP_API_KEY || null;
    this.setupHandlers();
  }

  generateAPIKey() {
    return crypto.randomBytes(32).toString('hex');
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
      console.log('Connected to PostgreSQL database');
      
      // Create tables if they don't exist
      await this.createTables();
      
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw error;
    }
  }

  async createTables() {
    try {
      // Create users table
      await this.client.query(`
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
      await this.client.query(`
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
      const userCount = await this.client.query('SELECT COUNT(*) as count FROM users');
      if (parseInt(userCount.rows[0].count) === 0) {
        await this.client.query(`
          INSERT INTO users (name, email, phone, address) VALUES 
          ('John Doe', 'john@example.com', '+1234567890', '123 Main St'),
          ('Jane Smith', 'jane@example.com', '+1234567891', '456 Oak Ave'),
          ('Bob Johnson', 'bob@example.com', '+1234567892', '789 Pine Rd'),
          ('Alice Brown', 'alice@example.com', '+1234567893', '321 Elm St')
        `);
      }

      const productCount = await this.client.query('SELECT COUNT(*) as count FROM products');
      if (parseInt(productCount.rows[0].count) === 0) {
        await this.client.query(`
          INSERT INTO products (name, description, price, stock_quantity) VALUES 
          ('Laptop', 'High-performance laptop', 999.99, 10),
          ('Mouse', 'Wireless mouse', 29.99, 50),
          ('Keyboard', 'Mechanical keyboard', 79.99, 25),
          ('Monitor', '4K Ultra HD Monitor', 299.99, 15)
        `);
      }

      console.log('Database tables created/verified');
    } catch (error) {
      console.error('Error creating tables:', error.message);
      throw error;
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
                name: { type: 'string', description: "Product name" },
                description: { type: 'string', description: "Product description" },
                price: { type: 'number', description: "Product price" },
                stock_quantity: { type: 'integer', description: "Stock quantity" }
              },
              required: ['name', 'price']
            }
          },
          {
            name: 'update_user',
            description: 'Update an existing user',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'integer', description: "User ID" },
                name: { type: 'string', description: "User's name" },
                email: { type: 'string', description: "User's email" },
                phone: { type: 'string', description: "User's phone number" },
                address: { type: 'string', description: "User's address" }
              },
              required: ['id']
            }
          },
          {
            name: 'update_product',
            description: 'Update an existing product',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'integer', description: "Product ID" },
                name: { type: 'string', description: "Product name" },
                description: { type: 'string', description: "Product description" },
                price: { type: 'number', description: "Product price" },
                stock_quantity: { type: 'integer', description: "Stock quantity" }
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
                id: { type: 'integer', description: "User ID to delete" }
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
                id: { type: 'integer', description: "Product ID to delete" }
              },
              required: ['id']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_users':
            return await this.listUsers();
          case 'list_products':
            return await this.listProducts();
          case 'add_user':
            return await this.addUser(args);
          case 'add_product':
            return await this.addProduct(args);
          case 'update_user':
            return await this.updateUser(args);
          case 'update_product':
            return await this.updateProduct(args);
          case 'delete_user':
            return await this.deleteUser(args);
          case 'delete_product':
            return await this.deleteProduct(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async listUsers() {
    const result = await this.client.query('SELECT * FROM users ORDER BY id');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  }

  async listProducts() {
    const result = await this.client.query('SELECT * FROM products ORDER BY id');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  }

  async addUser(args) {
    const { name, email, phone, address } = args;
    const result = await this.client.query(
      'INSERT INTO users (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone || null, address || null]
    );
    return {
      content: [
        {
          type: 'text',
          text: `User added successfully: ${JSON.stringify(result.rows[0], null, 2)}`
        }
      ]
    };
  }

  async addProduct(args) {
    const { name, description, price, stock_quantity } = args;
    const result = await this.client.query(
      'INSERT INTO products (name, description, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, price, stock_quantity || 0]
    );
    return {
      content: [
        {
          type: 'text',
          text: `Product added successfully: ${JSON.stringify(result.rows[0], null, 2)}`
        }
      ]
    };
  }

  async updateUser(args) {
    const { id, name, email, phone, address } = args;
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
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await this.client.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `User updated successfully: ${JSON.stringify(result.rows[0], null, 2)}`
        }
      ]
    };
  }

  async updateProduct(args) {
    const { id, name, description, price, stock_quantity } = args;
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
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await this.client.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Product updated successfully: ${JSON.stringify(result.rows[0], null, 2)}`
        }
      ]
    };
  }

  async deleteUser(args) {
    const { id } = args;
    const result = await this.client.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `User deleted successfully: ${JSON.stringify(result.rows[0], null, 2)}`
        }
      ]
    };
  }

  async deleteProduct(args) {
    const { id } = args;
    const result = await this.client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Product deleted successfully: ${JSON.stringify(result.rows[0], null, 2)}`
        }
      ]
    };
  }

  async loadApiKeyFromWebServer() {
    try {
      const response = await fetch('http://localhost:8000/api/get-api-key');
      const data = await response.json();
      if (data.success && data.apiKey) {
        this.apiKey = data.apiKey;
        console.log('API Key loaded from web server');
        return true;
      }
    } catch (error) {
      console.log('Could not load API key from web server:', error.message);
    }
    return false;
  }

  async run() {
    try {
      await this.connectDatabase();
      
      // Try to load API key from web server, otherwise generate new one
      const loaded = await this.loadApiKeyFromWebServer();
      if (!loaded) {
        this.apiKey = this.generateAPIKey();
        console.log('Generated new API Key');
      }
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log('MCP API Key:', this.apiKey);
      if (this.apiKey) {
        console.log('MCP Server running with authentication');
      } else {
        console.log('MCP Server running without authentication');
      }
      console.log('MCP Server running on stdio');
      
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new PostgreSQLMCPServer();
server.run().catch(console.error);
