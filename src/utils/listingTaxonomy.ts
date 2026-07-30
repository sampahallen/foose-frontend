export type ListingCategoryField =
  | 'brand'
  | 'size'
  | 'gender'
  | 'material'
  | 'fit'
  | 'pattern'
  | 'baleGrade'

export type ListingCategory = {
  fields: ListingCategoryField[]
  label: string
  subcategories: string[]
}

const CLOTHING_FIELDS: ListingCategoryField[] = ['brand', 'size', 'gender', 'material', 'fit']
const FOOTWEAR_FIELDS: ListingCategoryField[] = ['brand', 'size', 'gender', 'material']
const BAG_FIELDS: ListingCategoryField[] = ['brand', 'size', 'material']

export const LISTING_CATEGORIES: ListingCategory[] = [
  {
    fields: CLOTHING_FIELDS,
    label: 'Clothing',
    subcategories: ['Outerwear', 'Tops & Shirts', 'Hoodies & Sweatshirts', 'Sweaters & Knits', 'Dresses', 'Skirts', 'Jeans', 'Trousers & Shorts', 'Sportswear', 'Workwear', 'Other Clothing'],
  },
  {
    fields: FOOTWEAR_FIELDS,
    label: 'Footwear',
    subcategories: ['Sneakers', 'Boots', 'Sandals & Slides', 'Other Footwear'],
  },
  {
    fields: BAG_FIELDS,
    label: 'Bags',
    subcategories: ['Handbags', 'Backpacks', 'Totes', 'Crossbody & Shoulder Bags', 'Travel Bags', 'Other Bags'],
  },
  {
    fields: BAG_FIELDS,
    label: 'Accessories',
    subcategories: ['Hats & Caps', 'Belts', 'Jewelry & Watches', 'Sunglasses', 'Other Accessories'],
  },
  {
    fields: ['size', 'gender', 'material', 'pattern'],
    label: 'Traditional & Fabrics',
    subcategories: ['Traditional Wear & Prints', 'Fabric & Textiles'],
  },
  {
    fields: ['brand', 'size', 'gender', 'material'],
    label: 'Other',
    subcategories: [],
  },
]

export const LEGACY_CATEGORY_MAP: Record<string, [string, string]> = {
  Outerwear: ['Clothing', 'Outerwear'],
  'T-Shirts': ['Clothing', 'Tops & Shirts'],
  Shirts: ['Clothing', 'Tops & Shirts'],
  'Hoodies & Sweatshirts': ['Clothing', 'Hoodies & Sweatshirts'],
  'Sweaters & Knits': ['Clothing', 'Sweaters & Knits'],
  Dresses: ['Clothing', 'Dresses'],
  Skirts: ['Clothing', 'Skirts'],
  Jeans: ['Clothing', 'Jeans'],
  Trousers: ['Clothing', 'Trousers & Shorts'],
  Shorts: ['Clothing', 'Trousers & Shorts'],
  Sportswear: ['Clothing', 'Sportswear'],
  Workwear: ['Clothing', 'Workwear'],
  Kids: ['Clothing', 'Other Clothing'],
  Sneakers: ['Footwear', 'Sneakers'],
  Boots: ['Footwear', 'Boots'],
  'Sandals & Slides': ['Footwear', 'Sandals & Slides'],
  Bags: ['Bags', 'Other Bags'],
  'Hats & Caps': ['Accessories', 'Hats & Caps'],
  Belts: ['Accessories', 'Belts'],
  'Jewelry & Watches': ['Accessories', 'Jewelry & Watches'],
  Sunglasses: ['Accessories', 'Sunglasses'],
  Accessories: ['Accessories', 'Other Accessories'],
  'Traditional & Prints': ['Traditional & Fabrics', 'Traditional Wear & Prints'],
  'Fabric & Textiles': ['Traditional & Fabrics', 'Fabric & Textiles'],
  Vintage: ['Other', ''],
  Designer: ['Other', ''],
  'Wholesale Bales': ['Other', ''],
}

export const LISTING_BRANDS = [
  'Adidas', 'Air Jordan', 'ASOS', 'BAPE', 'Bershka', 'Birkenstock', 'Boohoo',
  'Burberry', 'Calvin Klein', 'Carhartt', 'Chanel', 'Champion', 'Clarks',
  'Columbia', 'Converse', 'COS', 'Crocs', 'Da Viva', 'Diesel', 'Dickies',
  'Dior', 'Dr. Martens', 'Fendi', 'Fila', 'Forever 21', 'Gap', 'GTP', 'Gucci',
  'H&M', 'Hermes', 'Hugo Boss', 'Jordan', 'Lacoste', 'Lee', "Levi's",
  'Louis Vuitton', 'Mango', 'Massimo Dutti', 'New Balance', 'Next', 'Nike',
  'Old Navy', 'Palace', 'Patagonia', 'Polo Ralph Lauren', 'Prada', 'Primark',
  'Pull&Bear', 'Puma', 'Reebok', 'River Island', 'Saint Laurent', 'Shein',
  'Skechers', 'Stussy', 'Supreme', 'The North Face', 'Timberland',
  'Tommy Hilfiger', 'Under Armour', 'Unbranded', 'Uniqlo', 'Vans', 'Versace',
  'Vlisco', 'Woodin', 'Wrangler', 'Zara',
]

export const LISTING_CONDITIONS = ['excellent', 'great', 'good', 'fair', 'poor'] as const

export const LISTING_COLORS = [
  { hex: '#f5f0dc', label: 'Beige', value: 'beige' },
  { hex: '#000000', label: 'Black', value: 'black' },
  { hex: '#1179bd', label: 'Blue', value: 'blue' },
  { hex: '#8b5a2b', label: 'Brown', value: 'brown' },
  { hex: '#973131', label: 'Burgundy', value: 'burgundy' },
  { hex: '#fffdd0', label: 'Cream', value: 'cream' },
  { hex: '#00a6d6', label: 'Cyan', value: 'cyan' },
  { hex: '#d5b43f', label: 'Gold', value: 'gold' },
  { hex: '#49a900', label: 'Green', value: 'green' },
  { hex: '#8a8f98', label: 'Gray', value: 'gray' },
  { hex: '#fffff0', label: 'Ivory', value: 'ivory' },
  { hex: '#9c8a16', label: 'Khaki', value: 'khaki' },
  { hex: 'conic-gradient(#e10600, #ffcc00, #38b000, #1179bd, #5b20d6, #e10600)', label: 'Multi', value: 'multi' },
  { hex: '#002b5f', label: 'Navy', value: 'navy' },
  { hex: '#708238', label: 'Olive', value: 'olive' },
  { hex: '#ff6500', label: 'Orange', value: 'orange' },
  { hex: '#ed5aae', label: 'Pink', value: 'pink' },
  { hex: '#5b20d6', label: 'Purple', value: 'purple' },
  { hex: '#e10600', label: 'Red', value: 'red' },
  { hex: 'linear-gradient(135deg,#777,#f6f6f6)', label: 'Silver', value: 'silver' },
  { hex: '#008080', label: 'Teal', value: 'teal' },
  { hex: '#40e0d0', label: 'Turquoise', value: 'turquoise' },
  { hex: '#7f00ff', label: 'Violet', value: 'violet' },
  { hex: '#ffffff', label: 'White', value: 'white' },
  { hex: '#ffcc00', label: 'Yellow', value: 'yellow' },
] as const

export type ListingColor = (typeof LISTING_COLORS)[number]['value']

export const LISTING_MATERIALS = [
  'cotton', 'denim', 'leather', 'faux-leather', 'wool', 'polyester', 'linen',
  'silk', 'canvas', 'rubber', 'metal', 'wood', 'mixed', 'other',
] as const
export const LISTING_FITS = ['slim', 'regular', 'relaxed', 'oversized', 'tailored'] as const
export const LISTING_PATTERNS = ['solid', 'striped', 'checked', 'floral', 'graphic', 'animal', 'geometric', 'traditional-print', 'other'] as const
export const LISTING_BALE_GRADES = ['premium', 'grade-a', 'grade-b', 'mixed'] as const
export const LISTING_FOOTWEAR_SIZES = Array.from({ length: 31 }, (_, index) => `EU ${index + 20}`)

export type ListingAttributes = {
  material?: (typeof LISTING_MATERIALS)[number]
  fit?: (typeof LISTING_FITS)[number]
  pattern?: (typeof LISTING_PATTERNS)[number]
  baleGrade?: (typeof LISTING_BALE_GRADES)[number]
}

export function normalizeCategorySelection(category?: string, subcategory?: string) {
  const legacy = category ? LEGACY_CATEGORY_MAP[category] : undefined
  const normalizedCategory = legacy?.[0] || category || ''
  const requestedSubcategory = legacy?.[1] || subcategory || ''
  const definition = listingCategory(normalizedCategory)
  return {
    category: definition ? normalizedCategory : '',
    subcategory: definition?.subcategories.includes(requestedSubcategory) ? requestedSubcategory : '',
  }
}

export function listingCategory(category?: string) {
  return LISTING_CATEGORIES.find((item) => item.label === category)
}

export function subcategoriesForCategory(category?: string) {
  return listingCategory(category)?.subcategories || []
}

export function fieldsForCategory(category?: string, subcategory?: string, type?: string) {
  let fields = listingCategory(category)?.fields || []
  if (category === 'Accessories' && ['Jewelry & Watches', 'Sunglasses'].includes(subcategory || '')) {
    fields = ['brand', 'material'] as ListingCategoryField[]
  }
  if (category === 'Traditional & Fabrics' && subcategory === 'Fabric & Textiles') {
    fields = ['size', 'material', 'pattern'] as ListingCategoryField[]
  }
  if (type === 'wholesale') fields = [...new Set<ListingCategoryField>([...fields, 'baleGrade'])]
  return fields
}

export function categoryUsesField(category: string | undefined, field: ListingCategoryField, subcategory?: string, type?: string) {
  return fieldsForCategory(category, subcategory, type).includes(field)
}

export function optionLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').split('-')
    .map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
}

export function pruneListingAttributes(category: string | undefined, attributes: ListingAttributes = {}, subcategory?: string, type?: string) {
  const fields = fieldsForCategory(category, subcategory, type)
  return Object.fromEntries(
    Object.entries(attributes).filter(([key, value]) => Boolean(value) && fields.includes(key as ListingCategoryField)),
  ) as ListingAttributes
}

export function sizePlaceholderForCategory(category?: string, subcategory?: string) {
  if (category === 'Footwear') return 'EU 35, EU 36, EU 37...'
  if (subcategory === 'Fabric & Textiles') return 'Yards, meters, roll size'
  if (category === 'Bags') return 'Mini, Small, Medium, Large'
  if (category === 'Accessories') return 'One size or dimensions'
  if (category === 'Clothing') return 'XS, S, M, L, XL, waist or measurements'
  return 'Size, fit, or measurements'
}

export function sizeLabelForCategory(_category?: string, subcategory?: string) {
  if (_category === 'Footwear') return 'Footwear size (EU)'
  return subcategory === 'Fabric & Textiles' ? 'Length or dimensions' : 'Size'
}
