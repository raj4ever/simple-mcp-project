# Simple MCP Server with PostgreSQL Database

Yeh ek simple Model Context Protocol (MCP) server hai jo PostgreSQL database (Neon) ke saath kaam karta hai. Isme ek website bhi hai jo database ko manage karne ke liye use kar sakte hain.

## Features

- **MCP Server**: Node.js mein banaya gaya MCP server
- **PostgreSQL Database**: Neon cloud database jo scalable hai
- **Web Interface**: Beautiful web interface database manage karne ke liye
- **REST API**: Complete REST API endpoints
- **Real-time Stats**: Database statistics real-time mein

## Installation

1. **Dependencies install karein**:
```bash
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
```

3. **Database file create hoga automatically** jab aap server start karenge.

## Usage

### MCP Server Start Karein

```bash
npm start
```

### Web Server Start Karein

```bash
npm run web
```

Web interface: http://localhost:8000

## Cloud Desktop Connection Setup

### 1. Generate API Key
```bash
# API key generate karein
node generate-api-key.js
```

### 2. MCP Config Setup
```bash
# Generated API key ko config mein add karein
cp mcp-config-cloud-desktop.json ~/.cursor/mcp.json
```

### 3. Environment Variables (Optional)
```bash
# Custom API key set karein (optional)
export MCP_API_KEY="your_generated_api_key"
```

## MCP Tools Available

### Database Tools
1. **get_users** - Saare users get karein
2. **get_products** - Saare products get karein  
3. **add_user** - Naya user add karein
4. **add_product** - Naya product add karein
5. **search_users** - Users search karein
6. **get_database_stats** - Database statistics get karein
7. **update_user** - Existing user update karein
8. **update_product** - Existing product update karein
9. **delete_user** - User delete karein
10. **delete_product** - Product delete karein

## API Endpoints

### Users
- `GET /api/users` - Saare users
- `POST /api/users` - Naya user add karein
- `PUT /api/users/:id` - User update karein
- `DELETE /api/users/:id` - User delete karein
- `GET /api/users/search?q=query` - Users search karein

### Products  
- `GET /api/products` - Saare products
- `POST /api/products` - Naya product add karein
- `PUT /api/products/:id` - Product update karein
- `DELETE /api/products/:id` - Product delete karein

### Statistics
- `GET /api/stats` - Database statistics

## Database Schema

### Users Table
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `email` (TEXT UNIQUE NOT NULL)
- `age` (INTEGER)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Products Table
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `description` (TEXT)
- `price` (REAL NOT NULL)
- `stock_quantity` (INTEGER)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

## Cloud Desktop Integration

Cloud Desktop mein MCP server connect karne ke liye:

1. `mcp-config.json` file ko Cloud Desktop ke MCP settings mein add karein
2. Server path ko apne system ke according adjust karein
3. MCP server start karein
4. Cloud Desktop mein tools available ho jayenge

## File Structure

```
mcp/
├── mcp-server.js          # MCP server
├── web-server.js          # Web server
├── package.json           # Dependencies
├── mcp-config.json        # MCP configuration
├── public/
│   └── index.html         # Web interface
├── database/
│   └── schema.sql         # Database schema (optional)
└── database.sqlite        # SQLite database file (auto-created)
```

## Development

Development mode mein run karne ke liye:

```bash
npm run dev
```

Yeh auto-reload karega jab aap files change karenge.

## License

MIT License
