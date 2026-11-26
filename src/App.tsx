import { useEffect, useMemo, useState } from 'react';
import {
  BRAND_VALUES,
  CATALOG_CATEGORIES,
  HERO_IMAGE,
  STORE_IMAGE,
  STORE_INFO,
} from './data/catalog';
import type { CartItem, ChannelType, ProductCategory, ProductVariant } from './types';
import { LookbookImage } from './components/LookbookImage';
import { Header } from './components/Header';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { ChannelModal } from './components/ChannelModal';
import { CustomerChatWidget } from './components/CustomerChatWidget';

const CART_STORAGE_KEY = 'kalara_distro_cart_v1';

function loadInitialCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [cart, setCart] = useState<CartItem[]>(loadInitialCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState<ChannelType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) return CATALOG_CATEGORIES;
    return CATALOG_CATEGORIES.filter((category) => {
      const categoryMatch =
        category.title.toLowerCase().includes(normalizedSearch) ||
        category.code.toLowerCase().includes(normalizedSearch) ||
        category.description.toLowerCase().includes(normalizedSearch) ||
        category.sizes.some((size) => size.toLowerCase() === normalizedSearch);

      if (categoryMatch) return true;

      return category.variants.some(
        (variant) =>
          variant.name.toLowerCase().includes(normalizedSearch) ||
          variant.colorway.toLowerCase().includes(normalizedSearch) ||
          variant.material.toLowerCase().includes(normalizedSearch) ||
          variant.fit.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [normalizedSearch]);

  const handleOpenCategory = (category: ProductCategory, variantId?: string) => {
    setSelectedCategory(category);
    setSelectedVariantId(variantId ?? null);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage write errors in restricted environments
    }
  }, [cart]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (
    category: ProductCategory,
    variant: ProductVariant,
    size: string,
    quantity = 1
  ) => {
    const key = `${variant.id}__${size}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          key,
          categoryId: category.id,
          categoryTitle: category.title,
          variantId: variant.id,
          variantName: variant.name,
          size,
          price: variant.price,
          quantity,
          imageUrl: category.imageUrl,
        },
      ];
    });
    setToastMessage(`${variant.name} (${size}) ditambahkan`);
  };

  const handleQuickAddCategory = (category: ProductCategory) => {
    const defaultVariant = category.variants[0];
    if (!defaultVariant) return;
    const defaultSize = category.sizes.includes('L')
      ? 'L'
      : category.sizes[0] ?? 'ALL SIZE';
    handleAddToCart(category, defaultVariant, defaultSize, 1);
  };

  const handleUpdateQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleUpdateSize = (key: string, newSize: string) => {
    setCart((prev) => {
      const target = prev.find((item) => item.key === key);
      if (!target) return prev;
      const newKey = `${target.variantId}__${newSize}`;
      if (newKey === key) return prev;

      const duplicate = prev.find((item) => item.key === newKey);
      if (duplicate) {
        return prev
          .filter((item) => item.key !== key)
          .map((item) =>
            item.key === newKey
              ? { ...item, quantity: item.quantity + target.quantity }
              : item
          );
      }

      return prev.map((item) =>
        item.key === key ? { ...item, key: newKey, size: newSize } : item
      );
    });
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto border-x border-outline bg-surface">
      {/* 1. Minimal Top Bar */}
      <Header
        cartCount={totalCartCount}
        searchQuery={searchQuery}
        categories={CATALOG_CATEGORIES}
        onSearchChange={setSearchQuery}
        onSelectCategory={handleOpenCategory}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1 flex flex-col">
        {/* 2. Asymmetric Split Hero Section (60% / 40%) */}
        <section className="grid grid-cols-1 lg:grid-cols-5 border-b border-outline">
          {/* Left Column (60% = 3 of 5 cols) */}
          <div className="lg:col-span-3 p-lg lg:p-3xl flex flex-col justify-between gap-2xl bg-surface">
            <div className="flex flex-col gap-lg">
              <div className="flex items-center gap-sm">
                <span
                  aria-label="New drop available"
                  className="inline-block w-2.5 h-2.5 bg-accent border border-outline rounded-none shrink-0"
                />
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  ARCHIVE // VOL. 01 — INDONESIA
                </span>
              </div>

              <h1 className="font-display text-display-xl-mobile lg:text-display-xl text-on-surface uppercase text-balance">
                WEAR YOUR STYLE, SHOW YOUR IDENTITY.
              </h1>

              <p className="font-body text-body-lg text-on-surface-variant max-w-prose text-pretty">
                Karya Lokal, Rasa Anak Muda — Streetwear harian dengan desain modern, bahan nyaman, dan harga ramah kantong untuk pelajar &amp; mahasiswa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-md pt-md">
              <a
                href="#koleksi"
                className="bg-primary text-on-primary border border-outline px-lg py-md rounded-none font-label text-label-lg uppercase tracking-wider transition-colors duration-snap ease-snap hover:bg-accent hover:text-on-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent inline-flex items-center gap-sm whitespace-nowrap shrink-0"
              >
                <span>LIHAT KOLEKSI</span>
                <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                  arrow_downward
                </span>
              </a>

              <a
                href="#marketplace"
                className="bg-surface text-on-surface border border-outline px-lg py-md rounded-none font-label text-label-lg uppercase tracking-wider transition-colors duration-snap ease-snap hover:bg-primary hover:text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent inline-flex items-center gap-sm whitespace-nowrap shrink-0"
              >
                <span>BELANJA VIA MARKETPLACE</span>
              </a>
            </div>
          </div>

          {/* Right Column (40% = 2 of 5 cols) */}
          <div className="lg:col-span-2 relative border-t lg:border-t-0 lg:border-l border-outline bg-surface-container flex flex-col">
            <div className="relative flex-1 min-h-96 overflow-hidden">
              <LookbookImage
                src={HERO_IMAGE.url}
                alt={HERO_IMAGE.alt}
                fallbackLabel="DROP 01 // LOOKBOOK"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-md left-md">
                <span className="inline-flex items-center bg-accent text-on-accent border border-outline px-sm py-xs rounded-none font-label text-label-sm uppercase tracking-wider">
                  DROP 01 // LOKAL STREETWEAR
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Brand Value Ticker / Strip */}
        <section
          aria-label="Keunggulan KALARA DISTRO"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-outline bg-surface"
        >
          {BRAND_VALUES.map((value, idx) => {
            const borderClasses =
              idx === 0
                ? 'border-b sm:border-b-0 sm:border-r border-outline'
                : idx === 1
                  ? 'border-b lg:border-b-0 lg:border-r border-outline'
                  : idx === 2
                    ? 'border-b sm:border-b-0 sm:border-r border-outline'
                    : '';

            return (
              <div
                key={value}
                className={`px-lg py-md flex items-center justify-between ${borderClasses}`}
              >
                <span className="font-label text-label-md text-on-surface uppercase">
                  {value}
                </span>
              </div>
            );
          })}
        </section>

        {/* 4. Product Catalog Grid ("KOLEKSI UTAMA") */}
        <section id="koleksi" className="flex flex-col bg-surface">
          {/* Section Header */}
          <div className="px-lg py-xl border-b border-outline flex flex-col sm:flex-row sm:items-end justify-between gap-md">
            <div>
              <span className="font-label text-label-sm text-on-surface-variant uppercase block mb-xs">
                KATALOG // DROP 01
              </span>
              <h2 className="font-headline text-headline-lg-mobile lg:text-headline-lg text-on-surface uppercase">
                KOLEKSI UTAMA
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-md">
              <span className="font-label text-label-md text-on-surface-variant uppercase tabular-nums">
                {normalizedSearch
                  ? `${String(filteredCategories.length).padStart(2, '0')} DARI 06 KATEGORI // "${searchQuery.trim().toUpperCase()}"`
                  : '06 KATEGORI // READY STOCK S–XXL'}
              </span>
              {normalizedSearch && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="border border-outline bg-surface text-on-surface px-sm py-xs font-label text-label-sm uppercase hover:bg-primary hover:text-on-primary transition-colors duration-snap cursor-pointer whitespace-nowrap shrink-0"
                >
                  RESET FILTER
                </button>
              )}
            </div>
          </div>

          {/* 3-Column Architectural Grid (No Gaps, Crisp 1px Borders) */}
          {filteredCategories.length === 0 ? (
            <div className="p-2xl border-b border-outline bg-surface flex flex-col items-start gap-md">
              <span className="font-label text-label-sm text-on-surface-variant uppercase">
                PENCARIAN // 0 HASIL
              </span>
              <h3 className="font-headline text-headline-md text-on-surface uppercase">
                ARTIKEL TIDAK DITEMUKAN
              </h3>
              <p className="font-body text-body-md text-on-surface-variant max-w-prose">
                Tidak ada kategori atau produk yang cocok dengan kata kunci &ldquo;{searchQuery.trim()}&rdquo;. Coba cari &ldquo;kaos&rdquo;, &ldquo;hoodie&rdquo;, &ldquo;cargo&rdquo;, &ldquo;fleece&rdquo;, atau &ldquo;topi&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="bg-primary text-on-primary border border-outline px-lg py-sm font-label text-label-md uppercase hover:bg-accent hover:text-on-accent transition-colors duration-snap cursor-pointer"
              >
                TAMPILKAN SEMUA KOLEKSI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-outline gap-px border-b border-outline">
              {filteredCategories.map((category) => {
                const matchedVariant = normalizedSearch
                  ? category.variants.find(
                      (v) =>
                        v.name.toLowerCase().includes(normalizedSearch) ||
                        v.colorway.toLowerCase().includes(normalizedSearch) ||
                        v.material.toLowerCase().includes(normalizedSearch) ||
                        v.fit.toLowerCase().includes(normalizedSearch)
                    )
                  : undefined;

                return (
                  <article
                    key={category.id}
                    className="bg-surface rounded-none flex flex-col justify-between transition-colors duration-snap ease-snap hover:bg-surface-container group"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenCategory(category, matchedVariant?.id)}
                      aria-label={`Lihat detail ${category.title}`}
                      className="bg-surface-container border-b border-outline aspect-[4/3] w-full overflow-hidden block cursor-pointer text-left"
                    >
                      <LookbookImage
                        src={category.imageUrl}
                        alt={category.imageAlt}
                        fallbackLabel={category.title}
                        className="w-full h-full object-cover object-center transition-transform duration-reveal ease-reveal group-hover:scale-105"
                      />
                    </button>

                    <div className="p-lg flex flex-col gap-sm">
                      <div className="flex items-center justify-between gap-sm">
                        <span className="font-label text-label-sm text-on-surface-variant uppercase">
                          {category.code}
                        </span>
                        <span className="font-label text-label-sm text-on-surface-variant uppercase">
                          {category.sizeLabel}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenCategory(category, matchedVariant?.id)}
                        className="text-left cursor-pointer"
                      >
                        <h3 className="font-headline text-title-md text-on-surface uppercase group-hover:text-accent transition-colors duration-snap">
                          {category.title}
                        </h3>
                      </button>

                      {matchedVariant && (
                        <span className="font-label text-label-sm text-accent uppercase">
                          COCOK: {matchedVariant.name}
                        </span>
                      )}

                      <div className="flex items-center justify-between pt-sm border-t border-outline-subtle gap-sm">
                        <p className="font-label text-label-lg text-on-surface tabular-nums">
                          {category.priceRange}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleQuickAddCategory(category)}
                          className="font-label text-label-sm text-on-surface uppercase border border-outline px-sm py-xs bg-surface hover:bg-accent hover:text-on-accent transition-colors duration-snap ease-snap cursor-pointer whitespace-nowrap shrink-0"
                        >
                          + KERANJANG
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. Brand Story & Offline/Online Presence Split Section */}
        <section
          id="tentang"
          className="grid grid-cols-1 lg:grid-cols-2 border-b border-outline bg-surface"
        >
          {/* Left Side: Store Interior Photo */}
          <div className="relative border-b lg:border-b-0 lg:border-r border-outline bg-surface-container min-h-96 overflow-hidden">
            <LookbookImage
              src={STORE_IMAGE.url}
              alt={STORE_IMAGE.alt}
              fallbackLabel="OFFLINE STORE // BANDUNG"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute top-md left-md">
              <button
                type="button"
                onClick={() => setActiveChannel('location')}
                className="inline-flex items-center bg-surface text-on-surface border border-outline px-sm py-xs font-label text-label-sm uppercase hover:bg-accent hover:text-on-accent transition-colors duration-snap cursor-pointer"
              >
                OFFLINE STORE // BANDUNG
              </button>
            </div>
          </div>

          {/* Right Side: Story Block & Quick Order Channels */}
          <div
            id="marketplace"
            className="p-lg lg:p-3xl flex flex-col justify-between gap-xl"
          >
            <div className="flex flex-col gap-md">
              <span className="font-label text-label-sm text-on-surface-variant uppercase">
                TENTANG KALARA DISTRO
              </span>
              <h2 className="font-headline text-headline-lg-mobile lg:text-headline-lg text-on-surface uppercase text-balance">
                KARYA LOKAL, RASA ANAK MUDA
              </h2>
              <p className="font-body text-body-md text-on-surface-variant max-w-prose text-pretty">
                Lahir dari skena kreatif anak muda Indonesia, KALARA DISTRO hadir dengan satu misi sederhana: menghadirkan streetwear lokal berkarakter dengan material katun combed dan fleece pilihan tanpa harus menguras kantong pelajar maupun mahasiswa.
              </p>
              <p className="font-body text-body-md text-on-surface-variant max-w-prose text-pretty">
                Setiap rilisan diproduksi dalam jumlah terbatas bersama konveksi lokal terkurasi. Kunjungi flagship store kami untuk mencoba langsung potongan oversized dan boxy fit, atau pesan cepat lewat kanal online resmi kami.
              </p>
            </div>

            <div className="border-t border-outline pt-lg flex flex-col gap-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  JAM BUKA TOKO OFFLINE
                </span>
                <span className="font-label text-label-md text-on-surface uppercase tabular-nums">
                  {STORE_INFO.hours}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-md">
                <button
                  type="button"
                  onClick={() => setActiveChannel('shopee')}
                  className="bg-surface text-on-surface border border-outline px-md py-sm rounded-none inline-flex items-center gap-sm font-label text-label-md uppercase transition-colors duration-snap ease-snap hover:bg-primary hover:text-on-primary cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>SHOPEE</span>
                  <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                    arrow_outward
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChannel('tokopedia')}
                  className="bg-surface text-on-surface border border-outline px-md py-sm rounded-none inline-flex items-center gap-sm font-label text-label-md uppercase transition-colors duration-snap ease-snap hover:bg-primary hover:text-on-primary cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>TOKOPEDIA</span>
                  <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                    arrow_outward
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChannel('whatsapp')}
                  className="bg-accent text-on-accent border border-outline px-md py-sm rounded-none inline-flex items-center gap-sm font-label text-label-md uppercase transition-colors duration-snap ease-snap hover:bg-primary hover:text-on-primary cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>WHATSAPP ORDER</span>
                  <span className="material-symbols-outlined text-title-md" aria-hidden="true">
                    arrow_outward
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Minimal Brutalist Footer */}
      <footer id="lokasi" className="bg-surface flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-outline">
          <div className="p-lg border-b md:border-b-0 md:border-r border-outline flex flex-col gap-xs">
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              ALAMAT OFFLINE STORE
            </span>
            <button
              type="button"
              onClick={() => setActiveChannel('location')}
              className="font-body text-body-md text-on-surface text-left hover:text-accent transition-colors duration-snap cursor-pointer"
            >
              {STORE_INFO.address}
            </button>
          </div>

          <div className="p-lg border-b md:border-b-0 md:border-r border-outline flex flex-col gap-xs">
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              MEDIA SOSIAL
            </span>
            <div className="flex items-center gap-lg pt-xs">
              <button
                type="button"
                onClick={() => setActiveChannel('instagram')}
                className="font-label text-label-md text-on-surface uppercase hover:text-accent transition-colors duration-snap ease-snap inline-flex items-center gap-xs cursor-pointer"
              >
                <span>INSTAGRAM</span>
                <span className="material-symbols-outlined text-label-lg" aria-hidden="true">
                  arrow_outward
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveChannel('tiktok')}
                className="font-label text-label-md text-on-surface uppercase hover:text-accent transition-colors duration-snap ease-snap inline-flex items-center gap-xs cursor-pointer"
              >
                <span>TIKTOK</span>
                <span className="material-symbols-outlined text-label-lg" aria-hidden="true">
                  arrow_outward
                </span>
              </button>
            </div>
          </div>

          <div className="p-lg flex flex-col justify-between gap-xs">
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              HAK CIPTA
            </span>
            <p className="font-label text-label-sm text-on-surface uppercase">
              © 2026 KALARA DISTRO. KARYA LOKAL INDONESIA.
            </p>
          </div>
        </div>

        {/* Oversized Full-Width Wordmark */}
        <div className="px-lg py-xl overflow-hidden flex items-center justify-center bg-surface">
          <span className="font-display font-bold uppercase text-on-surface tracking-tighter leading-none select-none text-[18vw] lg:text-[180px]">
            KALARA
          </span>
        </div>
      </footer>

      {/* Quick Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-md z-40 bg-primary text-on-primary border border-outline px-md py-sm flex items-center gap-md"
        >
          <span className="font-label text-label-sm uppercase">{toastMessage}</span>
          <button
            type="button"
            onClick={() => {
              setToastMessage(null);
              setIsCartOpen(true);
            }}
            className="bg-accent text-on-accent border border-outline px-sm py-xs font-label text-label-sm uppercase cursor-pointer hover:bg-surface hover:text-on-surface transition-colors"
          >
            LIHAT
          </button>
        </div>
      )}

      {/* n8n Cloud Customer Service AI Chatbot */}
      <CustomerChatWidget
        categories={CATALOG_CATEGORIES}
        cart={cart}
        onSelectCategory={handleOpenCategory}
      />

      {/* Interactive Modals & Drawers */}
      <ProductModal
        category={selectedCategory}
        initialVariantId={selectedVariantId}
        onClose={() => {
          setSelectedCategory(null);
          setSelectedVariantId(null);
        }}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateSize={handleUpdateSize}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />

      <ChannelModal
        channel={activeChannel}
        onClose={() => setActiveChannel(null)}
      />
    </div>
  );
}
