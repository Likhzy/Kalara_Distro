import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import type { ProductCategory, ProductVariant } from '../types';
import { formatIDR } from '../data/catalog';
import { LookbookImage } from './LookbookImage';

interface HeaderProps {
  cartCount: number;
  searchQuery: string;
  categories: ProductCategory[];
  onSearchChange: (query: string) => void;
  onSelectCategory: (category: ProductCategory, variantId?: string) => void;
  onOpenCart: () => void;
}

interface SearchVariantMatch {
  category: ProductCategory;
  variant: ProductVariant;
}

export function Header({
  cartCount,
  searchQuery,
  categories,
  onSearchChange,
  onSelectCategory,
  onOpenCart,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const { matchedCategories, matchedVariants } = useMemo(() => {
    if (!normalizedQuery) {
      return { matchedCategories: [] as ProductCategory[], matchedVariants: [] as SearchVariantMatch[] };
    }

    const cats = categories.filter(
      (cat) =>
        cat.title.toLowerCase().includes(normalizedQuery) ||
        cat.code.toLowerCase().includes(normalizedQuery) ||
        cat.description.toLowerCase().includes(normalizedQuery) ||
        cat.sizes.some((s) => s.toLowerCase() === normalizedQuery)
    );

    const variants: SearchVariantMatch[] = [];
    for (const cat of categories) {
      for (const variant of cat.variants) {
        const matchesVariant =
          variant.name.toLowerCase().includes(normalizedQuery) ||
          variant.colorway.toLowerCase().includes(normalizedQuery) ||
          variant.material.toLowerCase().includes(normalizedQuery) ||
          variant.fit.toLowerCase().includes(normalizedQuery) ||
          cat.title.toLowerCase().includes(normalizedQuery);
        if (matchesVariant) {
          variants.push({ category: cat, variant });
        }
      }
    }

    return { matchedCategories: cats, matchedVariants: variants };
  }, [categories, normalizedQuery]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const inDesktop = desktopSearchRef.current?.contains(target);
      const inMobile = mobileSearchRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  const scrollToCatalog = () => {
    const section = document.getElementById('koleksi');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    setMobileSearchOpen(false);
    if (normalizedQuery) {
      scrollToCatalog();
    }
  };

  const handleClearSearch = () => {
    onSearchChange('');
    setIsDropdownOpen(false);
    if (mobileSearchOpen) {
      mobileInputRef.current?.focus();
    } else {
      desktopInputRef.current?.focus();
    }
  };

  const handlePickCategory = (category: ProductCategory) => {
    setIsDropdownOpen(false);
    setMobileSearchOpen(false);
    onSelectCategory(category);
  };

  const handlePickVariant = (category: ProductCategory, variant: ProductVariant) => {
    setIsDropdownOpen(false);
    setMobileSearchOpen(false);
    onSelectCategory(category, variant.id);
  };

  const renderResultsDropdown = () => {
    if (!isDropdownOpen || !normalizedQuery) return null;

    const hasResults = matchedCategories.length > 0 || matchedVariants.length > 0;

    return (
      <div
        role="listbox"
        aria-label="Hasil pencarian produk"
        className="absolute left-0 right-0 top-full mt-xs z-40 bg-surface border border-outline shadow-none max-h-96 overflow-y-auto"
      >
        {!hasResults ? (
          <div className="p-md flex flex-col gap-xs">
            <span className="font-label text-label-sm text-on-surface-variant uppercase">
              TIDAK DITEMUKAN
            </span>
            <p className="font-body text-label-md text-on-surface-variant">
              Tidak ada kategori atau artikel yang cocok dengan &ldquo;{searchQuery.trim()}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-outline">
            {matchedCategories.length > 0 && (
              <div className="flex flex-col">
                <div className="px-md py-xs bg-surface-container border-b border-outline-subtle flex items-center justify-between">
                  <span className="font-label text-label-sm text-on-surface-variant uppercase">
                    KATEGORI ({matchedCategories.length})
                  </span>
                </div>
                {matchedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="option"
                    onClick={() => handlePickCategory(cat)}
                    className="w-full px-md py-sm text-left flex items-center justify-between gap-sm hover:bg-surface-container transition-colors duration-snap cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-headline text-label-lg text-on-surface uppercase block truncate">
                        {cat.title}
                      </span>
                      <span className="font-label text-label-sm text-on-surface-variant uppercase">
                        {cat.code} · {cat.sizeLabel}
                      </span>
                    </div>
                    <span className="font-label text-label-sm text-on-surface tabular-nums shrink-0">
                      {cat.priceRange}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {matchedVariants.length > 0 && (
              <div className="flex flex-col">
                <div className="px-md py-xs bg-surface-container border-b border-outline-subtle flex items-center justify-between">
                  <span className="font-label text-label-sm text-on-surface-variant uppercase">
                    ARTIKEL PRODUK ({matchedVariants.length})
                  </span>
                </div>
                {matchedVariants.slice(0, 6).map(({ category, variant }) => (
                  <button
                    key={variant.id}
                    type="button"
                    role="option"
                    onClick={() => handlePickVariant(category, variant)}
                    className="w-full px-md py-sm text-left flex items-center gap-sm hover:bg-surface-container transition-colors duration-snap cursor-pointer"
                  >
                    <div className="w-10 h-10 border border-outline bg-surface-container shrink-0 overflow-hidden">
                      <LookbookImage
                        src={category.imageUrl}
                        alt={variant.name}
                        fallbackLabel={category.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-headline text-label-lg text-on-surface uppercase block truncate">
                        {variant.name}
                      </span>
                      <span className="font-label text-label-sm text-on-surface-variant block truncate">
                        {variant.colorway} · {category.title}
                      </span>
                    </div>
                    <span className="font-label text-label-sm text-on-surface tabular-nums shrink-0">
                      {formatIDR(variant.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                setMobileSearchOpen(false);
                scrollToCatalog();
              }}
              className="w-full px-md py-sm bg-primary text-on-primary font-label text-label-sm uppercase text-center hover:bg-accent hover:text-on-accent transition-colors duration-snap cursor-pointer"
            >
              LIHAT HASIL DI KATALOG KOLEKSI →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-outline">
      <div className="flex items-center justify-between px-lg py-md gap-md">
        <a
          href="#"
          className="font-display text-headline-md text-on-surface uppercase tracking-tight whitespace-nowrap shrink-0"
        >
          KALARA DISTRO
        </a>

        <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-xl">
          <a
            href="#koleksi"
            className="font-label text-label-md text-on-surface uppercase hover:text-accent transition-colors duration-snap ease-snap whitespace-nowrap shrink-0"
          >
            KOLEKSI
          </a>
          <a
            href="#tentang"
            className="font-label text-label-md text-on-surface uppercase hover:text-accent transition-colors duration-snap ease-snap whitespace-nowrap shrink-0"
          >
            TENTANG
          </a>
          <a
            href="#lokasi"
            className="font-label text-label-md text-on-surface uppercase hover:text-accent transition-colors duration-snap ease-snap whitespace-nowrap shrink-0"
          >
            LOKASI &amp; KONTAK
          </a>
        </nav>

        <div className="flex items-center gap-sm shrink-0">
          {/* Desktop / Tablet Product Search Bar */}
          <div ref={desktopSearchRef} className="hidden md:block relative w-56 xl:w-72">
            <form onSubmit={handleSubmitSearch} role="search" aria-label="Cari produk KALARA DISTRO">
              <div className="flex items-center border border-outline bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-accent">
                <Search className="w-4 h-4 text-on-surface-variant ml-sm shrink-0" aria-hidden="true" />
                <input
                  ref={desktopInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (normalizedQuery) setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsDropdownOpen(false);
                  }}
                  placeholder="CARI KAOS, HOODIE, CARGO..."
                  aria-label="Cari kategori atau produk"
                  className="w-full bg-transparent px-sm py-sm font-label text-label-sm text-on-surface placeholder:text-on-surface-variant/80 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Hapus pencarian"
                    className="p-xs mr-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
            {renderResultsDropdown()}
          </div>

          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((prev) => !prev);
              setMobileMenuOpen(false);
            }}
            aria-expanded={mobileSearchOpen}
            aria-label={mobileSearchOpen ? 'Tutup pencarian' : 'Buka pencarian produk'}
            className={`md:hidden border border-outline p-sm rounded-none transition-colors duration-snap ease-snap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer ${
              mobileSearchOpen || normalizedQuery
                ? 'bg-accent text-on-accent'
                : 'bg-surface text-on-surface hover:bg-primary hover:text-on-primary'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((prev) => !prev);
              setMobileSearchOpen(false);
            }}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="lg:hidden bg-surface text-on-surface border border-outline p-sm rounded-none transition-colors duration-snap ease-snap hover:bg-primary hover:text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <button
            id="cart-btn"
            type="button"
            onClick={onOpenCart}
            className="bg-[#f6f5f1] text-on-surface border border-outline px-md py-sm rounded-none font-label text-label-md uppercase tabular-nums transition-colors duration-snap ease-snap hover:bg-primary hover:text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>
              KERANJANG (<span id="cart-count">{cartCount}</span>)
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Drawer */}
      {mobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="md:hidden border-t border-outline bg-surface px-lg py-sm relative"
        >
          <form onSubmit={handleSubmitSearch} role="search" aria-label="Cari produk KALARA DISTRO">
            <div className="flex items-center border border-outline bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-accent">
              <Search className="w-4 h-4 text-on-surface-variant ml-sm shrink-0" aria-hidden="true" />
              <input
                ref={mobileInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => {
                  if (normalizedQuery) setIsDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsDropdownOpen(false);
                    setMobileSearchOpen(false);
                  }
                }}
                placeholder="CARI KAOS, HOODIE, CARGO..."
                aria-label="Cari kategori atau produk"
                className="w-full bg-transparent px-sm py-sm font-label text-label-sm text-on-surface placeholder:text-on-surface-variant/80 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Hapus pencarian"
                  className="p-sm text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
          <div className="relative">{renderResultsDropdown()}</div>
        </div>
      )}

      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="lg:hidden border-t border-outline bg-surface flex flex-col"
        >
          <a
            href="#koleksi"
            onClick={closeMenu}
            className="px-lg py-md border-b border-outline-subtle font-label text-label-md text-on-surface uppercase hover:bg-surface-container transition-colors duration-snap"
          >
            KOLEKSI
          </a>
          <a
            href="#tentang"
            onClick={closeMenu}
            className="px-lg py-md border-b border-outline-subtle font-label text-label-md text-on-surface uppercase hover:bg-surface-container transition-colors duration-snap"
          >
            TENTANG
          </a>
          <a
            href="#lokasi"
            onClick={closeMenu}
            className="px-lg py-md font-label text-label-md text-on-surface uppercase hover:bg-surface-container transition-colors duration-snap"
          >
            LOKASI &amp; KONTAK
          </a>
        </nav>
      )}
    </header>
  );
}
