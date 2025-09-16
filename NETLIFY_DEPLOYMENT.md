# Netlify Deployment Guide

## 🚀 **Netlify Hosting Setup**

### **📋 Prerequisites:**
- GitHub repository with your code
- Netlify account (free)
- Neon database connection string

### **🔧 Step 1: Prepare Repository**

1. **Push code to GitHub:**
```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

2. **Verify files are present:**
- `netlify.toml` ✅
- `netlify/functions/api.js` ✅
- `package.json` ✅
- `public/index.html` ✅

### **🌐 Step 2: Deploy to Netlify**

1. **Go to [netlify.com](https://netlify.com)**
2. **Click "New site from Git"**
3. **Connect GitHub account**
4. **Select your repository**
5. **Configure build settings:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18`

### **🔑 Step 3: Environment Variables**

In Netlify dashboard, go to **Site settings > Environment variables**:

```
DATABASE_URL = postgresql://neondb_owner:npg_ZsW7jgc9iShH@ep-calm-shadow-ad3t0jof-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### **⚙️ Step 4: Build Configuration**

Netlify will automatically:
- Install dependencies (`npm install`)
- Run build command (`npm run build`)
- Deploy static files to `dist/`
- Deploy serverless functions to `.netlify/functions/`

### **🎯 Step 5: Test Deployment**

1. **Visit your Netlify URL:** `https://your-site-name.netlify.app`
2. **Test API endpoints:**
   - `https://your-site-name.netlify.app/api/stats`
   - `https://your-site-name.netlify.app/api/users`
   - `https://your-site-name.netlify.app/api/products`

### **📱 Step 6: Update MCP Configuration**

Update your `mcp-config.json` for production:

```json
{
  "mcpServers": {
    "postgresql-mcp-server": {
      "command": "node",
      "args": ["/Volumes/Code/mcp/mcp-server.js"],
      "cwd": "/Volumes/Code/mcp",
      "env": {
        "MCP_API_KEY": "your_api_key_here",
        "NETLIFY_URL": "https://your-site-name.netlify.app"
      }
    }
  }
}
```

## 🔄 **Development vs Production**

### **Development (Local):**
- **Web Interface:** `http://localhost:8000`
- **API:** `http://localhost:8000/api/...`
- **MCP Server:** Local file system

### **Production (Netlify):**
- **Web Interface:** `https://your-site.netlify.app`
- **API:** `https://your-site.netlify.app/api/...`
- **MCP Server:** Still local (for Cloud Desktop)

## 🎉 **Benefits of Netlify Hosting:**

### **✅ Advantages:**
- **Free hosting** for static sites
- **Automatic deployments** from GitHub
- **Serverless functions** for API
- **Global CDN** for fast loading
- **HTTPS** by default
- **Custom domains** support

### **⚠️ Limitations:**
- **MCP Server** still needs to run locally
- **Serverless functions** have execution limits
- **Database connections** may timeout

## 🛠️ **Troubleshooting:**

### **Build Failures:**
```bash
# Check build logs in Netlify dashboard
# Common issues:
# - Missing dependencies
# - Build command errors
# - Environment variables not set
```

### **API Issues:**
```bash
# Check function logs in Netlify dashboard
# Common issues:
# - Database connection timeout
# - CORS errors
# - Function timeout (10s limit)
```

### **MCP Connection:**
- **MCP Server** must run locally
- **Web Interface** can be on Netlify
- **API calls** work from Netlify to Neon

## 📞 **Support:**

If you face issues:
1. Check Netlify build logs
2. Verify environment variables
3. Test API endpoints manually
4. Check Neon database connection

**Netlify hosting ready! 🚀**
