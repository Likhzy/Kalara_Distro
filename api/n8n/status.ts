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

  const normalizedPath = parsed.pathname.replace(/\/+$/, '');
  const isN8nCloudHost = parsed.hostname.toLowerCase().endsWith('.n8n.cloud');
  const isWorkflowUrl = parsed.pathname.includes('/workflow/');
  const isTestWebhook = parsed.pathname.includes('/webhook-test/');
  const isMissingWebhookPath =
    !parsed.pathname.includes('/webhook/') && !parsed.pathname.includes('/webhook-test/');
  const matchesTemplatePath =
    normalizedPath.endsWith('/kalara-cs-chat') || normalizedPath.endsWith('/kalara-ai-chat');
  const hasAuthHeader = Boolean(
    cleanEnv(process.env.N8N_AUTH_HEADER_NAME) && cleanEnv(process.env.N8N_AUTH_HEADER_VALUE)
  );

  const configError = isWorkflowUrl
    ? 'URL yang dimasukkan adalah URL editor (/workflow/...), bukan Production Webhook URL (/webhook/...).'
    : isTestWebhook
      ? 'URL memakai /webhook-test/ (Test URL). Ganti ke Production URL (/webhook/...) dan aktifkan toggle Active di n8n Cloud.'
      : isMissingWebhookPath
        ? 'N8N_WEBHOOK_URL belum mengandung path /webhook/.... Buka node Webhook Customer Chat di n8n Cloud → salin Production URL.'
        : undefined;

  res.status(200).json({
    configured: true,
    isN8nCloudHost,
    matchesTemplatePath,
    hasAuthHeader,
    ...(isTestWebhook ? { isTestWebhook: true } : {}),
    ...(configError ? { configError } : {}),
  });
}
