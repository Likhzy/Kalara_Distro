import { GoogleGenAI, ThinkingLevel } from '@google/genai';

interface ServerlessRequest {
  method?: string;
  body?: unknown;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{4,128}$/;
const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 30_000;

function cleanEnv(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isBlockedMetadataHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === '169.254.169.254' ||
    lower === 'metadata.google.internal' ||
    lower === 'metadata' ||
    lower.startsWith('169.254.') ||
    lower === '0.0.0.0'
  );
}

function extractReply(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractReply(item);
      if (found) return found;
    }
    return null;
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const key of ['output', 'reply', 'text', 'response', 'message', 'answer', 'content', 'result']) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    }
    if (obj.data) return extractReply(obj.data);
    if (obj.json) return extractReply(obj.json);
  }
  return null;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'Body JSON tidak valid.' });
      return;
    }
  }

  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Payload permintaan tidak valid.' });
    return;
  }

  const record = body as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message.trim() : '';
  const sessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : '';

  if (!message) {
    res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter).` });
    return;
  }
  if (!SESSION_ID_REGEX.test(sessionId)) {
    res.status(400).json({ error: 'Session ID tidak valid.' });
    return;
  }

  const ctxRaw = record.context && typeof record.context === 'object' ? (record.context as Record<string, unknown>) : {};
  const cartItemCount =
    typeof ctxRaw.cartItemCount === 'number' && Number.isFinite(ctxRaw.cartItemCount)
      ? Math.max(0, Math.min(999, Math.floor(ctxRaw.cartItemCount)))
      : 0;
  const cartSummary = Array.isArray(ctxRaw.cartSummary)
    ? ctxRaw.cartSummary
        .filter((i): i is string => typeof i === 'string')
        .slice(0, 20)
        .map((i) => i.slice(0, 140))
    : [];

  const rawWebhook =
    cleanEnv(process.env.N8N_WEBHOOK_URL) || cleanEnv(process.env.N8N_CLOUD_WEBHOOK_URL);

  if (!rawWebhook) {
    const geminiKey = cleanEnv(process.env.GEMINI_API_KEY);
    if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'Webhook n8n Cloud belum dikonfigurasi. Tambahkan N8N_WEBHOOK_URL di Environment Variables Vercel.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: message,
        config: {
          systemInstruction: `Kamu adalah KALARA AI, asisten belanja KALARA DISTRO Bandung (Jl. Trunojoyo No. 28, buka 10.00-21.00 WIB). Katalog: Kaos Grafis & Oversized (Kalara Archive Boxy Tee Rp95.000, Bandung Youth Graphic Tee Rp115.000, Kalara Pocket Basic Tee Rp75.000), Hoodie Fleece (Kalara Heavyweight Pullover Rp185.000, Trunojoyo Zip Hoodie Rp215.000, Daily Campus Hoodie Rp155.000), Crewneck Basic (Kalara Ribbed Crewneck Rp150.000, Archive Stamp Sweatshirt Rp175.000, Studio Plain Crewneck Rp135.000), Kemeja Casual (Citarum Utility Workshirt Rp135.000, Kalara Cuban Camp Shirt Rp120.000, Campus Overshirt Rp155.000), Celana (Kalara Wide Cargo Pants Rp185.000, Skate Relaxed Ankle Pants Rp165.000, Utility Walkshorts Rp125.000), Topi & Aksesori (Kalara 6-Panel Dad Cap Rp65.000, Short Fisherman Beanie Rp55.000, Archive Crew Socks + Sticker Pack Rp45.000). Keranjang user: ${cartSummary.length ? cartSummary.join(', ') : 'kosong'}. Jawab santai dalam Bahasa Indonesia.`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: 'AI tidak mengembalikan teks balasan.' });
        return;
      }
      res.status(200).json({ reply, sessionId, engine: 'gemini' });
      return;
    } catch {
      res.status(502).json({ error: 'Gagal menghubungi layanan AI saat ini.' });
      return;
    }
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawWebhook);
  } catch {
    res.status(500).json({ error: 'Format N8N_WEBHOOK_URL tidak valid.' });
    return;
  }

  if (
    (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') ||
    isBlockedMetadataHost(parsedUrl.hostname)
  ) {
    res.status(500).json({ error: 'URL N8N_WEBHOOK_URL tidak diizinkan.' });
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain',
  };
  const authHeaderName = cleanEnv(process.env.N8N_AUTH_HEADER_NAME);
  const authHeaderValue = cleanEnv(process.env.N8N_AUTH_HEADER_VALUE);
  if (
    authHeaderName &&
    authHeaderValue &&
    /^[a-zA-Z0-9-]+$/.test(authHeaderName) &&
    authHeaderName.toLowerCase() !== 'host'
  ) {
    headers[authHeaderName] = authHeaderValue;
  }

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'sendMessage',
        sessionId,
        chatInput: message,
        message,
        source: 'kalara-distro-web',
        context: {
          store: 'KALARA DISTRO Bandung',
          cartItemCount,
          cartSummary,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const rawText = await upstream.text();
    if (!upstream.ok) {
      if (upstream.status === 404) {
        res.status(502).json({
          error: parsedUrl.pathname.includes('/webhook-test/')
            ? 'n8n merespons 404 (Test URL tidak aktif). Ganti N8N_WEBHOOK_URL ke Production URL (/webhook/...) dan nyalakan toggle Active di n8n Cloud.'
            : 'n8n merespons 404 (Webhook tidak ditemukan). Pastikan workflow Active dan method POST.',
        });
        return;
      }
      if (upstream.status === 401 || upstream.status === 403) {
        res.status(502).json({
          error: 'Autentikasi webhook n8n ditolak (401/403). Periksa N8N_AUTH_HEADER_NAME dan N8N_AUTH_HEADER_VALUE.',
        });
        return;
      }
      res.status(502).json({
        error: `Workflow n8n merespons status ${upstream.status}. Periksa Executions log di n8n Cloud.`,
      });
      return;
    }

    let parsed: unknown = rawText;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }

    const reply = extractReply(parsed);
    if (!reply) {
      res.status(502).json({
        error: 'Webhook n8n merespons kosong. Pastikan node Respond to Webhook mengembalikan JSON { "output": "..." }.',
      });
      return;
    }

    res.status(200).json({ reply, sessionId, engine: 'n8n' });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      res.status(504).json({ error: 'Koneksi ke n8n Cloud melewati batas waktu (30 detik).' });
      return;
    }
    res.status(502).json({
      error: 'Tidak dapat terhubung ke server n8n Cloud. Pastikan Production Webhook URL benar dan workflow Active.',
    });
  }
}
