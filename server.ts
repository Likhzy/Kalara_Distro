import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  forwardCustomerChatToN8n,
  getN8nCloudStatus,
  validateCustomerChatPayload,
} from './server/n8nCloudProxy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/n8n/status', (_req, res) => {
    res.status(200).json(getN8nCloudStatus());
  });

  app.post('/api/n8n/test', async (_req, res) => {
    const result = await forwardCustomerChatToN8n({
      message: 'Halo, tes koneksi dari website KALARA DISTRO.',
      sessionId: 'kalara-connection-test',
      context: {
        store: 'KALARA DISTRO Bandung',
        cartItemCount: 0,
        cartSummary: [],
      },
    });

    if (!result.result) {
      res.status(result.status).json({
        ok: false,
        message: result.error ?? 'Koneksi ke n8n Cloud gagal.',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Terhubung! Workflow n8n Cloud aktif dan merespons normal.',
    });
  });

  app.post('/api/n8n/chat', async (req, res) => {
    const validation = validateCustomerChatPayload(req.body);
    if (!validation.data) {
      res.status(400).json({ error: validation.error ?? 'Permintaan tidak valid.' });
      return;
    }

    const response = await forwardCustomerChatToN8n(validation.data);
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
