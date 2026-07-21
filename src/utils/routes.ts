export type AppRoute =
  | 'login'
  | 'authCallback'
  | 'register'
  | 'resetPassword'
  | 'verifyEmail'
  | 'adminKyc'
  | 'adminKycDetail'
  | 'adminDisputes'
  | 'adminOverview'
  | 'newListing'
  | 'editListing'
  | 'browse'
  | 'search'
  | 'suggestedForYou'
  | 'freshDrops'
  | 'digishops'
  | 'bales'
  | 'topPicks'
  | 'shop'
  | 'retailDetail'
  | 'community'
  | 'eventDetail'
  | 'eventManage'
  | 'communityEventForm'
  | 'communityFinspoArchived'
  | 'communityFinspoDetail'
  | 'communityFinspoForm'
  | 'saved'
  | 'accountSettings'
  | 'profileSettings'
  | 'profile'
  | 'inbox'
  | 'cart'
  | 'checkout'
  | 'orderConfirmed'
  | 'orderDetail'
  | 'orderHistory'
  | 'orderManagement'
  | 'promotionReturn'
  | 'listingPromotions'
  | 'shopDrafts'
  | 'kyc'
  | 'openShop'
  | 'wallet'
  | 'manageShop'
  | 'home'
  | 'notFound'

export type RoutePageFamily =
  | 'admin'
  | 'auth'
  | 'commerce'
  | 'community'
  | 'detail'
  | 'discovery'
  | 'form'
  | 'home'
  | 'management'
  | 'messaging'
  | 'profile'
  | 'status'
  | 'system'

export type RouteStateLayout = 'page' | 'section' | 'pane' | 'compact' | 'immersive'
export type RouteStateScene = 'admin' | 'cards' | 'detail' | 'form' | 'home' | 'inbox' | 'list' | 'orders' | 'profile' | 'spinner'

export type RouteStateDefinition = {
  defaultScene: RouteStateScene
  family: RoutePageFamily
  supportedLayouts: readonly RouteStateLayout[]
}

export type RouteNavigationKind = 'root' | 'nested' | 'terminal'

export type RouteNavigationDefinition = {
  kind: RouteNavigationKind
  label: string
  fallback?: {
    href: string
    label: string
  }
}

const PAGE = ['page', 'section', 'compact'] as const
const IMMERSIVE = ['immersive', 'page', 'compact'] as const
const PANE = ['pane', 'section', 'compact'] as const

export const routeStateRegistry = {
  accountSettings: { defaultScene: 'form', family: 'profile', supportedLayouts: PAGE },
  adminDisputes: { defaultScene: 'admin', family: 'admin', supportedLayouts: PAGE },
  adminKyc: { defaultScene: 'admin', family: 'admin', supportedLayouts: PAGE },
  adminKycDetail: { defaultScene: 'detail', family: 'admin', supportedLayouts: PAGE },
  adminOverview: { defaultScene: 'admin', family: 'admin', supportedLayouts: PAGE },
  authCallback: { defaultScene: 'spinner', family: 'auth', supportedLayouts: IMMERSIVE },
  bales: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  browse: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  cart: { defaultScene: 'list', family: 'commerce', supportedLayouts: PAGE },
  checkout: { defaultScene: 'form', family: 'commerce', supportedLayouts: PAGE },
  community: { defaultScene: 'home', family: 'community', supportedLayouts: PAGE },
  communityEventForm: { defaultScene: 'form', family: 'form', supportedLayouts: PAGE },
  communityFinspoArchived: { defaultScene: 'cards', family: 'community', supportedLayouts: PAGE },
  communityFinspoDetail: { defaultScene: 'detail', family: 'detail', supportedLayouts: PAGE },
  communityFinspoForm: { defaultScene: 'form', family: 'form', supportedLayouts: PAGE },
  digishops: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  editListing: { defaultScene: 'form', family: 'form', supportedLayouts: PAGE },
  eventDetail: { defaultScene: 'detail', family: 'detail', supportedLayouts: PAGE },
  eventManage: { defaultScene: 'detail', family: 'management', supportedLayouts: PAGE },
  freshDrops: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  home: { defaultScene: 'home', family: 'home', supportedLayouts: PAGE },
  inbox: { defaultScene: 'inbox', family: 'messaging', supportedLayouts: PANE },
  kyc: { defaultScene: 'form', family: 'status', supportedLayouts: PAGE },
  listingPromotions: { defaultScene: 'cards', family: 'management', supportedLayouts: PAGE },
  login: { defaultScene: 'form', family: 'auth', supportedLayouts: IMMERSIVE },
  manageShop: { defaultScene: 'admin', family: 'management', supportedLayouts: PAGE },
  newListing: { defaultScene: 'form', family: 'form', supportedLayouts: PAGE },
  notFound: { defaultScene: 'detail', family: 'system', supportedLayouts: IMMERSIVE },
  openShop: { defaultScene: 'form', family: 'form', supportedLayouts: PAGE },
  orderConfirmed: { defaultScene: 'spinner', family: 'status', supportedLayouts: IMMERSIVE },
  orderDetail: { defaultScene: 'detail', family: 'detail', supportedLayouts: PAGE },
  orderHistory: { defaultScene: 'orders', family: 'commerce', supportedLayouts: PAGE },
  orderManagement: { defaultScene: 'orders', family: 'management', supportedLayouts: PAGE },
  profile: { defaultScene: 'profile', family: 'profile', supportedLayouts: PAGE },
  profileSettings: { defaultScene: 'form', family: 'profile', supportedLayouts: PAGE },
  promotionReturn: { defaultScene: 'spinner', family: 'status', supportedLayouts: IMMERSIVE },
  register: { defaultScene: 'form', family: 'auth', supportedLayouts: IMMERSIVE },
  resetPassword: { defaultScene: 'form', family: 'auth', supportedLayouts: IMMERSIVE },
  verifyEmail: { defaultScene: 'spinner', family: 'auth', supportedLayouts: IMMERSIVE },
  retailDetail: { defaultScene: 'detail', family: 'detail', supportedLayouts: PAGE },
  saved: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  search: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  shop: { defaultScene: 'detail', family: 'detail', supportedLayouts: PAGE },
  shopDrafts: { defaultScene: 'cards', family: 'management', supportedLayouts: PAGE },
  suggestedForYou: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  topPicks: { defaultScene: 'cards', family: 'discovery', supportedLayouts: PAGE },
  wallet: { defaultScene: 'detail', family: 'status', supportedLayouts: PAGE },
} as const satisfies Record<AppRoute, RouteStateDefinition>

/**
 * Exhaustive navigation behavior for shared Back controls. Dynamic origins in
 * the tracked history always win; these fallbacks are only used for direct
 * links, reloads with stale history, and entries opened from outside Foose.
 */
export const routeNavigationRegistry = {
  accountSettings: { kind: 'nested', label: 'Account settings', fallback: { href: '/profile', label: 'Profile' } },
  adminDisputes: { kind: 'root', label: 'Disputes' },
  adminKyc: { kind: 'root', label: 'KYC queue' },
  adminKycDetail: { kind: 'nested', label: 'KYC review', fallback: { href: '/admin/kyc', label: 'KYC queue' } },
  adminOverview: { kind: 'root', label: 'Admin' },
  authCallback: { kind: 'terminal', label: 'Authentication' },
  bales: { kind: 'root', label: 'Bales' },
  browse: { kind: 'root', label: 'Browse' },
  cart: { kind: 'root', label: 'Cart' },
  checkout: { kind: 'nested', label: 'Checkout', fallback: { href: '/cart', label: 'Cart' } },
  community: { kind: 'root', label: 'Community' },
  communityEventForm: { kind: 'nested', label: 'Event editor', fallback: { href: '/community?tab=events', label: 'Community events' } },
  communityFinspoArchived: { kind: 'nested', label: 'Archived Finspo', fallback: { href: '/community?tab=finspo&scope=mine', label: 'My Finspo' } },
  communityFinspoDetail: { kind: 'nested', label: 'Finspo', fallback: { href: '/community?tab=finspo&scope=public', label: 'Finspo' } },
  communityFinspoForm: { kind: 'nested', label: 'Finspo editor', fallback: { href: '/community?tab=finspo&scope=mine', label: 'My Finspo' } },
  digishops: { kind: 'root', label: 'DigiShops' },
  editListing: { kind: 'nested', label: 'Listing editor', fallback: { href: '/manage-shop', label: 'Shop management' } },
  eventDetail: { kind: 'nested', label: 'Event', fallback: { href: '/community?tab=events', label: 'Community events' } },
  eventManage: { kind: 'nested', label: 'Event management', fallback: { href: '/community?tab=events&scope=mine', label: 'My events' } },
  freshDrops: { kind: 'root', label: 'Fresh drops' },
  home: { kind: 'root', label: 'Home' },
  inbox: { kind: 'root', label: 'Inbox' },
  kyc: { kind: 'nested', label: 'Verification', fallback: { href: '/profile', label: 'Profile' } },
  listingPromotions: { kind: 'nested', label: 'Promotions', fallback: { href: '/manage-shop', label: 'Shop management' } },
  login: { kind: 'nested', label: 'Log in', fallback: { href: '/', label: 'Home' } },
  manageShop: { kind: 'root', label: 'Shop management' },
  newListing: { kind: 'nested', label: 'New listing', fallback: { href: '/manage-shop', label: 'Shop management' } },
  notFound: { kind: 'terminal', label: 'Not found' },
  openShop: { kind: 'nested', label: 'Open a DigiShop', fallback: { href: '/profile', label: 'Profile' } },
  orderConfirmed: { kind: 'terminal', label: 'Order confirmation' },
  orderDetail: { kind: 'nested', label: 'Order', fallback: { href: '/orders/history', label: 'Orders' } },
  orderHistory: { kind: 'root', label: 'Orders' },
  orderManagement: { kind: 'root', label: 'Order management' },
  profile: { kind: 'root', label: 'Profile' },
  profileSettings: { kind: 'nested', label: 'Profile settings', fallback: { href: '/profile', label: 'Profile' } },
  promotionReturn: { kind: 'terminal', label: 'Promotion confirmation' },
  register: { kind: 'nested', label: 'Register', fallback: { href: '/', label: 'Home' } },
  resetPassword: { kind: 'nested', label: 'Reset password', fallback: { href: '/login', label: 'Log in' } },
  verifyEmail: { kind: 'terminal', label: 'Email verification' },
  retailDetail: { kind: 'nested', label: 'Listing', fallback: { href: '/browse', label: 'Browse' } },
  saved: { kind: 'root', label: 'Saved' },
  search: { kind: 'root', label: 'Explore' },
  shop: { kind: 'nested', label: 'DigiShop', fallback: { href: '/digishops', label: 'DigiShops' } },
  shopDrafts: { kind: 'nested', label: 'Draft listings', fallback: { href: '/manage-shop/listings', label: 'Active listings' } },
  suggestedForYou: { kind: 'root', label: 'Suggested for you' },
  topPicks: { kind: 'root', label: 'Top picks' },
  wallet: { kind: 'nested', label: 'Wallet', fallback: { href: '/profile', label: 'Profile' } },
} as const satisfies Record<AppRoute, RouteNavigationDefinition>

export function resolveRoute(pathname: string, search: string): AppRoute {
  const searchParams = new URLSearchParams(search)

  if (pathname.startsWith('/auth/callback')) return 'authCallback'
  if (pathname.startsWith('/login')) return 'login'
  if (pathname.startsWith('/register')) return 'register'
  if (pathname.startsWith('/reset-password')) return 'resetPassword'
  if (pathname.startsWith('/verify-email')) return 'verifyEmail'
  if (/^\/admin\/kyc\/[^/]+/.test(pathname)) return 'adminKycDetail'
  if (pathname.startsWith('/admin/kyc')) return 'adminKyc'
  if (pathname.startsWith('/admin/disputes')) return 'adminDisputes'
  if (pathname.startsWith('/admin')) return 'adminOverview'
  if (pathname.startsWith('/top-picks')) return 'topPicks'
  if (pathname.startsWith('/fresh-drops')) return 'freshDrops'
  if (pathname.startsWith('/digishops')) return 'digishops'
  if (pathname.startsWith('/bales') || pathname.startsWith('/bale-wholesale')) return 'bales'
  if (pathname.startsWith('/suggested-for-you')) return 'suggestedForYou'
  if (pathname.startsWith('/search')) return 'search'
  if (pathname.startsWith('/browse')) return 'browse'
  if (pathname.startsWith('/shops/')) return 'shop'
  if (pathname.startsWith('/listings/new')) return 'newListing'
  if (/^\/listings\/[^/]+\/edit/.test(pathname)) return 'editListing'
  if (pathname.startsWith('/listing')) return 'retailDetail'
  if (pathname.startsWith('/community/events/new') || /^\/community\/events\/[^/]+\/edit/.test(pathname)) return 'communityEventForm'
  if (/^\/community\/events\/[^/]+\/manage/.test(pathname)) return 'eventManage'
  if (/^\/community\/events\/[^/]+/.test(pathname)) return 'eventDetail'
  if (pathname.startsWith('/community/finspo/archived')) return 'communityFinspoArchived'
  if (pathname.startsWith('/community/finspo/new') || /^\/community\/finspo\/[^/]+\/edit/.test(pathname)) return 'communityFinspoForm'
  if (/^\/community\/finspo\/[^/]+/.test(pathname)) return 'communityFinspoDetail'
  if (pathname.startsWith('/community')) return 'community'
  if (pathname.startsWith('/saved')) return 'saved'
  if (pathname.startsWith('/account/settings')) return 'accountSettings'
  if (pathname.startsWith('/profile') && searchParams.get('panel') === 'account') return 'accountSettings'
  if (pathname.startsWith('/profile/settings')) return 'profileSettings'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/inbox')) return 'inbox'
  if (pathname.startsWith('/cart')) return 'cart'
  if (pathname.startsWith('/checkout')) return 'checkout'
  if (pathname.startsWith('/order-confirmed')) return 'orderConfirmed'
  if (pathname.startsWith('/promotions/confirm')) return 'promotionReturn'
  if (pathname.startsWith('/manage-shop/promotions')) return 'listingPromotions'
  if (pathname.startsWith('/manage-shop/drafts')) return 'shopDrafts'
  if (/^\/orders\/[^/]+/.test(pathname) && !pathname.startsWith('/orders/history')) return 'orderDetail'
  if (pathname.startsWith('/orders/history')) return 'orderHistory'
  if (pathname.startsWith('/manage-shop/orders/history')) return 'orderHistory'
  if (pathname.startsWith('/manage-shop/orders')) return 'orderManagement'
  if (pathname === '/orders') return 'orderManagement'
  if (pathname.startsWith('/orders')) return 'orderManagement'
  if (pathname.startsWith('/account/kyc')) return 'kyc'
  if (pathname.startsWith('/kyc')) return 'kyc'
  if (pathname.startsWith('/open-shop')) return 'openShop'
  if (pathname.startsWith('/wallet')) return 'wallet'
  if (pathname.startsWith('/manage-shop')) return 'manageShop'
  if (pathname.startsWith('/dashboard') && searchParams.get('view') === 'shop') return 'manageShop'
  if (pathname.startsWith('/dashboard')) return 'home'
  if (pathname === '/' || pathname === '/index.html') return 'home'

  return 'notFound'
}
