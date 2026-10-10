import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { FashionSearchAgent } from './src/server/agent';
import { BRANDS } from './src/data/brands';
import { PRODUCTS } from './src/data/products';
import { initDb, checkDbHealth, getDbBrands, getDbProducts, pool } from './src/server/db';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Attempt to initialize PostgreSQL
  try {
    await initDb();
    const health = await checkDbHealth();
    console.log(`✓ PostgreSQL connected: ${health.brandCount} brands, ${health.productCount} products ready.`);
  } catch (err: any) {
    console.warn(`! PostgreSQL initialization notice (${err.message}). Using in-memory catalog fallback.`);
  }

  const agent = new FashionSearchAgent();

  // API Routes
  app.get('/api/health', async (_req, res) => {
    const dbHealth = await checkDbHealth();
    res.json({
      status: 'ok',
      database: {
        connected: dbHealth.connected,
        brandCount: dbHealth.brandCount,
        productCount: dbHealth.productCount,
      },
      timestamp: Date.now(),
    });
  });

  // Get all supported brands with similarity notes (DB with fallback)
  app.get('/api/brands', async (_req, res) => {
    try {
      const dbBrands = await getDbBrands();
      if (dbBrands.length > 0) {
        return res.json({ brands: dbBrands });
      }
    } catch (err) {
      console.warn('Failed to load brands from DB, using fallback:', err);
    }
    res.json({ brands: BRANDS });
  });

  // Get full catalog (DB with fallback)
  app.get('/api/products', async (_req, res) => {
    try {
      const dbProducts = await getDbProducts();
      if (dbProducts.length > 0) {
        return res.json({ products: dbProducts });
      }
    } catch (err) {
      console.warn('Failed to load products from DB, using fallback:', err);
    }
    res.json({ products: PRODUCTS });
  });

  // Agentic Search endpoint
  app.post('/api/search', async (req, res) => {
    try {
      const { query, userPreferences } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const results = await agent.executeSearch(query, userPreferences);
      res.json(results);
    } catch (err: any) {
      console.error('Search error:', err);
      res.status(500).json({ error: err.message || 'Failed to process search request' });
    }
  });

  // Conversational refinement endpoint
  app.post('/api/search/refine', async (req, res) => {
    try {
      const { originalQuery, refinement, userPreferences } = req.body;
      if (!originalQuery || !refinement) {
        return res.status(400).json({ error: 'originalQuery and refinement are required' });
      }

      const results = await agent.refineSearch(originalQuery, refinement, userPreferences);
      res.json(results);
    } catch (err: any) {
      console.error('Refinement error:', err);
      res.status(500).json({ error: err.message || 'Failed to refine search' });
    }
  });

  // Feedback endpoint
  app.post('/api/feedback', async (req, res) => {
    const { productId, type, userId } = req.body;
    try {
      await pool.query(
        'INSERT INTO product_feedback (user_id, product_id, feedback_type) VALUES ($1, $2, $3)',
        [userId || 'default_user', productId, type]
      );
    } catch (e) {
      // Non-blocking
    }
    res.json({ success: true, productId, type, timestamp: Date.now() });
  });

  // AI Stylist Consultation endpoint
  app.post('/api/stylist/chat', async (req, res) => {
    try {
      const { message, history = [], userPreferences } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const response = await agent.consultStylist(message, history, userPreferences);
      res.json(response);
    } catch (err: any) {
      console.error('Stylist consultation error:', err);
      res.status(500).json({ error: err.message || 'Stylist consultation failed' });
    }
  });

  // Serve Vite in dev or static files in prod
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`THREAD Fashion Search Agent running on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
