import type { UserRole, UserRoles } from '../constants/roles'

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

export type PaystackPaymentSession = {
  accessCode: string
  provider: 'paystack'
  reference: string
  status: 'pending'
}

export type PromotionTier = 'quick_boost' | 'weekend_push' | 'top_pick' | 'homepage_feature'

export type PromotionItem = {
  targetId: string
  startsAt?: string
  endsAt?: string
  impressions: number
  clicks: number
  clickThroughRate: number
  status: 'pending' | 'processing' | 'active' | 'scheduled' | 'expired' | 'failed'
  target?: Pick<Listing, '_id' | 'title' | 'images'> | Pick<Event, '_id' | 'title' | 'coverImage' | 'date'> | null
}

export type PromotionOrder = {
  _id: string
  targetType: 'listing' | 'event'
  tier: PromotionTier
  unitAmount: number
  totalAmount: number
  currency: 'GHS'
  durationHours: number
  paymentReference: string
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed'
  paidAt?: string
  fulfilledAt?: string
  items: PromotionItem[]
  createdAt: string
}

export type User = {
  _id: string
  name: string
  email: string
  username: string
  phone?: string
  bio?: string
  profilePhoto?: string
  roles?: UserRoles
  role?: UserRole | string | number
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
  createdAt?: string
  updatedAt?: string
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
  location?: {
    city?: string
    region?: string
  }
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
  location?: {
    city?: string
    region?: string
  }
  title: string
  description?: string
  hashtags?: string[]
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

export type HashtagSuggestion = {
  name: string
  hashtag: string
  postCount: number
}

export type HashtagSuggestionsResponse = {
  suggestions: HashtagSuggestion[]
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
  commentCount?: number
  isArchived?: boolean
  archivedAt?: string
  archiveDeleteAt?: string
  userId?: User | string
  createdAt?: string
}

export type ProfileContentType = 'finspo' | 'listings' | 'events'

export type ProfileConnectionType = 'followers' | 'following'

export type ProfileConnectionMember = Pick<User, '_id' | 'hasShop' | 'isKycVerified' | 'name' | 'profilePhoto' | 'username'>

export type PaginatedProfileConnections = {
  items: ProfileConnectionMember[]
  page: number
  pages: number
  restricted: boolean
  total: number
  type: ProfileConnectionType
}

export type ProfileContentCounts = Record<ProfileContentType, number>

export type ProfileSummary = {
  user: User
  contentCounts: ProfileContentCounts
  followerCount: number
  followingCount: number
  isFollowing?: boolean
  shop?: Shop | null
}

export type PaginatedProfileContent<T extends GalleryPost | Listing | Event> = {
  items: T[]
  page: number
  pages: number
  total: number
  type: ProfileContentType
}

export type FinspoComment = {
  _id: string
  body: string
  userId: User
  replyToUserId: User | null
  likeCount: number
  liked: boolean
  replyCount: number
  rootCommentId?: string
  createdAt: string
}

export type PaginatedFinspoComments = {
  comments: FinspoComment[]
  total: number
  totalComments: number
  page: number
  pages: number
}

export type PaginatedFinspoReplies = {
  replies: FinspoComment[]
  total: number
  page: number
  pages: number
  rootCommentId: string
}

export type CreatedFinspoComment = {
  comment: FinspoComment
  totalComments: number
}

export type CreatedFinspoReply = {
  reply: FinspoComment
  rootCommentId: string
  rootReplyCount: number
  totalComments: number
}

export type FinspoCommentLikeState = {
  commentId: string
  liked: boolean
  likeCount: number
}

export type FinspoCommentContext = {
  isReply: boolean
  rootComment: FinspoComment
  rootCommentId: string
  target: FinspoComment
  totalComments: number
}

export type FinspoAccountSuggestion = Pick<
  User,
  '_id' | 'bio' | 'hasShop' | 'isKycVerified' | 'name' | 'profilePhoto' | 'username'
> & {
  finspoCount: number
}

export type FollowingFinspoFeed = {
  followingCount: number
  posts: GalleryPost[]
  suggestedAccounts: FinspoAccountSuggestion[]
  suggestionMeta: {
    fallbackCount: number
    personalized: boolean
    personalizedCount: number
  } | null
  total: number
}

export type PaginatedFinspoFeed = {
  feed: {
    allocations: {
      fallback: number
      new: number
      personalized: number
    }
    newCount: number
    pageSize: number
    personalized: boolean
    personalizedCount: number
  }
  page: number
  pages: number
  posts: GalleryPost[]
  total: number
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

export type ChatMessage = {
  _id: string
  attachments?: ChatAttachment[]
  content: string
  conversationId?: string
  createdAt?: string
  isRead?: boolean
  reactions?: ChatReaction[]
  replyTo?: ChatMessagePreview | string
  senderId?: User | string
  receiverId?: User | string
  listingId?: Listing | string
}

export type ChatConversation = {
  conversationId: string
  latestMessage: ChatMessage
  unreadCount: number
  unreadReactionCount?: number
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
  isRead?: boolean
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
  filters?: {
    locations?: Array<{
      label: string
      value: string
    }>
  }
  feed?: {
    allocations: {
      new: number
      promoted: number
      suggested: number
    }
    candidateLimit: number
    pageSize: number
    personalized: boolean
    promotedGap: number
    requestedPromotedGap: number
  }
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

export type UnifiedSearchScope = 'all' | 'items' | 'finspo' | 'events' | 'users'

export type UnifiedSearchResultType = 'item' | 'finspo' | 'event' | 'user'

export type UnifiedSearchUser = User & {
  shop?: Pick<Shop, '_id' | 'bio' | 'category' | 'isLive' | 'location' | 'logoUrl' | 'rating' | 'shopName' | 'slug'> | null
}

export type UnifiedSearchResult =
  | { entity: Listing; type: 'item' }
  | { entity: GalleryPost; type: 'finspo' }
  | { entity: Event; type: 'event' }
  | { entity: UnifiedSearchUser; type: 'user' }

export type UnifiedSearchCounts = Record<UnifiedSearchScope, number>

export type UnifiedSearchResponse = {
  counts: UnifiedSearchCounts
  hasMore: boolean
  nextCursor: string | null
  query: string
  results: UnifiedSearchResult[]
  scope: UnifiedSearchScope
  total: number
}

export type UnifiedSearchSuggestion = {
  entity?: Listing | GalleryPost | Event | UnifiedSearchUser
  hashtag?: string
  href?: string
  id?: string
  imageUrl?: string
  kind?: 'entity' | 'hashtag'
  label: string
  sourceId?: string
  subtitle?: string
  type: UnifiedSearchResultType | 'hashtag'
  username?: string
}

export type UnifiedSearchSuggestionsResponse = {
  suggestions: UnifiedSearchSuggestion[]
}

export type BrowseSearchItemSuggestion = {
  entity: Listing
  href?: string
  imageUrl?: string
  kind: 'entity'
  label: string
  sourceId?: string
  subtitle?: string
  type: 'item'
}

export type BrowseSearchRefinementSuggestion = {
  count: number
  kind: 'term'
  label: string
  type: 'brand' | 'category' | 'hashtag'
  value: string
}

export type BrowseSearchSuggestion = BrowseSearchItemSuggestion | BrowseSearchRefinementSuggestion

export type BrowseSearchSuggestionsResponse = {
  suggestions: BrowseSearchSuggestion[]
}

export type AdminStats = {
  users: number
  shops: number
  orders: number
  listings: number
  revenue: number
}
