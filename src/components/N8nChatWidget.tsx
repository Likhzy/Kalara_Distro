import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import type { CartItem, ProductCategory, ProductVariant } from '../types';
import { formatIDR } from '../data/catalog';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  timestamp: string;
  retryPrompt?: string;
}

interface N8nChatWidgetProps {
  categories: ProductCategory[];
  cart: CartItem[];
  onSelectCategory: (category: ProductCategory, variantId?: string) => void;
}

const SESSION_STORAGE_KEY = 'kalara_n8n_chat_session_v1';

const QUICK_PROMPTS = [
  'Rekomendasi outfit kuliah di bawah Rp200rb',
  'Beda bahan Combed 20s & Cotton Fleece?',
  'Panduan ukuran kaos oversized S–XXL',
  'Alamat & jam buka toko Bandung',
] as const;

const SAMPLE_N8N_PAYLOAD = `{
  "action": "sendMessage",
  "sessionId": "kalara-xxxx",
  "chatInput": "Rekomendasi hoodie hitam ukuran L",
  "message": "Rekomendasi hoodie hitam ukuran L",
  "source": "kalara-distro-web",
  "context": {
    "store": "KALARA DISTRO Bandung",
    "cartItemCount": 1,
    "cartSummary": ["Kalara Archive Boxy Tee (L) x1"]
  }
}`;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `kalara-${crypto.randomUUID()}`;
  }
  return `kalara-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{4,128}$/.test(existing)) {
      return existing;
    }
    const created = generateSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return generateSessionId();
  }
}

function formatNow(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome-msg',
    role: 'assistant',
    text: 'Halo! Saya KALARA AI Assistant. Tanyakan rekomendasi outfit, perbandingan bahan, panduan ukuran S–XXL, atau info toko Bandung.',
    timestamp: formatNow(),
  };
}

function findMentionedProducts(
  text: string,
  categories: ProductCategory[]
): Array<{ category: ProductCategory; variant?: ProductVariant; label: string; priceLabel: string }> {
  const lower = text.toLowerCase();
  const results: Array<{
    category: ProductCategory;
    variant?: ProductVariant;
    label: string;
    priceLabel: string;
  }> = [];
  const seen = new Set<string>();

  for (const cat of categories) {
    for (const variant of cat.variants) {
      if (lower.includes(variant.name.toLowerCase()) && !seen.has(variant.id)) {
        seen.add(variant.id);
        results.push({
          category: cat,
          variant,
          label: variant.name,
          priceLabel: formatIDR(variant.price),
        });
      }
    }
  }

  if (results.length < 3) {
    for (const cat of categories) {
      const catKeywords = [cat.title.toLowerCase()];
      if (cat.id === 'kaos-grafis') catKeywords.push('kaos grafis', 'boxy tee');
      if (cat.id === 'hoodie-fleece') catKeywords.push('hoodie fleece');
      if (cat.id === 'crewneck-basic') catKeywords.push('crewneck');
      if (cat.id === 'kemeja-casual') catKeywords.push('kemeja', 'workshirt');
      if (cat.id === 'celana') catKeywords.push('cargo', 'celana');
      if (cat.id === 'topi-aksesori') catKeywords.push('beanie', 'dad cap', 'topi');

      const alreadyHasCat = results.some((r) => r.category.id === cat.id);
      if (!alreadyHasCat && catKeywords.some((kw) => lower.includes(kw))) {
        results.push({
          category: cat,
          label: cat.title,
          priceLabel: cat.priceRange,
        });
      }
    }
  }

  return results.slice(0, 3);
}

export function N8nChatWidget({ categories, cart, onSelectCategory }: N8nChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>(getOrCreateSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [n8nConfigured, setN8nConfigured] = useState<boolean | null>(null);
  const [activeEngine, setActiveEngine] = useState<'n8n' | 'gemini' | 'none' | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cartSummary = useMemo(
    () => cart.map((item) => `${item.variantName} (${item.size}) x${item.quantity}`),
    [cart]
  );

  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    fetch('/api/n8n/status')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Status check failed'))))
      .then(
        (data: {
          configured?: boolean;
          engine?: 'n8n' | 'gemini' | 'none';
          configError?: string;
        }) => {
          if (cancelled) return;
          const configured = Boolean(data.configured);
          const engine = data.engine ?? (configured ? 'n8n' : 'none');
          setN8nConfigured(configured);
          setActiveEngine(engine);
          setConfigError(data.configError ?? null);
          if (engine === 'none') {
            setShowSetupGuide(true);
          }
        }
      )
      .catch(() => {
        if (!cancelled) {
          setN8nConfigured(false);
          setActiveEngine('none');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleResetChat = () => {
    const nextSession = generateSessionId();
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextSession);
    } catch {
      // Ignore sessionStorage restrictions
    }
    setSessionId(nextSession);
    setMessages([createWelcomeMessage()]);
    setInput('');
  };

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: formatNow(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/n8n/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          context: {
            store: 'KALARA DISTRO Bandung',
            cartItemCount: totalCartItems,
            cartSummary,
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reply?: string;
        engine?: 'n8n' | 'gemini';
        error?: string;
      };

      if (!response.ok || !data.reply) {
        if (response.status === 503) {
          setN8nConfigured(false);
          setActiveEngine('none');
          setShowSetupGuide(true);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'error',
            text:
              data.error ??
              'Gagal mendapatkan balasan dari server AI. Silakan coba lagi beberapa saat.',
            timestamp: formatNow(),
            retryPrompt: trimmed,
          },
        ]);
        return;
      }

      if (data.engine) {
        setActiveEngine(data.engine);
        setN8nConfigured(data.engine === 'n8n');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply as string,
          timestamp: formatNow(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'error',
          text: 'Koneksi jaringan terputus saat menghubungi server chat. Coba beberapa saat lagi.',
          timestamp: formatNow(),
          retryPrompt: trimmed,
        },
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_N8N_PAYLOAD);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch {
      setCopiedPayload(false);
    }
  };

  const showStarterPrompts = messages.length === 1 && !isSending;

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka KALARA AI Chatbot"
          className="fixed bottom-md right-md z-40 bg-primary text-on-primary border border-outline px-md py-sm rounded-none font-label text-label-md uppercase inline-flex items-center gap-sm hover:bg-accent hover:text-on-accent transition-colors duration-snap ease-snap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer whitespace-nowrap"
        >
          <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>TANYA KALARA AI</span>
        </button>
      )}

      {/* Neo-Brutalist Chat Window */}
      {isOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="KALARA AI Chatbot n8n"
          className="fixed bottom-md right-md z-40 w-[calc(100vw-2rem)] sm:w-[400px] h-[560px] max-h-[82vh] bg-surface border border-outline rounded-none flex flex-col"
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between px-md py-sm border-b border-outline bg-primary text-on-primary">
            <div className="flex flex-col min-w-0">
              <span className="font-label text-label-sm text-on-primary/75 uppercase">
                {activeEngine === 'n8n'
                  ? 'N8N CLOUD AI'
                  : activeEngine === 'gemini'
                    ? 'AI AKTIF · SIAP N8N CLOUD'
                    : 'N8N CLOUD AI'}
              </span>
              <h2 className="font-headline text-title-md text-on-primary uppercase truncate">
                KALARA AI ASSISTANT
              </h2>
            </div>

            <div className="flex items-center gap-xs shrink-0">
              <button
                type="button"
                onClick={() => setShowSetupGuide((prev) => !prev)}
                className={`border border-on-primary/40 px-sm py-xs font-label text-label-sm uppercase transition-colors duration-snap cursor-pointer ${
                  showSetupGuide
                    ? 'bg-accent text-on-accent border-outline'
                    : 'bg-transparent text-on-primary hover:bg-on-primary hover:text-primary'
                }`}
              >
                PANDUAN
              </button>
              <button
                type="button"
                onClick={handleResetChat}
                aria-label="Mulai sesi obrolan baru"
                title="Reset percakapan"
                className="border border-on-primary/40 p-xs text-on-primary hover:bg-on-primary hover:text-primary transition-colors duration-snap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup chatbot"
                className="border border-on-primary/40 p-xs text-on-primary hover:bg-accent hover:text-on-accent hover:border-outline transition-colors duration-snap cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* n8n Cloud Integration Setup Guide Drawer */}
          {showSetupGuide && (
            <div className="border-b border-outline bg-surface-container p-md flex flex-col gap-sm max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between gap-sm">
                <span className="font-label text-label-sm text-on-surface uppercase">
                  INTEGRASI N8N CLOUD
                </span>
                <span className="font-label text-label-sm uppercase text-on-surface-variant">
                  {n8nConfigured
                    ? 'N8N TERHUBUNG'
                    : activeEngine === 'gemini'
                      ? 'AI BAWAAN AKTIF'
                      : 'BELUM DISETEL'}
                </span>
              </div>

              {configError && (
                <p className="font-body text-label-md text-accent">{configError}</p>
              )}

              <a
                href="/kalara-distro-n8n-cloud-workflow.json"
                download="kalara-distro-n8n-cloud-workflow.json"
                className="w-full bg-accent text-on-accent border border-outline px-md py-sm font-label text-label-sm uppercase inline-flex items-center justify-center gap-xs hover:bg-primary hover:text-on-primary transition-colors duration-snap"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>DOWNLOAD TEMPLATE N8N CLOUD (.JSON)</span>
              </a>

              <ol className="list-decimal pl-md font-body text-label-md text-on-surface-variant flex flex-col gap-xs">
                <li>
                  Login ke <strong>app.n8n.cloud</strong>, buat workflow baru, klik ikon menu (⋮) → <strong>Import from File</strong> lalu pilih file JSON di atas.
                </li>
                <li>
                  Buka node <strong>Google Gemini Chat Model</strong> dan hubungkan API Key kamu (atau ganti dengan OpenAI/Groq).
                </li>
                <li>
                  Klik <strong>Save</strong> lalu aktifkan toggle <strong>Active</strong> di pojok kanan atas.
                </li>
                <li>
                  Buka node <strong>Webhook KALARA Chat</strong> → tab <strong>Production URL</strong> → salin URL <code>https://&lt;workspace&gt;.app.n8n.cloud/webhook/kalara-ai-chat</code>.
                </li>
                <li>
                  Simpan URL tersebut di <strong>Settings &gt; Secrets</strong> (atau Vercel Env Vars) dengan nama <code>N8N_WEBHOOK_URL</code>.
                </li>
              </ol>

              <div className="border border-outline bg-surface p-sm font-label text-label-sm text-on-surface flex flex-col gap-xs">
                <span>N8N_WEBHOOK_URL=https://workspace.app.n8n.cloud/webhook/kalara-ai-chat</span>
                <span className="text-on-surface-variant">
                  N8N_AUTH_HEADER_NAME (opsional jika pakai Header Auth)
                </span>
                <span className="text-on-surface-variant">
                  N8N_AUTH_HEADER_VALUE (opsional, token Header Auth)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  PAYLOAD POST KE N8N CLOUD
                </span>
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="border border-outline bg-surface text-on-surface px-sm py-xs font-label text-label-sm uppercase inline-flex items-center gap-xs hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                >
                  {copiedPayload ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>TERSALIN</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>SALIN JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="border border-outline-subtle bg-surface p-sm font-label text-[11px] leading-4 text-on-surface overflow-x-auto">
                {SAMPLE_N8N_PAYLOAD}
              </pre>
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-md flex flex-col gap-md bg-surface">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isError = msg.role === 'error';
              const mentionedProducts =
                msg.role === 'assistant' && msg.id !== 'welcome-msg'
                  ? findMentionedProducts(msg.text, categories)
                  : [];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-xs ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-sm font-label text-[11px] text-on-surface-variant uppercase">
                    <span>
                      {isUser ? 'KAMU' : isError ? 'KENDALA KONEKSI' : 'KALARA AI'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[88%] px-md py-sm border border-outline font-body text-label-lg whitespace-pre-wrap break-words ${
                      isUser
                        ? 'bg-primary text-on-primary'
                        : isError
                          ? 'bg-accent/15 text-on-surface border-accent'
                          : 'bg-surface-container text-on-surface'
                    }`}
                  >
                    {msg.text}

                    {isError && msg.retryPrompt && (
                      <div className="mt-sm pt-sm border-t border-outline-subtle">
                        <button
                          type="button"
                          onClick={() => void sendMessage(msg.retryPrompt as string)}
                          className="border border-outline bg-surface text-on-surface px-sm py-xs font-label text-label-sm uppercase hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                        >
                          COBA LAGI
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clickable Product Recommendations when mentioned in AI reply */}
                  {mentionedProducts.length > 0 && (
                    <div className="w-full max-w-[88%] flex flex-col gap-xs mt-xs">
                      {mentionedProducts.map((match) => (
                        <button
                          key={`${match.category.id}-${match.variant?.id ?? 'cat'}`}
                          type="button"
                          onClick={() => onSelectCategory(match.category, match.variant?.id)}
                          className="w-full text-left px-sm py-xs border border-outline bg-surface hover:bg-accent hover:text-on-accent transition-colors duration-snap flex items-center justify-between gap-sm cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="font-headline text-label-md uppercase block truncate">
                              {match.label}
                            </span>
                            <span className="font-label text-[11px] tabular-nums opacity-80">
                              {match.priceLabel}
                            </span>
                          </div>
                          <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Starter Quick Prompts */}
            {showStarterPrompts && (
              <div className="flex flex-col gap-xs pt-xs">
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  PERTANYAAN CEPAT
                </span>
                <div className="flex flex-col gap-xs">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="w-full text-left px-sm py-sm border border-outline bg-surface text-on-surface font-body text-label-md hover:bg-surface-container hover:border-accent transition-colors duration-snap cursor-pointer flex items-center justify-between gap-sm"
                    >
                      <span>{prompt}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-on-surface-variant" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isSending && (
              <div className="flex flex-col items-start gap-xs">
                <span className="font-label text-[11px] text-on-surface-variant uppercase">
                  {activeEngine === 'n8n'
                    ? 'KALARA AI · MEMPROSES DI N8N'
                    : 'KALARA AI · MEMPROSES'}
                </span>
                <div className="px-md py-sm border border-outline bg-surface-container font-label text-label-sm text-on-surface uppercase">
                  MENGETIK BALASAN...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-outline p-sm bg-surface flex items-center gap-xs"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              maxLength={2000}
              placeholder="Tulis pertanyaan tentang produk..."
              aria-label="Tulis pesan untuk KALARA AI"
              className="flex-1 min-w-0 border border-outline bg-surface px-sm py-sm font-body text-label-lg text-on-surface placeholder:text-on-surface-variant/80 rounded-none focus:outline-2 focus:outline-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Kirim pesan"
              className="bg-primary text-on-primary border border-outline px-md py-sm rounded-none font-label text-label-md uppercase inline-flex items-center gap-xs hover:bg-accent hover:text-on-accent transition-colors duration-snap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">KIRIM</span>
            </button>
          </form>
        </section>
      )}
    </>
  );
}
