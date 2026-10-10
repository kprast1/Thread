import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { FashionSearchAgent } from './src/server/agent';
import { BRANDS } from './src/data/brands';
import { PRODUCTS } from './src/data/products';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  const agent = new FashionSearchAgent();

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Get all supported brands with similarity notes
  app.get('/api/brands', (_req, res) => {
    res.json({ brands: BRANDS });
  });

  // Get full catalog
  app.get('/api/products', (_req, res) => {
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
  app.post('/api/feedback', (req, res) => {
    const { productId, type } = req.body;
    // Feedback recorded for session
    res.json({ success: true, productId, type, timestamp: Date.now() });
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
