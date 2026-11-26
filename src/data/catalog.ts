import type { ProductCategory } from '../types';

export const HERO_IMAGE = {
  url: 'https://lh3.googleusercontent.com/aida/ALJJyrD8LzY2fCv-ckpjcVhwFQ5qT2OwLwqOcVImVPaDiWo9FK0VgLd9Z7eMxMa6Emj4zgAKFQz_UnYIojGabsCjxwqk1Im3zbb52n5VO-WXF8nmActlAUZJNPGmykW3kRooZieg_KTDH-VxiKs2RlC3NMgR9SckO9Uod8aWCX90WKoCBbLP3wNuDFtE4f1CBuvdSk-MDE_m7KJZYEw4mQ5zHnl1LKQdEfbvQyxwU024BsDgxjMqyYDA',
  alt: 'Young Indonesian streetwear models wearing oversized graphic tees and hoodies in neutral daylight',
};

export const STORE_IMAGE = {
  url: 'https://lh3.googleusercontent.com/aida/ALJJyrCSvxzB-yyzCbFMjIc4qA7-9HNG6jY1TaM1FcpQXrxSCK5QZKXVORiKomlxCLNNNAYzS96h37s_Qy0YaA_HY8XMxPk7yKD3xDp_mo7PhBB7qI6P_IignPfpcu2oLuhsk1M4qkD_6aLPnJARL0mHDTpcs_zHcZv4dUHF7Fz99-G_Az6x6GwAT57CjUyDQWjkHGVHYVDwJ4RAVdZCdJmd6YlV9QtmLfnCwMCz7ZwhCSoV4Ufa9XJnaBtb',
  alt: 'Interior toko offline KALARA DISTRO dengan rak pakaian minimalis dan cahaya alami',
};

export const BRAND_VALUES = [
  '01 / DESAIN EKSKLUSIF',
  '02 / BAHAN NYAMAN & ADEM',
  '03 / HARGA RAMAH PELAJAR',
  '04 / UNISEX S–XXL',
] as const;

export const STORE_INFO = {
  name: 'KALARA DISTRO',
  tagline: 'Karya Lokal, Rasa Anak Muda',
  address: 'Jl. Trunojoyo No. 28, Citarum, Kec. Bandung Wetan, Kota Bandung, Jawa Barat 40115',
  hours: 'SENIN – MINGGU // 10.00 – 21.00 WIB',
  whatsappNumber: '6281234567890',
  whatsappDisplay: '+62 812-3456-7890',
  channels: {
    shopee: {
      title: 'SHOPEE OFFICIAL STORE',
      handle: 'shopee.co.id/kalaradistro.id',
      url: 'https://shopee.co.id',
      note: 'Gratis ongkir seluruh Indonesia dengan voucher Shopee & pengiriman H+0 dari Bandung.',
    },
    tokopedia: {
      title: 'TOKOPEDIA OFFICIAL',
      handle: 'tokopedia.com/kalaradistro',
      url: 'https://www.tokopedia.com',
      note: 'Tersedia pengiriman instan area Bandung Raya & reguler ke seluruh Nusantara.',
    },
    whatsapp: {
      title: 'WHATSAPP DIRECT ORDER',
      handle: '+62 812-3456-7890',
      url: 'https://wa.me/6281234567890',
      note: 'Konsultasi ukuran, cek stok real-time toko Trunojoyo, atau pesan langsung tanpa antre.',
    },
    instagram: {
      title: 'INSTAGRAM // @kalaradistro',
      handle: '@kalaradistro',
      url: 'https://instagram.com',
      note: 'Update lookbook harian, jadwal restock Drop 01, dan konten komunitas kreatif Bandung.',
    },
    tiktok: {
      title: 'TIKTOK // @kalaradistro.id',
      handle: '@kalaradistro.id',
      url: 'https://tiktok.com',
      note: 'Video fit-check potongan boxy & oversized, behind-the-scene sablon konveksi lokal.',
    },
    location: {
      title: 'OFFLINE STORE // BANDUNG',
      handle: 'Jl. Trunojoyo No. 28, Bandung',
      url: 'https://maps.google.com/?q=Jl.+Trunojoyo+No.+28,+Bandung',
      note: 'Coba langsung potongan oversized & boxy fit di flagship store kami setiap hari pukul 10.00 – 21.00 WIB.',
    },
  },
} as const;

export const CATALOG_CATEGORIES: ProductCategory[] = [
  {
    id: 'kaos-grafis',
    code: 'CAT // 01 — TEES',
    sizeLabel: 'S / M / L / XL',
    sizes: ['S', 'M', 'L', 'XL'],
    title: 'Kaos Grafis & Oversized',
    priceRange: 'Rp75.000 – Rp120.000',
    defaultPrice: 95000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrAUZJ-vBIdQoCvRDW_vfJiZDjllC-gM76PzG2W0_JL9bR2Tn4iCwqrcJRREyGVFPvYe0QrL5K96UQsG_sVTDCruxJbEdwzMcibVo7gCbZWMIzGyVxuHaC-MhsTxcygnOl9mTtMMz3XqWIO_f1uPO3XM1oG0IKx3ILiE62Y6C1Qu1MhDUWPMCiTZPTtCtDkl5XrB-p1Y58H3ABykWCFT_GbIRvgUJoZuJyWlQw8u2LhLLjFBdlij0GQf',
    imageAlt: 'Kaos Grafis & Oversized KALARA DISTRO',
    description:
      'Kaos harian berpotongan boxy & oversized dengan sablon plastisol tajam yang tahan cuci serta menyerap keringat untuk iklim tropis.',
    variants: [
      {
        id: 'tee-trunojoyo-01',
        name: 'Kalara Archive Boxy Tee',
        colorway: 'Off-White / Rust Ink',
        price: 95000,
        material: 'Cotton Combed 20s Heavyweight (210 gsm)',
        fit: 'Boxy Oversized Fit',
      },
      {
        id: 'tee-bandung-noise',
        name: 'Bandung Youth Graphic Tee',
        colorway: 'Charcoal Washed',
        price: 115000,
        material: 'Cotton Combed 24s Bio-Wash',
        fit: 'Relaxed Drop-Shoulder',
      },
      {
        id: 'tee-daily-basic',
        name: 'Kalara Pocket Basic Tee',
        colorway: 'Warm Chalk',
        price: 75000,
        material: 'Cotton Combed 24s Adem',
        fit: 'Regular Relaxed Fit',
      },
    ],
  },
  {
    id: 'hoodie-fleece',
    code: 'CAT // 02 — OUTERWEAR',
    sizeLabel: 'M / L / XL / XXL',
    sizes: ['M', 'L', 'XL', 'XXL'],
    title: 'Hoodie Fleece',
    priceRange: 'Rp150.000 – Rp220.000',
    defaultPrice: 185000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrDWP8ultUeEU_PClo5v2TOYArtpTAAFYK7aMG130bbSOcG8gyYg1Jomf8iBk8g7TuzCwq0hvNPaQnluu2PvgubLKJYA_z5-Vi8Vdlf1vYzQ4AcSw9kTVMwGu0pgBfhLo9VMq0en_YHvyQ8x8GSCeuiCKOT7xc8IGSi5t6k0uyTCnb3Fdde-yKGMrbQ5uvqb9yYAJtzU6PBIDKtZoYUdleaqdgdfVYmjIynUwvbmleiikgRcgsVr9E0TbO0',
    imageAlt: 'Hoodie Fleece KALARA DISTRO',
    description:
      'Hoodie double-layered hood dengan bagian dalam katun fleece lembut yang hangat dipakai riding malam namun tetap breathable.',
    variants: [
      {
        id: 'hoodie-heavy-01',
        name: 'Kalara Heavyweight Pullover',
        colorway: 'Jet Black / Contrast Stitch',
        price: 185000,
        material: 'Cotton Fleece 330 gsm',
        fit: 'Boxy Streetwear Cut',
      },
      {
        id: 'hoodie-zip-02',
        name: 'Trunojoyo Zip Hoodie',
        colorway: 'Ash Grey',
        price: 215000,
        material: 'Cotton Fleece 330 gsm + YKK Zipper',
        fit: 'Oversized Fit',
      },
      {
        id: 'hoodie-essential',
        name: 'Daily Campus Hoodie',
        colorway: 'Sand Stone',
        price: 155000,
        material: 'Cotton Fleece 280 gsm',
        fit: 'Relaxed Fit',
      },
    ],
  },
  {
    id: 'crewneck-basic',
    code: 'CAT // 03 — SWEATSHIRT',
    sizeLabel: 'S / M / L / XL',
    sizes: ['S', 'M', 'L', 'XL'],
    title: 'Crewneck Basic',
    priceRange: 'Rp130.000 – Rp180.000',
    defaultPrice: 150000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrDajenRkRMj2cvEgOMTVcz3dLwEAqifC1UlHxjPwhnD0VJj-01EHJW5WBbAaeqRsk6y0rPQGI8O0sqxyaP5x_gtUhoeXq10WOdyiLRgKz_BZPdS9RHwOn6Zrl6CSbor1BY4mB3b9S8vUXkR1azFUzfrKEI97VShrEXDkwx6Ni-2r8YoN6JWfWHqFhdk6jeW3AthzE_QtsuKmUclIEkflFcsxQKwhL_kY6cm_uJVZfeCkaF3xLtSN0q3i1lKbg',
    imageAlt: 'Crewneck Basic KALARA DISTRO',
    description:
      'Sweatshirt minimalis dengan rib leher kokoh anti-melar, cocok dipadukan dengan celana cargo maupun celana pendek santai.',
    variants: [
      {
        id: 'crew-mono-01',
        name: 'Kalara Ribbed Crewneck',
        colorway: 'Oatmeal Melange',
        price: 150000,
        material: 'French Terry 300 gsm',
        fit: 'Relaxed Drop-Shoulder',
      },
      {
        id: 'crew-arch-02',
        name: 'Archive Stamp Sweatshirt',
        colorway: 'Deep Charcoal',
        price: 175000,
        material: 'Cotton Fleece 310 gsm',
        fit: 'Boxy Fit',
      },
      {
        id: 'crew-clean-03',
        name: 'Studio Plain Crewneck',
        colorway: 'Forest Olive',
        price: 135000,
        material: 'French Terry 280 gsm',
        fit: 'Regular Unisex',
      },
    ],
  },
  {
    id: 'kemeja-casual',
    code: 'CAT // 04 — SHIRTS',
    sizeLabel: 'S / M / L / XL',
    sizes: ['S', 'M', 'L', 'XL'],
    title: 'Kemeja Casual',
    priceRange: 'Rp100.000 – Rp160.000',
    defaultPrice: 135000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrBL9VOvlFObSKvrwjjG-mB9t9GxNaHXnUfgpX5oW5YgZFFC1VLXktkO2HSe2rJjECTBHSwghw2juxrO-zp2etH_eYgVyM7BX4l_5HGEFzAk6vhZJ8vzPA9Q0TZy4BbAFdBj5UKc7O_sS-3IxLkGzdCxKGJSS8hU6a4VpPltp7LiAZuBX6BsNFhcVdaN4N03EqCC2LTce_4qCCCH_drCkr1lJfqVtRY9Ydyu6pTHk2SaXBVmsJdmOm-hFG7F',
    imageAlt: 'Kemeja Casual KALARA DISTRO',
    description:
      'Kemeja kerja & kuliah bergaya utilitarian dengan dua saku dada fungsional, jahitan rantai rapi, dan tekstur kain katun twill adem.',
    variants: [
      {
        id: 'shirt-work-01',
        name: 'Citarum Utility Workshirt',
        colorway: 'Khaki Tan',
        price: 135000,
        material: 'Cotton Twill Ripstop Ringan',
        fit: 'Boxy Short Sleeve',
      },
      {
        id: 'shirt-cuban-02',
        name: 'Kalara Cuban Camp Shirt',
        colorway: 'Jet Black',
        price: 120000,
        material: 'Rayon Cotton Slub',
        fit: 'Relaxed Open Collar',
      },
      {
        id: 'shirt-oxford-03',
        name: 'Campus Overshirt',
        colorway: 'Slate Blue',
        price: 155000,
        material: 'Cotton Oxford Heavy',
        fit: 'Loose Layering Fit',
      },
    ],
  },
  {
    id: 'celana',
    code: 'CAT // 05 — BOTTOMS',
    sizeLabel: '28 / 30 / 32 / 34',
    sizes: ['28', '30', '32', '34'],
    title: 'Celana Pendek & Panjang',
    priceRange: 'Rp120.000 – Rp200.000',
    defaultPrice: 165000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrCLooK8nhYM20GNRPePMwE0sM9A6ROKwKoIFH54dhr0pERbzjXeAJX6rmPM39CdpVXp5CHaj3xNhXDZGKqx7AI4Ttbslb5ZZWIsooH-DOSpnWc00lrT_3LW7buv8HrCgINM8uz-ydHHgEut5EICvI_dIyJo8hUZzvN-vrbfwJyTRE9tDK40FsFk4b6AIfbjashErUrO8KXE3knojXmFyooEgb38D9jBJk9Yo-LwEBAPJg4Oqw',
    imageAlt: 'Celana Pendek & Panjang KALARA DISTRO',
    description:
      'Celana cargo dan boardshort potongan lebar yang bebas bergerak untuk aktivitas harian, skate, maupun nongkrong akhir pekan.',
    variants: [
      {
        id: 'pants-cargo-01',
        name: 'Kalara Wide Cargo Pants',
        colorway: 'Matte Black',
        price: 185000,
        material: 'Cotton Canvas 10oz',
        fit: 'Wide Baggy Cut',
      },
      {
        id: 'pants-chino-02',
        name: 'Skate Relaxed Ankle Pants',
        colorway: 'Warm Beige',
        price: 165000,
        material: 'Stretch Cotton Twill',
        fit: 'Loose Tapered',
      },
      {
        id: 'shorts-cargo-03',
        name: 'Utility Walkshorts',
        colorway: 'Olive Drab',
        price: 125000,
        material: 'Nylon Crinkle Water-Repellent',
        fit: 'Above-Knee Relaxed',
      },
    ],
  },
  {
    id: 'topi-aksesori',
    code: 'CAT // 06 — HEADWEAR & GEAR',
    sizeLabel: 'ALL SIZE',
    sizes: ['ALL SIZE'],
    title: 'Topi & Aksesori',
    priceRange: 'Rp45.000 – Rp75.000',
    defaultPrice: 65000,
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrDw_zCZBoUP6Nl7UpdRDpom8kNpV_k1wj2WbMlSAeGWL_vgKsCM0KFfDlpmsVsl8G8nCa40biQ6106O0oXSo4N8wQIsViDk_rb-EbJkOJnu826g-mdn9kzxfPtYxERINUfimvV_ZSizncM4Z5gAM-7YKyAMYlYorC_ITKaQZaFYXuuXP0uYYunrI_-VJIa11HXkBa9vn-x1L_uADCHYeQ2QdJiYvzwJUr2X5HJFTc2Tof1OhD96gZlZkEA8',
    imageAlt: 'Topi & Aksesori KALARA DISTRO',
    description:
      'Pelengkap gaya harian mulai dari 6-panel cap bordir timbul, beanie rajut, hingga sling bag kanvas tahan lama.',
    variants: [
      {
        id: 'acc-cap-01',
        name: 'Kalara 6-Panel Dad Cap',
        colorway: 'Black / Burnt Orange Embroidery',
        price: 65000,
        material: 'Cotton Drill + Metal Buckle',
        fit: 'Adjustable All Size',
      },
      {
        id: 'acc-beanie-02',
        name: 'Short Fisherman Beanie',
        colorway: 'Charcoal',
        price: 55000,
        material: 'Acrylic Cotton Knit',
        fit: 'All Size Stretch',
      },
      {
        id: 'acc-socks-03',
        name: 'Archive Crew Socks + Sticker Pack',
        colorway: 'Chalk / Black Stripe',
        price: 45000,
        material: 'Combed Cotton Terry',
        fit: 'EU 38–44 (All Size)',
      },
    ],
  },
];

export function formatIDR(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}
