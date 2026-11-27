interface ServerlessRequest {
  method?: string;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

const REQUEST_TIMEOUT_MS = 25_000;

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

function sanitizeUpstreamMessage(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/"(?:POST|GET)\s+[^"]+"/gi, '"[webhook]"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function extractErrorDetails(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const msg =
      typeof parsed.message === 'string'
        ? parsed.message
        : typeof parsed.error === 'string'
          ? parsed.error
          : '';
    const hint = typeof parsed.hint === 'string' ? parsed.hint : '';
    return sanitizeUpstreamMessage([msg, hint].filter(Boolean).join(' — '));
  } catch {
    return sanitizeUpstreamMessage(trimmed);
  }
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
    for (const key of [
      'output',
      'reply',
      'text',
      'response',
      'message',
      'answer',
      'content',
      'result',
    ]) {
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
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  const raw =
    cleanEnv(process.env.N8N_WEBHOOK_URL) || cleanEnv(process.env.N8N_CLOUD_WEBHOOK_URL);

  if (!raw) {
    res.status(503).json({
      ok: false,
      message: 'N8N_WEBHOOK_URL belum disetel di Environment Variables.',
    });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(raw);
  } catch {
    res.status(500).json({ ok: false, message: 'Format N8N_WEBHOOK_URL tidak valid.' });
    return;
  }

  if (
    (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') ||
    isBlockedMetadataHost(parsedUrl.hostname)
  ) {
    res.status(500).json({ ok: false, message: 'URL N8N_WEBHOOK_URL tidak diizinkan.' });
    return;
  }

  if (parsedUrl.pathname.includes('/workflow/')) {
    res.status(500).json({
      ok: false,
      message:
        'N8N_WEBHOOK_URL berisi URL editor (/workflow/...), bukan Production Webhook URL (/webhook/...).',
    });
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

  const n8nBody = {
    action: 'sendMessage',
    sessionId: 'kalara-connection-test',
    chatInput: 'Halo, tes koneksi dari website KALARA DISTRO.',
    message: 'Halo, tes koneksi dari website KALARA DISTRO.',
    source: 'kalara-distro-web',
    context: {
      store: 'KALARA DISTRO Bandung',
      cartItemCount: 0,
      cartSummary: [],
    },
  };

  try {
    let upstream = await fetch(parsedUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(n8nBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    let rawText = await upstream.text();

    if (
      upstream.status === 404 &&
      (rawText.toLowerCase().includes('make a get request') ||
        rawText.toLowerCase().includes('not registered for post'))
    ) {
      const getUrl = new URL(parsedUrl.toString());
      getUrl.searchParams.set('chatInput', n8nBody.chatInput);
      getUrl.searchParams.set('message', n8nBody.message);
      getUrl.searchParams.set('sessionId', n8nBody.sessionId);
      const getHeaders = { ...headers };
      delete getHeaders['Content-Type'];
      const retryGet = await fetch(getUrl.toString(), {
        method: 'GET',
        headers: getHeaders,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (retryGet.status !== 404) {
        upstream = retryGet;
        rawText = await retryGet.text();
      }
    }

    if (upstream.status === 404) {
      const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
      const altPathSet = new Set<string>();
      if (parsedUrl.pathname.includes('/webhook-test/')) {
        altPathSet.add(parsedUrl.pathname.replace('/webhook-test/', '/webhook/'));
      }
      altPathSet.add('/webhook/kalara-cs-chat');
      altPathSet.add('/webhook/kalara-ai-chat');
      if (parsedUrl.pathname.includes('/webhook/') && !normalizedPath.endsWith('/chat')) {
        altPathSet.add(`${normalizedPath}/chat`);
      }
      altPathSet.delete(parsedUrl.pathname);
      altPathSet.delete(normalizedPath);

      for (const altPathname of altPathSet) {
        const altUrl = new URL(parsedUrl.toString());
        altUrl.pathname = altPathname;
        const retryAlt = await fetch(altUrl.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify(n8nBody),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (retryAlt.status !== 404) {
          upstream = retryAlt;
          rawText = await retryAlt.text();
          break;
        }
      }
    }

    if (!upstream.ok) {
      const detail = extractErrorDetails(rawText);
      if (upstream.status === 404) {
        res.status(502).json({
          ok: false,
          message: parsedUrl.pathname.includes('/webhook-test/')
            ? `n8n Cloud merespons 404 (Test URL tidak aktif). Ganti N8N_WEBHOOK_URL ke Production URL (/webhook/...) lalu aktifkan toggle Active.${detail ? ` (${detail})` : ''}`
            : `n8n Cloud merespons 404 (Webhook belum aktif). Buka editor n8n Cloud → klik Save → nyalakan toggle Active / Publish hingga hijau.${detail ? ` (${detail})` : ''}`,
        });
        return;
      }
      if (upstream.status === 401 || upstream.status === 403) {
        res.status(502).json({
          ok: false,
          message:
            'Autentikasi Header Auth ditolak (401/403). Periksa N8N_AUTH_HEADER_NAME dan N8N_AUTH_HEADER_VALUE.',
        });
        return;
      }
      res.status(502).json({
        ok: false,
        message: `Workflow n8n Cloud merespons status ${upstream.status}.${detail ? ` Detail: ${detail}` : ' Cek Executions log di n8n Cloud.'}`,
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
        ok: false,
        message:
          'Webhook n8n Cloud merespons kosong. Pastikan node Respond to Webhook mengembalikan JSON { "output": "..." }.',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Terhubung! Workflow n8n Cloud aktif dan merespons normal.',
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      res.status(504).json({
        ok: false,
        message: 'Koneksi ke n8n Cloud melewati batas waktu (25 detik).',
      });
      return;
    }
    res.status(502).json({
      ok: false,
      message: 'Tidak dapat terhubung ke n8n Cloud. Periksa Production Webhook URL kamu.',
    });
  }
}
