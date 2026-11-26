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

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawWebhook =
    cleanEnv(process.env.N8N_WEBHOOK_URL) || cleanEnv(process.env.N8N_CLOUD_WEBHOOK_URL);
  const geminiKey = cleanEnv(process.env.GEMINI_API_KEY);
  const geminiReady = Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY');

  if (!rawWebhook) {
    res.status(200).json({
      configured: false,
      engine: geminiReady ? 'gemini' : 'none',
    });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawWebhook);
  } catch {
    res.status(200).json({
      configured: false,
      engine: geminiReady ? 'gemini' : 'none',
      configError: 'Format N8N_WEBHOOK_URL tidak valid.',
    });
    return;
  }

  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    isBlockedMetadataHost(parsed.hostname)
  ) {
    res.status(200).json({
      configured: false,
      engine: 'none',
      configError: 'URL N8N_WEBHOOK_URL tidak diizinkan.',
    });
    return;
  }

  const isTestWebhook = parsed.pathname.includes('/webhook-test/');
  res.status(200).json({
    configured: true,
    engine: 'n8n',
    ...(isTestWebhook
      ? {
          isTestWebhook: true,
          configError:
            'URL saat ini memakai /webhook-test/ (Test URL). Ganti ke Production URL (/webhook/...) dan aktifkan toggle Active di n8n Cloud.',
        }
      : {}),
  });
}
