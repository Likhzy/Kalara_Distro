interface ServerlessRequest {
  method?: string;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

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
        sessionId: 'kalara-connection-test',
        chatInput: 'Halo, tes koneksi dari website KALARA DISTRO.',
        message: 'Halo, tes koneksi dari website KALARA DISTRO.',
        source: 'kalara-distro-web',
        context: {
          store: 'KALARA DISTRO Bandung',
          cartItemCount: 0,
          cartSummary: [],
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      res.status(502).json({
        ok: false,
        message:
          upstream.status === 404
            ? 'n8n Cloud merespons 404 — pastikan workflow sudah Save & toggle Active / Publish menyala hijau dan URL memakai Production URL.'
            : `n8n Cloud merespons status ${upstream.status}. Cek Executions log di n8n Cloud.`,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: 'Terhubung! Workflow n8n Cloud aktif dan merespons normal.',
    });
  } catch {
    res.status(502).json({
      ok: false,
      message: 'Tidak dapat terhubung ke n8n Cloud. Periksa Production Webhook URL kamu.',
    });
  }
}
