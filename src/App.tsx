import { AuthRequired, ImagePreviewModal, RouteErrorBoundary } from './components'
import { useCurrentRoute } from './hooks/useCurrentRoute'
import {
  AdminDisputesPage,
  AdminKycDetailPage,
  AdminKycPage,
  AdminOverviewPage,
  AccountSettingsPage,
  AuthCallbackPage,
  BaleWholesalePage,
  BrowsePage,
  CartPage,
  CheckoutPage,
  CommunityEventFormPage,
  CommunityFinspoArchivedPage,
  CommunityFinspoDetailPage,
  CommunityFinspoFormPage,
  CommunityPage,
  EventDetailPage,
  EventManagementPage,
  DigiShopsPage,
  FreshDropsPage,
  HomePage,
  InboxPage,
  KycPage,
  ListingPromotionPage,
  LoginPage,
  NewListingPage,
  NotFoundPage,
  OpenShopPage,
  OrderConfirmedPage,
  OrderDetailPage,
  OrderManagementPage,
  PromotionReturnPage,
  ProfilePage,
  ProfileSettingsPage,
  RegisterPage,
  ResetPasswordPage,
  RetailDetailPage,
  SavedPage,
  SearchPage,
  SellerDashboardPage,
  ShopDraftListingsPage,
  ShopPage,
  SuggestedForYouPage,
  TopPicksPage,
  WalletPage,
} from './pages'
import { resolveRoute } from './utils/routes'

function App() {
  const { pathname, search } = useCurrentRoute()

  let page

  switch (resolveRoute(pathname, search)) {
    case 'login':
      page = <LoginPage />
      break
    case 'authCallback':
      page = <AuthCallbackPage />
      break
    case 'register':
      page = <RegisterPage />
      break
    case 'resetPassword':
      page = <ResetPasswordPage />
      break
    case 'adminKyc':
      page = (
        <AuthRequired adminOnly>
          <AdminKycPage />
        </AuthRequired>
      )
      break
    case 'adminKycDetail':
      page = (
        <AuthRequired adminOnly>
          <AdminKycDetailPage />
        </AuthRequired>
      )
      break
    case 'adminDisputes':
      page = (
        <AuthRequired adminOnly>
          <AdminDisputesPage />
        </AuthRequired>
      )
      break
    case 'adminOverview':
      page = (
        <AuthRequired adminOnly>
          <AdminOverviewPage />
        </AuthRequired>
      )
      break
    case 'browse':
      page = <BrowsePage />
      break
    case 'search':
      page = <SearchPage key={search} />
      break
    case 'suggestedForYou':
      page = (
        <AuthRequired>
          <SuggestedForYouPage />
        </AuthRequired>
      )
      break
    case 'freshDrops':
      page = <FreshDropsPage />
      break
    case 'digishops':
      page = <DigiShopsPage />
      break
    case 'bales':
      page = <BaleWholesalePage />
      break
    case 'topPicks':
      page = <TopPicksPage />
      break
    case 'shop':
      page = <ShopPage />
      break
    case 'retailDetail':
      page = <RetailDetailPage />
      break
    case 'newListing':
    case 'editListing':
      page = (
        <AuthRequired>
          <NewListingPage />
        </AuthRequired>
      )
      break
    case 'community':
      page = <CommunityPage key={search} />
      break
    case 'eventDetail':
      page = <EventDetailPage />
      break
    case 'eventManage':
      page = (
        <AuthRequired>
          <EventManagementPage />
        </AuthRequired>
      )
      break
    case 'communityEventForm':
      page = (
        <AuthRequired>
          <CommunityEventFormPage />
        </AuthRequired>
      )
      break
    case 'communityFinspoForm':
      page = (
        <AuthRequired>
          <CommunityFinspoFormPage />
        </AuthRequired>
      )
      break
    case 'communityFinspoArchived':
      page = (
        <AuthRequired>
          <CommunityFinspoArchivedPage />
        </AuthRequired>
      )
      break
    case 'communityFinspoDetail':
      page = <CommunityFinspoDetailPage key={pathname} />
      break
    case 'saved':
      page = (
        <AuthRequired>
          <SavedPage />
        </AuthRequired>
      )
      break
    case 'accountSettings':
      page = (
        <AuthRequired>
          <AccountSettingsPage />
        </AuthRequired>
      )
      break
    case 'profileSettings':
      page = (
        <AuthRequired>
          <ProfileSettingsPage />
        </AuthRequired>
      )
      break
    case 'profile':
      page = <ProfilePage />
      break
    case 'inbox':
      page = (
        <AuthRequired>
          <InboxPage />
        </AuthRequired>
      )
      break
    case 'cart':
      page = <CartPage />
      break
    case 'checkout':
      page = (
        <AuthRequired>
          <CheckoutPage />
        </AuthRequired>
      )
      break
    case 'orderConfirmed':
      page = (
        <AuthRequired>
          <OrderConfirmedPage />
        </AuthRequired>
      )
      break
    case 'orderDetail':
      page = (
        <AuthRequired>
          <OrderDetailPage />
        </AuthRequired>
      )
      break
    case 'orderHistory':
    case 'orderManagement':
      page = (
        <AuthRequired>
          <OrderManagementPage />
        </AuthRequired>
      )
      break
    case 'promotionReturn':
      page = (
        <AuthRequired>
          <PromotionReturnPage />
        </AuthRequired>
      )
      break
    case 'listingPromotions':
      page = (
        <AuthRequired>
          <ListingPromotionPage />
        </AuthRequired>
      )
      break
    case 'kyc':
      page = (
        <AuthRequired>
          <KycPage />
        </AuthRequired>
      )
      break
    case 'openShop':
      page = (
        <AuthRequired>
          <OpenShopPage />
        </AuthRequired>
      )
      break
    case 'wallet':
      page = (
        <AuthRequired>
          <WalletPage />
        </AuthRequired>
      )
      break
    case 'manageShop':
      page = (
        <AuthRequired>
          <SellerDashboardPage />
        </AuthRequired>
      )
      break
    case 'shopDrafts':
      page = (
        <AuthRequired>
          <ShopDraftListingsPage />
        </AuthRequired>
      )
      break
    case 'home':
      page = <HomePage />
      break
    case 'notFound':
      page = <NotFoundPage />
      break
  }

  return (
    <>
      <RouteErrorBoundary resetKey={`${pathname}${search}`}>
        {page}
      </RouteErrorBoundary>
      <ImagePreviewModal />
    </>
  )
}

export default App
