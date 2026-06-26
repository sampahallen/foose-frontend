import { AuthRequired, ImagePreviewModal } from './components'
import { useCurrentRoute } from './hooks/useCurrentRoute'
import {
  AdminDisputesPage,
  AdminKycDetailPage,
  AdminKycPage,
  AdminOverviewPage,
  AuthCallbackPage,
  BaleWholesalePage,
  BrowsePage,
  CartPage,
  CheckoutPage,
  CommunityEventFormPage,
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
  OpenShopPage,
  OrderConfirmedPage,
  OrderDetailPage,
  OrderManagementPage,
  PromotionReturnPage,
  ProfilePage,
  ProfileSettingsPage,
  RegisterPage,
  RetailDetailPage,
  SavedPage,
  SellerDashboardPage,
  ShopPage,
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
      page = <CommunityPage />
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
    case 'communityFinspoDetail':
      page = <CommunityFinspoDetailPage />
      break
    case 'saved':
      page = (
        <AuthRequired>
          <SavedPage />
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
    case 'home':
      page = <HomePage />
      break
  }

  return (
    <>
      {page}
      <ImagePreviewModal />
    </>
  )
}

export default App
