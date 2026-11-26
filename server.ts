import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  forwardChatToN8n,
  getValidatedWebhookUrl,
  validateChatPayload,
} from './server/n8nProxy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/n8n/status', (_req, res) => {
    const { url, error } = getValidatedWebhookUrl();
    res.json({
      configured: Boolean(url),
      ...(error ? { configError: error } : {}),
    });
  });

  app.post('/api/n8n/chat', async (req, res) => {
    const validation = validateChatPayload(req.body);
    if (!validation.data) {
      res.status(400).json({ error: validation.error ?? 'Permintaan tidak valid.' });
      return;
    }

    const response = await forwardChatToN8n(validation.data);
    if (!response.result) {
      res.status(response.status).json({ error: response.error });
      return;
    }

    res.status(200).json(response.result);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KALARA DISTRO server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
