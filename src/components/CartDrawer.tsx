import { useEffect, useState } from 'react';
import { Check, Copy, Minus, Plus, Trash2, X } from 'lucide-react';
import type { CartItem, OrderReceipt } from '../types';
import { CATALOG_CATEGORIES, STORE_INFO, formatIDR } from '../data/catalog';
import { LookbookImage } from './LookbookImage';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (key: string, delta: number) => void;
  onUpdateSize: (key: string, newSize: string) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onUpdateSize,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'receipt'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'Transfer Bank' | 'COD Bandung'>(
    'QRIS'
  );
  const [formError, setFormError] = useState('');
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && items.length === 0 && step === 'checkout') {
      setStep('cart');
    }
  }, [isOpen, items.length, step]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim() || !whatsapp.trim()) {
      setFormError('Mohon isi nama lengkap dan nomor WhatsApp aktif.');
      return;
    }
    if (deliveryMethod === 'delivery' && !address.trim()) {
      setFormError('Mohon isi alamat pengiriman lengkap atau pilih Ambil di Toko Bandung.');
      return;
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newReceipt: OrderReceipt = {
      orderId: `KLR-${randomCode}`,
      customerName: customerName.trim(),
      whatsapp: whatsapp.trim(),
      deliveryMethod,
      address:
        deliveryMethod === 'pickup' ? STORE_INFO.address : address.trim(),
      paymentMethod,
      items: [...items],
      total: subtotal,
      createdAt: new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };

    setReceipt(newReceipt);
    setStep('receipt');
    onClearCart();
  };

  const buildWhatsAppMessage = (order: OrderReceipt) => {
    const lines = [
      `Halo KALARA DISTRO! Saya ingin konfirmasi pesanan *#${order.orderId}*:`,
      '',
      ...order.items.map(
        (item) =>
          `- ${item.variantName} (${item.size}) x${item.quantity} = ${formatIDR(
            item.price * item.quantity
          )}`
      ),
      '',
      `Total: ${formatIDR(order.total)}`,
      `Nama: ${order.customerName}`,
      `WhatsApp: ${order.whatsapp}`,
      `Metode: ${
        order.deliveryMethod === 'pickup' ? 'Ambil di Toko Trunojoyo' : 'Kirim Kurir'
      }`,
      `Alamat: ${order.address}`,
      `Pembayaran: ${order.paymentMethod}`,
    ];
    return lines.join('\n');
  };

  const handleCopyReceipt = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage(receipt));
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2000);
    } catch {
      setCopiedReceipt(false);
    }
  };

  const resetAndClose = () => {
    setStep('cart');
    setFormError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-primary/70"
      role="dialog"
      aria-modal="true"
      aria-label="Keranjang Belanja KALARA DISTRO"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-md bg-surface border-l border-outline h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-lg py-md border-b border-outline bg-surface">
          <div className="flex flex-col">
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              {step === 'cart' && 'BAG // BELANJA'}
              {step === 'checkout' && 'CHECKOUT // PENGIRIMAN'}
              {step === 'receipt' && 'KONFIRMASI // PESANAN'}
            </span>
            <h2 className="font-headline text-title-md text-on-surface uppercase tabular-nums">
              {step === 'cart' && `KERANJANG (${totalCount})`}
              {step === 'checkout' && 'DATA PEMESAN'}
              {step === 'receipt' && `ORDER #${receipt?.orderId}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Tutup keranjang"
            className="border border-outline bg-surface text-on-surface p-sm hover:bg-primary hover:text-on-primary transition-colors duration-snap cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'cart' && (
            <>
              {items.length === 0 ? (
                <div className="p-xl flex flex-col items-start gap-md">
                  <span className="font-label text-label-sm text-on-surface-variant uppercase">
                    STATUS // KOSONG
                  </span>
                  <p className="font-body text-body-md text-on-surface-variant">
                    Keranjang kamu masih kosong. Pilih artikel favorit dari Koleksi Utama Drop 01 untuk mulai berbelanja.
                  </p>
                  <a
                    href="#koleksi"
                    onClick={resetAndClose}
                    className="bg-primary text-on-primary border border-outline px-lg py-sm font-label text-label-md uppercase hover:bg-accent hover:text-on-accent transition-colors duration-snap"
                  >
                    LIHAT KOLEKSI
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-outline">
                  {items.map((item) => {
                    const cat = CATALOG_CATEGORIES.find((c) => c.id === item.categoryId);
                    const availableSizes = cat?.sizes ?? [item.size];

                    return (
                      <div key={item.key} className="p-lg flex gap-md bg-surface">
                        <div className="w-20 h-20 border border-outline bg-surface-container shrink-0 overflow-hidden">
                          <LookbookImage
                            src={item.imageUrl}
                            alt={item.variantName}
                            fallbackLabel={item.categoryTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between gap-sm min-w-0">
                          <div className="flex items-start justify-between gap-sm">
                            <div className="min-w-0">
                              <span className="font-label text-label-sm text-on-surface-variant uppercase block truncate">
                                {item.categoryTitle}
                              </span>
                              <h3 className="font-headline text-label-lg text-on-surface uppercase truncate">
                                {item.variantName}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.key)}
                              aria-label={`Hapus ${item.variantName}`}
                              className="text-on-surface-variant hover:text-accent transition-colors p-xs cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-sm flex-wrap">
                            <div className="flex items-center gap-xs">
                              <label
                                htmlFor={`size-${item.key}`}
                                className="font-label text-label-sm text-on-surface-variant uppercase"
                              >
                                UKURAN:
                              </label>
                              <select
                                id={`size-${item.key}`}
                                value={item.size}
                                onChange={(e) => onUpdateSize(item.key, e.target.value)}
                                className="border border-outline bg-surface text-on-surface font-label text-label-sm px-xs py-xs rounded-none cursor-pointer"
                              >
                                {availableSizes.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-sm">
                              <div className="flex items-center border border-outline bg-surface">
                                <button
                                  type="button"
                                  aria-label="Kurangi jumlah"
                                  onClick={() => onUpdateQuantity(item.key, -1)}
                                  className="p-xs hover:bg-surface-container cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-sm font-label text-label-sm tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Tambah jumlah"
                                  onClick={() => onUpdateQuantity(item.key, 1)}
                                  className="p-xs hover:bg-surface-container cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <span className="font-label text-label-md text-on-surface tabular-nums">
                                {formatIDR(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="p-lg flex flex-col gap-md">
              {formError && (
                <div
                  role="alert"
                  className="p-sm border border-outline bg-accent/15 font-body text-label-md text-on-surface"
                >
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-xs">
                <label htmlFor="checkout-name" className="font-label text-label-sm uppercase">
                  NAMA LENGKAP
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Rizky Pratama"
                  className="w-full border border-outline bg-surface px-md py-sm font-body text-body-md text-on-surface rounded-none focus:outline-2 focus:outline-accent"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label htmlFor="checkout-wa" className="font-label text-label-sm uppercase">
                  NOMOR WHATSAPP
                </label>
                <input
                  id="checkout-wa"
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full border border-outline bg-surface px-md py-sm font-body text-body-md text-on-surface rounded-none focus:outline-2 focus:outline-accent"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <span className="font-label text-label-sm uppercase">METODE PENGAMBILAN</span>
                <div className="grid grid-cols-2 gap-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`py-sm px-sm border border-outline font-label text-label-sm uppercase cursor-pointer transition-colors ${
                      deliveryMethod === 'delivery'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    KIRIM KURIR
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`py-sm px-sm border border-outline font-label text-label-sm uppercase cursor-pointer transition-colors ${
                      deliveryMethod === 'pickup'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    AMBIL DI TOKO
                  </button>
                </div>
              </div>

              {deliveryMethod === 'delivery' ? (
                <div className="flex flex-col gap-xs">
                  <label htmlFor="checkout-address" className="font-label text-label-sm uppercase">
                    ALAMAT PENGIRIMAN LENGKAP
                  </label>
                  <textarea
                    id="checkout-address"
                    rows={3}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jalan, nomor rumah/kost, kecamatan, kota, kode pos"
                    className="w-full border border-outline bg-surface px-md py-sm font-body text-body-md text-on-surface rounded-none focus:outline-2 focus:outline-accent"
                  />
                </div>
              ) : (
                <div className="p-md border border-outline bg-surface-container">
                  <span className="font-label text-label-sm text-on-surface-variant uppercase block">
                    LOKASI PENGAMBILAN
                  </span>
                  <p className="font-body text-label-lg text-on-surface mt-xs">
                    {STORE_INFO.address}
                  </p>
                  <span className="font-label text-label-sm text-on-surface-variant block mt-xs">
                    {STORE_INFO.hours}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-xs">
                <span className="font-label text-label-sm uppercase">PEMBAYARAN</span>
                <div className="grid grid-cols-3 gap-xs">
                  {(['QRIS', 'Transfer Bank', 'COD Bandung'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-sm px-xs border border-outline font-label text-label-sm uppercase cursor-pointer transition-colors ${
                        paymentMethod === method
                          ? 'bg-accent text-on-accent'
                          : 'bg-surface text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-outline pt-md flex flex-col gap-xs">
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  RINGKASAN ITEM ({totalCount})
                </span>
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between font-body text-label-md text-on-surface"
                  >
                    <span className="truncate pr-sm">
                      {item.variantName} ({item.size}) × {item.quantity}
                    </span>
                    <span className="font-label tabular-nums shrink-0">
                      {formatIDR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </form>
          )}

          {step === 'receipt' && receipt && (
            <div className="p-lg flex flex-col gap-md">
              <div className="p-md border border-outline bg-surface-container flex flex-col gap-xs">
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  PESANAN TERCATAT // {receipt.createdAt}
                </span>
                <h3 className="font-headline text-title-md text-on-surface uppercase">
                  ORDER #{receipt.orderId} BERHASIL DIBUAT
                </h3>
                <p className="font-body text-label-lg text-on-surface-variant">
                  Tim KALARA DISTRO akan memverifikasi stok &amp; mengirimkan detail pembayaran {receipt.paymentMethod} ke WhatsApp kamu.
                </p>
              </div>

              <div className="border border-outline p-md flex flex-col gap-sm bg-surface">
                <div className="flex justify-between font-label text-label-sm text-on-surface-variant uppercase">
                  <span>PEMESAN</span>
                  <span className="text-on-surface">{receipt.customerName}</span>
                </div>
                <div className="flex justify-between font-label text-label-sm text-on-surface-variant uppercase">
                  <span>WHATSAPP</span>
                  <span className="text-on-surface tabular-nums">{receipt.whatsapp}</span>
                </div>
                <div className="flex justify-between font-label text-label-sm text-on-surface-variant uppercase">
                  <span>PEMBAYARAN</span>
                  <span className="text-on-surface">{receipt.paymentMethod}</span>
                </div>
                <div className="border-t border-outline-subtle pt-sm flex flex-col gap-xs">
                  {receipt.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex justify-between font-body text-label-md text-on-surface"
                    >
                      <span>
                        {item.variantName} ({item.size}) × {item.quantity}
                      </span>
                      <span className="font-label tabular-nums">
                        {formatIDR(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-outline pt-sm flex justify-between font-label text-label-lg text-on-surface uppercase">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{formatIDR(receipt.total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-sm">
                <a
                  href={`https://wa.me/${STORE_INFO.whatsappNumber}?text=${encodeURIComponent(
                    buildWhatsAppMessage(receipt)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-accent text-on-accent border border-outline px-lg py-md font-label text-label-md uppercase text-center hover:bg-primary hover:text-on-primary transition-colors duration-snap"
                >
                  KIRIM KONFIRMASI VIA WHATSAPP
                </a>
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="w-full bg-surface text-on-surface border border-outline px-lg py-sm font-label text-label-md uppercase inline-flex items-center justify-center gap-sm hover:bg-surface-container transition-colors cursor-pointer"
                >
                  {copiedReceipt ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>FORMAT PESANAN TERSALIN</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>SALIN RINGKASAN ORDER</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {step === 'cart' && items.length > 0 && (
          <div className="border-t border-outline p-lg bg-surface flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <span className="font-label text-label-md text-on-surface-variant uppercase">
                SUBTOTAL ESTIMASI
              </span>
              <span className="font-headline text-title-md text-on-surface tabular-nums">
                {formatIDR(subtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep('checkout')}
              className="w-full bg-primary text-on-primary border border-outline px-lg py-md font-label text-label-lg uppercase tracking-wider hover:bg-accent hover:text-on-accent transition-colors duration-snap cursor-pointer"
            >
              LANJUT CHECKOUT
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="border-t border-outline p-lg bg-surface flex items-center gap-sm">
            <button
              type="button"
              onClick={() => setStep('cart')}
              className="bg-surface text-on-surface border border-outline px-md py-md font-label text-label-md uppercase hover:bg-surface-container transition-colors cursor-pointer"
            >
              KEMBALI
            </button>
            <button
              type="submit"
              form="checkout-form"
              className="flex-1 bg-accent text-on-accent border border-outline px-lg py-md font-label text-label-lg uppercase tracking-wider hover:bg-primary hover:text-on-primary transition-colors duration-snap cursor-pointer tabular-nums"
            >
              BUAT PESANAN · {formatIDR(subtotal)}
            </button>
          </div>
        )}

        {step === 'receipt' && (
          <div className="border-t border-outline p-lg bg-surface">
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full bg-primary text-on-primary border border-outline px-lg py-md font-label text-label-md uppercase hover:bg-accent hover:text-on-accent transition-colors cursor-pointer"
            >
              KEMBALI KE LOOKBOOK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
