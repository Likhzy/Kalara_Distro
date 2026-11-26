export interface ProductVariant {
  id: string;
  name: string;
  colorway: string;
  price: number;
  material: string;
  fit: string;
}

export interface ProductCategory {
  id: string;
  code: string;
  sizeLabel: string;
  sizes: string[];
  title: string;
  priceRange: string;
  defaultPrice: number;
  imageUrl: string;
  imageAlt: string;
  description: string;
  variants: ProductVariant[];
}

export interface CartItem {
  key: string;
  categoryId: string;
  categoryTitle: string;
  variantId: string;
  variantName: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface OrderReceipt {
  orderId: string;
  customerName: string;
  whatsapp: string;
  deliveryMethod: 'delivery' | 'pickup';
  address: string;
  paymentMethod: 'QRIS' | 'Transfer Bank' | 'COD Bandung';
  items: CartItem[];
  total: number;
  createdAt: string;
}

export type ChannelType =
  | 'shopee'
  | 'tokopedia'
  | 'whatsapp'
  | 'instagram'
  | 'tiktok'
  | 'location'
  | null;
