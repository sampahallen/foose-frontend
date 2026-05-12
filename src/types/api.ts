export type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}

export type ApiFailure = {
  success: false
  error: string
  details?: unknown
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresIn?: string
}

export type User = {
  _id: string
  name: string
  email: string
  username: string
  phone?: string
  profilePhoto?: string
  role: 'user' | 'admin'
  isEmailVerified: boolean
  isKycVerified: boolean
  hasShop: boolean
  wallet?: {
    balance: number
    escrow: number
  }
  location?: {
    region?: string
    city?: string
  }
  kycId?: KycRecord | string | null
}

export type Shop = {
  _id: string
  ownerId?: User | string
  shopName: string
  slug: string
  bio?: string
  logoUrl?: string
  bannerUrl?: string
  category?: 'retail' | 'wholesale' | 'both'
  isLive?: boolean
  rating?: number
  totalReviews?: number
}

export type Listing = {
  _id: string
  shopId?: Shop | string
  title: string
  description?: string
  category?: string
  brand?: string
  size?: string
  gender?: 'men' | 'women' | 'unisex' | 'kids'
  condition?: 'new' | 'used' | 'bale'
  type: 'retail' | 'wholesale'
  price: number
  currency?: string
  quantity?: number
  bulkMinQty?: number
  bulkWeight?: string
  volumeDiscounts?: Array<{
    minQty?: number
    pricePerUnit?: number
  }>
  images?: string[]
  status?: 'active' | 'sold' | 'draft' | 'removed'
  views?: number
  createdAt?: string
  updatedAt?: string
}

export type Order = {
  _id: string
  buyerId?: User | string
  shopId?: Shop | string
  items: Array<{
    listingId?: Listing | string
    title: string
    price: number
    quantity: number
  }>
  totalAmount: number
  currency?: string
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'disputed' | 'cancelled' | 'refunded'
  delivery?: {
    method?: 'pickup' | 'delivery'
    fee?: number
    address?: {
      region?: string
      city?: string
      street?: string
    }
    trackingInfo?: string
  }
  createdAt?: string
  updatedAt?: string
}

export type KycRecord = {
  _id?: string
  userId?: User | string
  idType?: 'Ghana Card' | 'Passport' | 'Driving License'
  idNo?: string
  dob?: string
  idImgUrl?: string
  selfieImgUrl?: string
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  submissionCount?: number
  submittedAt?: string
  reviewedAt?: string
}

export type Event = {
  _id: string
  title: string
  description?: string
  date: string
  location?: string
  coverImage?: string
  type: 'pop-up' | 'fair' | 'online'
  attendees?: string[]
  status?: 'upcoming' | 'ongoing' | 'past'
}

export type GalleryPost = {
  _id: string
  imageUrl: string
  caption?: string
  tags?: string[]
  likes?: string[]
  userId?: User | string
  createdAt?: string
}

export type AuthPayload = {
  user: User
  tokens: AuthTokens
}

export type PaginatedListings = {
  results: Listing[]
  total: number
  page: number
  pages: number
}

export type AdminStats = {
  users: number
  shops: number
  orders: number
  listings: number
  revenue: number
}
