import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { seedDataIfEmpty, seedUsersIfEmpty, getFullStore, saveStoreValue } from './server/db';
import { apiRouter } from './server/api';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Initialize and run SQLite migrations/seeding
  try {
    seedDataIfEmpty();
    seedUsersIfEmpty();
    console.log('SQLite database successfully initialized and verified.');
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err);
  }

  // Middleware for body parsing
  app.use(express.json({ limit: '50mb' }));

  // Expose Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), database: 'sqlite' });
  });

  // Mount clean REST endpoints for auth, store, and resets
  app.use('/api', apiRouter);

  // Backward-compatible endpoints for zero disruption to any existing frontend components
  app.get('/api/data', (req, res) => {
    try {
      res.json(getFullStore());
    } catch (err: any) {
      console.error('Error reading full store:', err);
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  app.post('/api/data', (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'Missing key' });
      }
      saveStoreValue(key, value);
      res.json({ success: true, savedToSqlite: true });
    } catch (err: any) {
      console.error(`Error saving key "${req.body.key}":`, err);
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  app.post('/api/data/bulk', (req, res) => {
    try {
      const { updates } = req.body;
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid updates payload' });
      }
      for (const [key, value] of Object.entries(updates)) {
        saveStoreValue(key, value as any[]);
      }
      res.json({ success: true, savedToSqlite: true });
    } catch (err: any) {
      console.error('Error writing bulk data:', err);
      res.status(500).json({ error: 'Failed to save bulk data' });
    }
  });

  // Vite development server / production asset serving middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
