export interface N8nChatContext {
  store: string;
  cartItemCount: number;
  cartSummary: string[];
}

export interface N8nChatRequestBody {
  message: string;
  sessionId: string;
  context?: N8nChatContext;
}

export interface N8nProxyResult {
  reply: string;
  sessionId: string;
}

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{4,128}$/;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CART_SUMMARY_ITEMS = 20;
const REQUEST_TIMEOUT_MS = 30_000;

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
  const raw = process.env.N8N_WEBHOOK_URL?.trim();
  if (!raw) {
    return { url: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      url: null,
      error: 'Format N8N_WEBHOOK_URL di konfigurasi server tidak valid.',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      url: null,
      error: 'N8N_WEBHOOK_URL harus menggunakan protokol http:// atau https://.',
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

export function validateChatPayload(body: unknown): {
  data?: N8nChatRequestBody;
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

  let safeContext: N8nChatContext | undefined;
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

export async function forwardChatToN8n(
  payload: N8nChatRequestBody
): Promise<{ result?: N8nProxyResult; status: number; error?: string }> {
  const { url, error: configError } = getValidatedWebhookUrl();
  if (configError) {
    return { status: 500, error: configError };
  }
  if (!url) {
    return {
      status: 503,
      error:
        'Webhook n8n belum dikonfigurasi. Tambahkan N8N_WEBHOOK_URL di Settings > Secrets atau environment variable server.',
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain',
  };

  const authHeaderName = process.env.N8N_AUTH_HEADER_NAME?.trim();
  const authHeaderValue = process.env.N8N_AUTH_HEADER_VALUE?.trim();
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
    const upstream = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(n8nBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const contentType = upstream.headers.get('content-type') ?? '';
    const rawText = await upstream.text();

    if (!upstream.ok) {
      return {
        status: 502,
        error: `Workflow n8n merespons dengan status ${upstream.status}. Pastikan workflow aktif (Active) dan node Respond to Webhook / Chat Trigger berjalan normal.`,
      };
    }

    let parsed: unknown = rawText;
    if (contentType.includes('application/json')) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = rawText;
      }
    } else if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = rawText;
      }
    }

    const reply = extractReplyFromUnknown(parsed);
    if (!reply) {
      return {
        status: 502,
        error:
          'Workflow n8n berhasil terpanggil tetapi tidak mengembalikan teks balasan (field output/reply/text kosong).',
      };
    }

    return {
      status: 200,
      result: {
        reply,
        sessionId: payload.sessionId,
      },
    };
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return {
        status: 504,
        error: 'Koneksi ke server n8n melewati batas waktu (30 detik). Silakan coba lagi.',
      };
    }

    return {
      status: 502,
      error:
        'Tidak dapat terhubung ke server n8n self-hosted. Pastikan URL webhook dapat diakses secara publik (HTTPS) dan server n8n sedang online.',
    };
  }
}
