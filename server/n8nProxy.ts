import { askKalaraGemini, isGeminiConfigured } from './geminiAssistant.ts';

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

export type ChatEngine = 'n8n' | 'gemini' | 'none';

export interface N8nProxyResult {
  reply: string;
  sessionId: string;
  engine: 'n8n' | 'gemini';
}

export interface N8nStatusInfo {
  configured: boolean;
  engine: ChatEngine;
  isTestWebhook?: boolean;
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
        'Format N8N_WEBHOOK_URL tidak valid. Pastikan berisi URL lengkap, misal: https://workspace.app.n8n.cloud/webhook/kalara-ai-chat',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      url: null,
      error: 'N8N_WEBHOOK_URL harus menggunakan protokol https:// (n8n Cloud) atau http://.',
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

export function getN8nStatusInfo(): N8nStatusInfo {
  const { url, error } = getValidatedWebhookUrl();
  const isTestWebhook = url ? url.pathname.includes('/webhook-test/') : false;
  const geminiReady = isGeminiConfigured();

  const engine: ChatEngine = url ? 'n8n' : geminiReady ? 'gemini' : 'none';

  return {
    configured: Boolean(url),
    engine,
    ...(isTestWebhook ? { isTestWebhook: true } : {}),
    ...(error
      ? { configError: error }
      : isTestWebhook
        ? {
            configError:
              'URL saat ini memakai /webhook-test/ (Test URL). Ganti ke Production URL (/webhook/...) dan aktifkan toggle Active di n8n Cloud agar selalu aktif.',
          }
        : {}),
  };
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

function extractErrorHint(rawText: string): string {
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
    return msg.trim().slice(0, 140);
  } catch {
    return trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
  }
}

export async function forwardChatToN8n(
  payload: N8nChatRequestBody
): Promise<{ result?: N8nProxyResult; status: number; error?: string }> {
  const { url, error: configError } = getValidatedWebhookUrl();
  if (configError) {
    return { status: 500, error: configError };
  }

  // If n8n Cloud webhook URL is not configured yet, run the built-in Gemini AI assistant
  // when GEMINI_API_KEY is available so the chatbot works out of the box.
  if (!url) {
    if (isGeminiConfigured()) {
      const aiRes = await askKalaraGemini(payload);
      if (!aiRes.reply) {
        return { status: aiRes.status, error: aiRes.error };
      }
      return {
        status: 200,
        result: {
          reply: aiRes.reply,
          sessionId: payload.sessionId,
          engine: 'gemini',
        },
      };
    }

    return {
      status: 503,
      error:
        'Webhook n8n Cloud belum dikonfigurasi. Tambahkan N8N_WEBHOOK_URL di Settings > Secrets atau Environment Variables Vercel.',
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
    const upstream = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(n8nBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const contentType = upstream.headers.get('content-type') ?? '';
    const rawText = await upstream.text();

    if (!upstream.ok) {
      const hint = extractErrorHint(rawText);
      const isTestPath = url.pathname.includes('/webhook-test/');

      if (upstream.status === 404) {
        return {
          status: 502,
          error: isTestPath
            ? 'n8n merespons 404 (Test URL tidak aktif). Ganti N8N_WEBHOOK_URL ke Production URL (/webhook/...) dan nyalakan toggle Active di n8n Cloud.'
            : 'n8n merespons 404 (Webhook tidak ditemukan). Pastikan workflow sudah di-Save, toggle Active menyala hijau, dan method Webhook adalah POST.',
        };
      }

      if (upstream.status === 401 || upstream.status === 403) {
        return {
          status: 502,
          error:
            'Autentikasi webhook n8n ditolak (401/403). Periksa N8N_AUTH_HEADER_NAME dan N8N_AUTH_HEADER_VALUE agar cocok dengan Header Auth di n8n.',
        };
      }

      return {
        status: 502,
        error: `Workflow n8n merespons status ${upstream.status}.${hint ? ` Detail: ${hint}` : ' Periksa Executions log di n8n Cloud (mis. kredensial AI Model atau node Respond to Webhook).'}`,
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
          'Webhook n8n merespons kosong. Pastikan node Webhook menggunakan Respond = "Using \'Respond to Webhook\' Node" dan mengembalikan JSON { "output": "..." }.',
      };
    }

    return {
      status: 200,
      result: {
        reply,
        sessionId: payload.sessionId,
        engine: 'n8n',
      },
    };
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return {
        status: 504,
        error: 'Koneksi ke n8n Cloud melewati batas waktu (30 detik). Silakan coba lagi.',
      };
    }

    return {
      status: 502,
      error:
        'Tidak dapat terhubung ke server n8n Cloud. Pastikan Production Webhook URL benar dan workflow dalam status Active.',
    };
  }
}
