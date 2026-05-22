export type ListingCategory = {
  label: string
  sizePlaceholder: string
}

export const LISTING_CATEGORIES: ListingCategory[] = [
  { label: 'Outerwear', sizePlaceholder: 'XS, S, M, L, XL, XXL' },
  { label: 'T-Shirts', sizePlaceholder: 'XS, S, M, L, XL, XXL' },
  { label: 'Shirts', sizePlaceholder: 'Collar 15, 16, M, L, XL' },
  { label: 'Hoodies & Sweatshirts', sizePlaceholder: 'S, M, L, XL, XXL' },
  { label: 'Sweaters & Knits', sizePlaceholder: 'S, M, L, XL' },
  { label: 'Dresses', sizePlaceholder: 'UK 6, UK 8, UK 10, UK 12' },
  { label: 'Skirts', sizePlaceholder: 'Waist 26, 28, 30 or S, M, L' },
  { label: 'Jeans', sizePlaceholder: 'W28 L30, W32 L32' },
  { label: 'Trousers', sizePlaceholder: 'W30, W32, W34 or S, M, L' },
  { label: 'Shorts', sizePlaceholder: 'S, M, L or W30' },
  { label: 'Sneakers', sizePlaceholder: 'UK 6, UK 7, UK 8, UK 9' },
  { label: 'Boots', sizePlaceholder: 'UK 6, UK 7, UK 8, UK 9' },
  { label: 'Sandals & Slides', sizePlaceholder: 'UK 5, UK 6, UK 7, UK 8' },
  { label: 'Bags', sizePlaceholder: 'Mini, Small, Medium, Large' },
  { label: 'Hats & Caps', sizePlaceholder: 'One size, 56cm, 58cm' },
  { label: 'Belts', sizePlaceholder: '30, 32, 34, 36 or S, M, L' },
  { label: 'Jewelry & Watches', sizePlaceholder: 'One size, ring 7, 18cm' },
  { label: 'Sunglasses', sizePlaceholder: 'One size' },
  { label: 'Sportswear', sizePlaceholder: 'S, M, L, XL or UK shoe size' },
  { label: 'Traditional & Prints', sizePlaceholder: 'S, M, L, custom measurements' },
  { label: 'Workwear', sizePlaceholder: 'S, M, L, XL or waist size' },
  { label: 'Designer', sizePlaceholder: 'Brand size, EU/UK size, or measurements' },
  { label: 'Vintage', sizePlaceholder: 'Tagged size plus measurements' },
  { label: 'Kids', sizePlaceholder: 'Age 2-3, 4-5, 6-7, 8-9' },
  { label: 'Accessories', sizePlaceholder: 'One size or dimensions' },
  { label: 'Wholesale Bales', sizePlaceholder: 'Bale count, grade, or pieces per bale' },
  { label: 'Fabric & Textiles', sizePlaceholder: 'Yards, meters, roll size' },
  { label: 'Other', sizePlaceholder: 'Size, fit, or measurements' },
]

export const LISTING_BRANDS = [
  'Adidas',
  'Nike',
  'Puma',
  'New Balance',
  'Reebok',
  'Converse',
  'Vans',
  'Dr. Martens',
  'Carhartt',
  "Levi's",
  'Wrangler',
  'Lee',
  'Dickies',
  'The North Face',
  'Patagonia',
  'Columbia',
  'Champion',
  'Fila',
  'Lacoste',
  'Tommy Hilfiger',
  'Ralph Lauren',
  'Calvin Klein',
  'Diesel',
  'Timberland',
  'Supreme',
  'Stussy',
  'BAPE',
  'Palace',
  'H&M',
  'Zara',
  'Uniqlo',
  'ASOS',
  'Shein',
  'Primark',
  'GTP',
  'Vlisco',
  'Woodin',
  'Da Viva',
  'Unbranded',
]

export const LISTING_CONDITIONS = ['new', 'used'] as const

export function sizePlaceholderForCategory(category?: string) {
  return LISTING_CATEGORIES.find((item) => item.label === category)?.sizePlaceholder || 'M, L, XL, W32, UK 8...'
}
