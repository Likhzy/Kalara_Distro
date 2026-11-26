import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { ProductCategory, ProductVariant } from '../types';
import { formatIDR } from '../data/catalog';
import { LookbookImage } from './LookbookImage';

interface ProductModalProps {
  category: ProductCategory | null;
  initialVariantId?: string | null;
  onClose: () => void;
  onAddToCart: (
    category: ProductCategory,
    variant: ProductVariant,
    size: string,
    quantity: number
  ) => void;
}

export function ProductModal({
  category,
  initialVariantId = null,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (category) {
      const matchedVariant = initialVariantId
        ? category.variants.find((v) => v.id === initialVariantId)
        : undefined;
      setSelectedVariantId(matchedVariant?.id ?? category.variants[0]?.id ?? '');
      setSelectedSize(category.sizes.includes('L') ? 'L' : category.sizes[0] ?? 'ALL SIZE');
      setQuantity(1);
    }
  }, [category, initialVariantId]);

  useEffect(() => {
    if (!category) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [category, onClose]);

  if (!category) return null;

  const activeVariant =
    category.variants.find((v) => v.id === selectedVariantId) ?? category.variants[0];

  const handleConfirmAdd = () => {
    if (!activeVariant) return;
    onAddToCart(category, activeVariant, selectedSize, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/70 p-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-outline rounded-none overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline bg-surface">
          <span className="font-label text-label-sm text-on-surface-variant uppercase">
            {category.code} // DETAIL PRODUK
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail produk"
            className="border border-outline bg-surface text-on-surface p-xs hover:bg-primary hover:text-on-primary transition-colors duration-snap cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto">
          <div className="bg-surface-container border-b md:border-b-0 md:border-r border-outline aspect-[4/3] md:aspect-auto md:min-h-80 overflow-hidden">
            <LookbookImage
              src={category.imageUrl}
              alt={category.imageAlt}
              fallbackLabel={category.title}
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-lg flex flex-col justify-between gap-lg bg-surface">
            <div className="flex flex-col gap-md">
              <div>
                <h2
                  id="product-modal-title"
                  className="font-headline text-headline-md text-on-surface uppercase"
                >
                  {category.title}
                </h2>
                <p className="font-body text-body-md text-on-surface-variant mt-xs">
                  {category.description}
                </p>
              </div>

              {/* Variant Selection */}
              <div className="flex flex-col gap-xs">
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  PILIH MODEL / ARTIKEL
                </span>
                <div className="flex flex-col gap-xs">
                  {category.variants.map((variant) => {
                    const isSelected = variant.id === activeVariant?.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`w-full text-left px-md py-sm border transition-colors duration-snap cursor-pointer flex items-center justify-between gap-sm ${
                          isSelected
                            ? 'bg-primary text-on-primary border-outline'
                            : 'bg-surface text-on-surface border-outline-subtle hover:border-outline'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-headline text-label-lg uppercase">
                            {variant.name}
                          </span>
                          <span
                            className={`font-label text-label-sm ${
                              isSelected ? 'text-on-primary/80' : 'text-on-surface-variant'
                            }`}
                          >
                            {variant.colorway} · {variant.fit}
                          </span>
                        </div>
                        <span className="font-label text-label-md tabular-nums shrink-0">
                          {formatIDR(variant.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeVariant && (
                <div className="px-md py-sm bg-surface-container border border-outline-subtle">
                  <span className="font-label text-label-sm text-on-surface-variant uppercase block">
                    SPESIFIKASI BAHAN
                  </span>
                  <span className="font-body text-body-md text-on-surface">
                    {activeVariant.material}
                  </span>
                </div>
              )}

              {/* Size Selection */}
              <div className="flex flex-col gap-xs">
                <span className="font-label text-label-sm text-on-surface-variant uppercase">
                  PILIH UKURAN
                </span>
                <div className="flex flex-wrap gap-xs">
                  {category.sizes.map((size) => {
                    const active = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-11 px-md py-xs border border-outline font-label text-label-md uppercase transition-colors duration-snap cursor-pointer ${
                          active
                            ? 'bg-accent text-on-accent'
                            : 'bg-surface text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-md border-t border-outline flex items-center justify-between gap-md">
              <div className="flex items-center border border-outline bg-surface">
                <button
                  type="button"
                  aria-label="Kurangi jumlah"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-md font-label text-label-md tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Tambah jumlah"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmAdd}
                className="flex-1 bg-primary text-on-primary border border-outline px-lg py-sm font-label text-label-lg uppercase tracking-wider hover:bg-accent hover:text-on-accent transition-colors duration-snap cursor-pointer tabular-nums"
              >
                + KERANJANG · {formatIDR((activeVariant?.price ?? 0) * quantity)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
