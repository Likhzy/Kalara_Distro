import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { N8nChatRequestBody } from './n8nProxy.ts';

interface HistoryTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

const MAX_SESSIONS = 200;
const MAX_TURNS_PER_SESSION = 20;
const sessionHistory = new Map<string, HistoryTurn[]>();

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

export function isGeminiConfigured(): boolean {
  const key = cleanEnvValue(process.env.GEMINI_API_KEY);
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

function buildSystemInstruction(payload: N8nChatRequestBody): string {
  const cartCount = payload.context?.cartItemCount ?? 0;
  const cartItems =
    payload.context?.cartSummary && payload.context.cartSummary.length > 0
      ? payload.context.cartSummary.join(', ')
      : 'Masih kosong';

  return `Kamu adalah KALARA AI, asisten belanja & stylist resmi KALARA DISTRO ("Karya Lokal, Rasa Anak Muda") dari Bandung.

Gaya bahasa: santai, ramah, informatif, khas anak muda Indonesia (Bahasa Indonesia natural, ringkas, langsung membantu).

INFORMASI TOKO:
- Nama: KALARA DISTRO
- Alamat Offline Store: Jl. Trunojoyo No. 28, Citarum, Kec. Bandung Wetan, Kota Bandung, Jawa Barat 40115
- Jam Buka: Senin – Minggu, 10.00 – 21.00 WIB
- Kanal Resmi: Shopee, Tokopedia, WhatsApp Order (+62 812-3456-7890), Instagram (@kalaradistro), TikTok (@kalaradistro.id)
- Pembayaran website: QRIS, Transfer Bank, dan COD Bandung (atau Ambil di Toko).

KATALOG DROP 01 (READY STOCK):
1. Kaos Grafis & Oversized (S / M / L / XL | Rp75.000 – Rp120.000):
   - Kalara Archive Boxy Tee — Rp95.000 (Off-White / Rust Ink, Cotton Combed 20s Heavyweight 210 gsm, Boxy Oversized Fit)
   - Bandung Youth Graphic Tee — Rp115.000 (Charcoal Washed, Cotton Combed 24s Bio-Wash, Relaxed Drop-Shoulder)
   - Kalara Pocket Basic Tee — Rp75.000 (Warm Chalk, Cotton Combed 24s Adem, Regular Relaxed Fit)

2. Hoodie Fleece (M / L / XL / XXL | Rp150.000 – Rp220.000):
   - Kalara Heavyweight Pullover — Rp185.000 (Jet Black / Contrast Stitch, Cotton Fleece 330 gsm, Boxy Streetwear Cut)
   - Trunojoyo Zip Hoodie — Rp215.000 (Ash Grey, Cotton Fleece 330 gsm + YKK Zipper, Oversized Fit)
   - Daily Campus Hoodie — Rp155.000 (Sand Stone, Cotton Fleece 280 gsm, Relaxed Fit)

3. Crewneck Basic (S / M / L / XL | Rp130.000 – Rp180.000):
   - Kalara Ribbed Crewneck — Rp150.000 (Oatmeal Melange, French Terry 300 gsm, Relaxed Drop-Shoulder)
   - Archive Stamp Sweatshirt — Rp175.000 (Deep Charcoal, Cotton Fleece 310 gsm, Boxy Fit)
   - Studio Plain Crewneck — Rp135.000 (Forest Olive, French Terry 280 gsm, Regular Unisex)

4. Kemeja Casual (S / M / L / XL | Rp100.000 – Rp160.000):
   - Citarum Utility Workshirt — Rp135.000 (Khaki Tan, Cotton Twill Ripstop Ringan, Boxy Short Sleeve)
   - Kalara Cuban Camp Shirt — Rp120.000 (Jet Black, Rayon Cotton Slub, Relaxed Open Collar)
   - Campus Overshirt — Rp155.000 (Slate Blue, Cotton Oxford Heavy, Loose Layering Fit)

5. Celana Pendek & Panjang (28 / 30 / 32 / 34 | Rp120.000 – Rp200.000):
   - Kalara Wide Cargo Pants — Rp185.000 (Matte Black, Cotton Canvas 10oz, Wide Baggy Cut)
   - Skate Relaxed Ankle Pants — Rp165.000 (Warm Beige, Stretch Cotton Twill, Loose Tapered)
   - Utility Walkshorts — Rp125.000 (Olive Drab, Nylon Crinkle Water-Repellent, Above-Knee Relaxed)

6. Topi & Aksesori (ALL SIZE | Rp45.000 – Rp75.000):
   - Kalara 6-Panel Dad Cap — Rp65.000 (Black / Burnt Orange Embroidery, Cotton Drill + Metal Buckle)
   - Short Fisherman Beanie — Rp55.000 (Charcoal, Acrylic Cotton Knit)
   - Archive Crew Socks + Sticker Pack — Rp45.000 (Chalk / Black Stripe, Combed Cotton Terry, EU 38–44)

KERANJANG USER SAAT INI:
- Jumlah item: ${cartCount}
- Isi keranjang: ${cartItems}

ATURAN:
- Sebutkan nama artikel persis seperti di katalog saat merekomendasikan produk agar tombol produk otomatis muncul di website.
- Jawab singkat dan terstruktur (maksimal 3–5 poin atau 2 paragraf pendek).
- Jangan mengarang produk atau harga di luar daftar katalog di atas.`;
}

function getSessionTurns(sessionId: string): HistoryTurn[] {
  const existing = sessionHistory.get(sessionId);
  if (existing) {
    // Refresh insertion order for simple LRU eviction
    sessionHistory.delete(sessionId);
    sessionHistory.set(sessionId, existing);
    return existing;
  }

  if (sessionHistory.size >= MAX_SESSIONS) {
    const oldestKey = sessionHistory.keys().next().value;
    if (oldestKey) sessionHistory.delete(oldestKey);
  }

  const created: HistoryTurn[] = [];
  sessionHistory.set(sessionId, created);
  return created;
}

export async function askKalaraGemini(
  payload: N8nChatRequestBody
): Promise<{ reply?: string; status: number; error?: string }> {
  const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      status: 503,
      error:
        'Chatbot belum terhubung. Tambahkan N8N_WEBHOOK_URL (n8n Cloud) atau GEMINI_API_KEY di Settings > Secrets.',
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const history = getSessionTurns(payload.sessionId);
    const contents: HistoryTurn[] = [
      ...history,
      { role: 'user', parts: [{ text: payload.message }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction: buildSystemInstruction(payload),
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      return {
        status: 502,
        error: 'AI tidak mengembalikan teks balasan. Silakan coba kirim ulang pertanyaanmu.',
      };
    }

    history.push(
      { role: 'user', parts: [{ text: payload.message }] },
      { role: 'model', parts: [{ text: reply }] }
    );
    if (history.length > MAX_TURNS_PER_SESSION) {
      history.splice(0, history.length - MAX_TURNS_PER_SESSION);
    }

    return { status: 200, reply };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('API_KEY_INVALID') || message.includes('403') || message.includes('PERMISSION_DENIED')) {
      return {
        status: 502,
        error:
          'API Key AI tidak valid atau belum aktif. Periksa pengaturan di Settings > Secrets atau hubungkan N8N_WEBHOOK_URL.',
      };
    }
    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      return {
        status: 429,
        error: 'Batas permintaan AI sedang penuh. Tunggu beberapa detik lalu coba lagi.',
      };
    }
    return {
      status: 502,
      error: 'Gagal menghubungi layanan AI saat ini. Silakan coba beberapa saat lagi.',
    };
  }
}
