export interface CustomerChatContext {
  store: string;
  cartItemCount: number;
  cartSummary: string[];
}

export interface CustomerChatRequestBody {
  message: string;
  sessionId: string;
  context?: CustomerChatContext;
}

export interface N8nCloudReply {
  reply: string;
  sessionId: string;
  usedTestWebhook?: boolean;
}

export interface N8nCloudStatus {
  configured: boolean;
  isN8nCloudHost?: boolean;
  matchesTemplatePath?: boolean;
  isTestWebhook?: boolean;
  hasAuthHeader?: boolean;
  configError?: string;
}

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{4,128}$/;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CART_SUMMARY_ITEMS = 20;
const REQUEST_TIMEOUT_MS = 30_000;

function cleanEnvValue(value: string | undefined): string {
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

export function getValidatedWebhookUrl(): { url: URL | null; error?: string } {
  const raw =
    cleanEnvValue(process.env.N8N_WEBHOOK_URL) ||
    cleanEnvValue(process.env.N8N_CLOUD_WEBHOOK_URL);

  if (!raw) {
    return { url: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      url: null,
      error:
        'Format N8N_WEBHOOK_URL tidak valid. Contoh yang benar: https://workspace.app.n8n.cloud/webhook/kalara-cs-chat',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      url: null,
      error: 'N8N_WEBHOOK_URL harus memakai protokol https:// (n8n Cloud).',
    };
  }

  if (isBlockedMetadataHost(parsed.hostname)) {
    return {
      url: null,
      error: 'Host N8N_WEBHOOK_URL tidak diizinkan.',
    };
  }

  return { url: parsed };
}

export function getN8nCloudStatus(): N8nCloudStatus {
  const { url, error } = getValidatedWebhookUrl();
  const normalizedPath = url ? url.pathname.replace(/\/+$/, '') : '';
  const isN8nCloudHost = url ? url.hostname.toLowerCase().endsWith('.n8n.cloud') : false;
  const isTestWebhook = url ? url.pathname.includes('/webhook-test/') : false;
  const isWorkflowEditorUrl = url ? url.pathname.includes('/workflow/') : false;
  const isMissingWebhookPath = url
    ? !url.pathname.includes('/webhook/') && !url.pathname.includes('/webhook-test/')
    : false;
  const matchesTemplatePath =
    normalizedPath.endsWith('/kalara-cs-chat') || normalizedPath.endsWith('/kalara-ai-chat');
  const hasAuthHeader = Boolean(
    cleanEnvValue(process.env.N8N_AUTH_HEADER_NAME) &&
      cleanEnvValue(process.env.N8N_AUTH_HEADER_VALUE)
  );

  let configError = error;
  if (!configError && isWorkflowEditorUrl) {
    configError =
      'URL yang dimasukkan adalah URL editor (/workflow/...), bukan Production Webhook URL (/webhook/...). Buka node Webhook → salin Production URL.';
  } else if (!configError && isTestWebhook) {
    configError =
      'URL memakai /webhook-test/ (Test URL). Ganti ke Production URL (/webhook/...) dan aktifkan toggle Active di n8n Cloud.';
  } else if (!configError && isMissingWebhookPath) {
    configError =
      'N8N_WEBHOOK_URL belum mengandung path /webhook/.... Buka node Webhook Customer Chat di n8n Cloud → salin Production URL.';
  }

  return {
    configured: Boolean(url),
    ...(url ? { isN8nCloudHost, matchesTemplatePath, hasAuthHeader } : {}),
    ...(isTestWebhook ? { isTestWebhook: true } : {}),
    ...(configError ? { configError } : {}),
  };
}

export function validateCustomerChatPayload(body: unknown): {
  data?: CustomerChatRequestBody;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Payload permintaan tidak valid.' };
  }

  const record = body as Record<string, unknown>;
  const rawMessage = typeof record.message === 'string' ? record.message.trim() : '';
  const rawSessionId = typeof record.sessionId === 'string' ? record.sessionId.trim() : '';

  if (!rawMessage) {
    return { error: 'Pesan tidak boleh kosong.' };
  }
  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    return { error: `Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter).` };
  }

  if (!SESSION_ID_REGEX.test(rawSessionId)) {
    return { error: 'Session ID tidak valid.' };
  }

  let safeContext: CustomerChatContext | undefined;
  if (record.context && typeof record.context === 'object') {
    const ctx = record.context as Record<string, unknown>;
    const cartItemCount =
      typeof ctx.cartItemCount === 'number' && Number.isFinite(ctx.cartItemCount)
        ? Math.max(0, Math.min(999, Math.floor(ctx.cartItemCount)))
        : 0;
    const cartSummary = Array.isArray(ctx.cartSummary)
      ? ctx.cartSummary
          .filter((item): item is string => typeof item === 'string')
          .slice(0, MAX_CART_SUMMARY_ITEMS)
          .map((item) => item.slice(0, 140))
      : [];

    safeContext = {
      store: 'KALARA DISTRO Bandung',
      cartItemCount,
      cartSummary,
    };
  }

  return {
    data: {
      message: rawMessage,
      sessionId: rawSessionId,
      context: safeContext,
    },
  };
}

function extractReplyFromUnknown(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const extracted = extractReplyFromUnknown(item);
      if (extracted) return extracted;
    }
    return null;
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const candidateKeys = [
      'output',
      'reply',
      'text',
      'response',
      'message',
      'answer',
      'content',
      'result',
    ];

    for (const key of candidateKeys) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    if (obj.data) {
      const nested = extractReplyFromUnknown(obj.data);
      if (nested) return nested;
    }
    if (obj.json) {
      const nested = extractReplyFromUnknown(obj.json);
      if (nested) return nested;
    }
  }

  return null;
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

function parseN8nBody(rawText: string, contentType: string): unknown {
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawText);
    } catch {
      return rawText;
    }
  }
  if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
    try {
      return JSON.parse(rawText);
    } catch {
      return rawText;
    }
  }
  return rawText;
}

export async function forwardCustomerChatToN8n(
  payload: CustomerChatRequestBody
): Promise<{ result?: N8nCloudReply; status: number; error?: string }> {
  const { url, error: configError } = getValidatedWebhookUrl();
  if (configError) {
    return { status: 500, error: configError };
  }

  if (!url) {
    return {
      status: 503,
      error:
        'Webhook n8n Cloud belum dikonfigurasi. Tambahkan Production URL ke N8N_WEBHOOK_URL di Settings > Secrets atau Environment Variables Vercel.',
    };
  }

  if (url.pathname.includes('/workflow/')) {
    return {
      status: 500,
      error:
        'N8N_WEBHOOK_URL berisi URL editor (/workflow/...), bukan Production Webhook URL (/webhook/...). Buka node Webhook di n8n Cloud → salin Production URL.',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain',
  };

  const authHeaderName = cleanEnvValue(process.env.N8N_AUTH_HEADER_NAME);
  const authHeaderValue = cleanEnvValue(process.env.N8N_AUTH_HEADER_VALUE);
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
    sessionId: payload.sessionId,
    chatInput: payload.message,
    message: payload.message,
    source: 'kalara-distro-web',
    context: payload.context ?? {
      store: 'KALARA DISTRO Bandung',
      cartItemCount: 0,
      cartSummary: [],
    },
  };

  try {
    let upstream = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(n8nBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    let contentType = upstream.headers.get('content-type') ?? '';
    let rawText = await upstream.text();

    // Auto-recover if Webhook node in n8n Cloud was left on GET method
    if (
      upstream.status === 404 &&
      (rawText.toLowerCase().includes('make a get request') ||
        rawText.toLowerCase().includes('not registered for post'))
    ) {
      const getUrl = new URL(url.toString());
      getUrl.searchParams.set('chatInput', payload.message);
      getUrl.searchParams.set('message', payload.message);
      getUrl.searchParams.set('sessionId', payload.sessionId);
      const getHeaders = { ...headers };
      delete getHeaders['Content-Type'];
      const retryGet = await fetch(getUrl.toString(), {
        method: 'GET',
        headers: getHeaders,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (retryGet.status !== 404) {
        upstream = retryGet;
        contentType = retryGet.headers.get('content-type') ?? '';
        rawText = await retryGet.text();
      }
    }

    // Auto-recover if user imported a newer/older KALARA template path, had trailing slash, or is testing via Execute Workflow
    let usedTestWebhook = url.pathname.includes('/webhook-test/');
    if (upstream.status === 404) {
      const normalizedPath = url.pathname.replace(/\/+$/, '');
      const altPathSet = new Set<string>();
      if (normalizedPath && normalizedPath !== url.pathname) {
        altPathSet.add(normalizedPath);
      }
      if (url.pathname.includes('/webhook-test/')) {
        altPathSet.add(normalizedPath.replace('/webhook-test/', '/webhook/'));
      }
      altPathSet.add('/webhook/kalara-cs-chat');
      altPathSet.add('/webhook/kalara-ai-chat');
      if (normalizedPath.includes('/webhook/') && !normalizedPath.endsWith('/chat')) {
        altPathSet.add(`${normalizedPath}/chat`);
      }
      // Finally try Test Webhook URLs in case the user clicked "Execute workflow" in n8n Cloud canvas
      if (normalizedPath.includes('/webhook/')) {
        altPathSet.add(normalizedPath.replace('/webhook/', '/webhook-test/'));
      }
      altPathSet.add('/webhook-test/kalara-cs-chat');
      altPathSet.delete(url.pathname);

      for (const altPathname of altPathSet) {
        const altUrl = new URL(url.toString());
        altUrl.pathname = altPathname;
        const retryAlt = await fetch(altUrl.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify(n8nBody),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (retryAlt.status !== 404) {
          upstream = retryAlt;
          contentType = retryAlt.headers.get('content-type') ?? '';
          rawText = await retryAlt.text();
          usedTestWebhook = altPathname.includes('/webhook-test/');
          break;
        }
      }
    }

    if (!upstream.ok) {
      const detail = extractErrorDetails(rawText);
      const isTestPath = url.pathname.includes('/webhook-test/');

      if (upstream.status === 404) {
        return {
          status: 502,
          error: isTestPath
            ? `n8n Cloud merespons 404 (Test URL tidak aktif). Ganti N8N_WEBHOOK_URL ke Production URL (/webhook/...) lalu aktifkan toggle Active / Publish di n8n Cloud.${detail ? ` (${detail})` : ''}`
            : `n8n Cloud merespons 404 (Webhook belum aktif). Buka editor n8n Cloud → klik Save → nyalakan toggle Active / Publish hingga hijau.${detail ? ` (${detail})` : ''}`,
        };
      }

      if (upstream.status === 401 || upstream.status === 403) {
        return {
          status: 502,
          error:
            'Autentikasi Header Auth ditolak (401/403). Cocokkan N8N_AUTH_HEADER_NAME dan N8N_AUTH_HEADER_VALUE dengan credential Header Auth di n8n Cloud.',
        };
      }

      return {
        status: 502,
        error: `Workflow n8n Cloud merespons status ${upstream.status}.${detail ? ` Detail: ${detail}` : ' Periksa tab Executions di n8n Cloud (pastikan API Key AI Model sudah terpasang).'}`,
      };
    }

    const parsed = parseN8nBody(rawText, contentType);
    const reply = extractReplyFromUnknown(parsed);
    if (!reply) {
      return {
        status: 502,
        error:
          'Webhook n8n Cloud merespons kosong. Pastikan node Webhook memakai Respond = "Using \'Respond to Webhook\' Node" dan node Respond to Webhook mengembalikan JSON { "output": "..." }.',
      };
    }

    return {
      status: 200,
      result: {
        reply,
        sessionId: payload.sessionId,
        ...(usedTestWebhook ? { usedTestWebhook: true } : {}),
      },
    };
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return {
        status: 504,
        error: 'Koneksi ke n8n Cloud melewati batas waktu (30 detik). Coba kirim ulang.',
      };
    }

    return {
      status: 502,
      error:
        'Tidak dapat terhubung ke n8n Cloud. Pastikan Production Webhook URL benar dan workflow dalam status Active.',
    };
  }
}
