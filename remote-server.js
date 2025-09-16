import express from 'express';
import cors from 'cors';
import { RemoteMCPServer } from './remote-mcp-server.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize MCP Server
const mcpServer = new RemoteMCPServer();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    apiKey: mcpServer.apiKey 
  });
});

// MCP endpoint info
app.get('/mcp/info', (req, res) => {
  res.json({
    name: 'remote-postgresql-mcp-server',
    version: '1.0.0',
    description: 'Remote MCP Server for PostgreSQL Database',
    apiKey: mcpServer.apiKey,
    endpoints: {
      sse: '/mcp',
      health: '/health'
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Remote MCP Server running on http://localhost:${PORT}`);
  console.log(`MCP Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  
  // Initialize MCP server
  await mcpServer.run();
});
