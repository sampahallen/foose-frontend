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
  bio?: string
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
  following?: string[]
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
  payoutMethod?: {
    type?: 'mobile_money' | 'bank_transfer'
    accountName?: string
    provider?: string
    accountNumber?: string
    bankName?: string
    branch?: string
  }
  socialLinks?: {
    instagram?: string
    whatsapp?: string
  }
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
  condition?: 'excellent' | 'great' | 'good' | 'fair' | 'poor'
  color?: 'beige' | 'black' | 'blue' | 'brown' | 'burgundy' | 'cream' | 'cyan' | 'gold' | 'green' | 'gray' | 'ivory' | 'khaki' | 'multi' | 'navy' | 'olive' | 'orange' | 'pink' | 'purple' | 'red' | 'silver' | 'teal' | 'turquoise' | 'violet' | 'white' | 'yellow'
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
  promotionTags?: string[]
  promotionExpiresAt?: string
  visibility?: 'marketplace' | 'event'
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
  subtotalAmount?: number
  deliveryFee?: number
  totalAmount: number
  currency?: string
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'disputed' | 'cancelled' | 'refunded'
  paymentMethod?: 'paystack_mock' | 'paystack' | 'cash_on_pickup'
  paymentStatus?: 'unpaid' | 'paid' | 'cash_on_pickup' | 'refunded'
  paymentRef?: string
  escrowStatus?: 'not_held' | 'held' | 'released' | 'refunded'
  sellerAction?: 'pending' | 'accepted' | 'shipped' | 'pickup_ready'
  sellerActionAt?: string
  sellerActionDeadline?: string
  sellerNote?: string
  autoReleaseAt?: string
  releasedAt?: string
  buyerConfirmedAt?: string
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

export type Review = {
  _id: string
  reviewerId?: User | string
  shopId?: Shop | string
  orderId?: Order | string
  source?: 'order' | 'direct'
  rating: number
  comment?: string
  createdAt?: string
  updatedAt?: string
}

export type KycRecord = {
  _id?: string
  userId?: User | string
  idType?: 'Ghana Card' | 'Passport' | 'Driving License'
  idNo?: string
  dob?: string
  phone?: string
  phoneVerified?: boolean
  idImgUrl?: string
  selfieImgUrl?: string
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  submissionCount?: number
  submittedAt?: string
  reviewedAt?: string
  reviewedBy?: User | string
}

export type Event = {
  _id: string
  organizerId?: User | string
  shopId?: Shop | string
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  startsAt?: string
  endsAt?: string
  location?: string
  coverImage?: string
  eventListings?: Listing[] | string[]
  promotionTags?: string[]
  promotionExpiresAt?: string
  type: 'online-pop-up' | 'in-person-pop-up' | 'pop-up' | 'fair' | 'online'
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

export type FavoriteCollections = {
  ids: {
    events: string[]
    finspos: string[]
    listings: string[]
  }
  events: Event[]
  finspos: GalleryPost[]
  listings: Listing[]
}

export type Notification = {
  _id: string
  userId?: User | string
  type: 'order' | 'chat' | 'review' | 'kyc' | 'system'
  title: string
  body?: string
  link?: string
  isRead?: boolean
  createdAt?: string
}

export type PopularSearch = {
  count: number
  query: string
  normalizedQuery: string
}

export type WeeklyTopSeller = Shop & {
  completedOrders: number
  revenue: number
}

export type ChatConversation = {
  conversationId: string
  latestMessage: {
    _id: string
    attachments?: ChatAttachment[]
    content: string
    createdAt?: string
    isRead?: boolean
    reactions?: ChatReaction[]
    replyTo?: ChatMessagePreview | string
    senderId?: User | string
    receiverId?: User | string
    listingId?: Listing | string
  }
  unreadCount: number
  participant?: User | string
  listing?: Listing | string
}

export type ChatAttachment = {
  url: string
  type: 'image' | 'video'
  mimetype?: string
  originalname?: string
}

export type ChatReactionName = 'thumbs_up' | 'heart' | 'thumbs_down' | 'fire' | 'sad' | 'laugh'

export type ChatReaction = {
  userId?: User | string
  reaction: ChatReactionName
}

export type ChatMessagePreview = {
  _id: string
  attachments?: ChatAttachment[]
  content?: string
  createdAt?: string
  senderId?: User | string
  listingId?: Listing | string
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

export type PaginatedReviews = {
  reviews: Review[]
  total: number
  page: number
  pages: number
}

export type PaginatedShops = {
  shops: Shop[]
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
