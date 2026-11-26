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

  const raw =
    cleanEnv(process.env.N8N_WEBHOOK_URL) || cleanEnv(process.env.N8N_CLOUD_WEBHOOK_URL);

  if (!raw) {
    res.status(200).json({ configured: false });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    res.status(200).json({
      configured: false,
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
      configError: 'URL N8N_WEBHOOK_URL tidak diizinkan.',
    });
    return;
  }

  const isWorkflowUrl = parsed.pathname.includes('/workflow/');
  const isTestWebhook = parsed.pathname.includes('/webhook-test/');

  res.status(200).json({
    configured: true,
    ...(isTestWebhook ? { isTestWebhook: true } : {}),
    ...(isWorkflowUrl
      ? {
          configError:
            'URL yang dimasukkan adalah URL editor (/workflow/...), bukan Production Webhook URL (/webhook/...).',
        }
      : isTestWebhook
        ? {
            configError:
              'URL memakai /webhook-test/ (Test URL). Ganti ke Production URL (/webhook/...) dan aktifkan toggle Active di n8n Cloud.',
          }
        : {}),
  });
}
