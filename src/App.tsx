import { AuthRequired } from './components'
import { useCurrentRoute } from './hooks/useCurrentRoute'
import {
  AdminDisputesPage,
  AdminKycDetailPage,
  AdminKycPage,
  AdminOverviewPage,
  BrowsePage,
  CartPage,
  CheckoutPage,
  CommunityEventFormPage,
  CommunityFinspoDetailPage,
  CommunityFinspoFormPage,
  CommunityPage,
  EventDetailPage,
  EventManagementPage,
  HomePage,
  InboxPage,
  KycPage,
  LoginPage,
  NewListingPage,
  OpenShopPage,
  OrderConfirmedPage,
  ProfilePage,
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

  switch (resolveRoute(pathname, search)) {
    case 'login':
      return <LoginPage />
    case 'register':
      return <RegisterPage />
    case 'adminKyc':
      return (
        <AuthRequired adminOnly>
          <AdminKycPage />
        </AuthRequired>
      )
    case 'adminKycDetail':
      return (
        <AuthRequired adminOnly>
          <AdminKycDetailPage />
        </AuthRequired>
      )
    case 'adminDisputes':
      return (
        <AuthRequired adminOnly>
          <AdminDisputesPage />
        </AuthRequired>
      )
    case 'adminOverview':
      return (
        <AuthRequired adminOnly>
          <AdminOverviewPage />
        </AuthRequired>
      )
    case 'browse':
      return <BrowsePage />
    case 'topPicks':
      return <TopPicksPage />
    case 'shop':
      return <ShopPage />
    case 'retailDetail':
      return <RetailDetailPage />
    case 'newListing':
    case 'editListing':
      return (
        <AuthRequired>
          <NewListingPage />
        </AuthRequired>
      )
    case 'community':
      return <CommunityPage />
    case 'eventDetail':
      return <EventDetailPage />
    case 'eventManage':
      return (
        <AuthRequired>
          <EventManagementPage />
        </AuthRequired>
      )
    case 'communityEventForm':
      return (
        <AuthRequired>
          <CommunityEventFormPage />
        </AuthRequired>
      )
    case 'communityFinspoForm':
      return (
        <AuthRequired>
          <CommunityFinspoFormPage />
        </AuthRequired>
      )
    case 'communityFinspoDetail':
      return <CommunityFinspoDetailPage />
    case 'saved':
      return (
        <AuthRequired>
          <SavedPage />
        </AuthRequired>
      )
    case 'profile':
      return <ProfilePage />
    case 'inbox':
      return (
        <AuthRequired>
          <InboxPage />
        </AuthRequired>
      )
    case 'cart':
      return <CartPage />
    case 'checkout':
      return (
        <AuthRequired>
          <CheckoutPage />
        </AuthRequired>
      )
    case 'orderConfirmed':
      return (
        <AuthRequired>
          <OrderConfirmedPage />
        </AuthRequired>
      )
    case 'kyc':
      return (
        <AuthRequired>
          <KycPage />
        </AuthRequired>
      )
    case 'openShop':
      return (
        <AuthRequired>
          <OpenShopPage />
        </AuthRequired>
      )
    case 'wallet':
      return (
        <AuthRequired>
          <WalletPage />
        </AuthRequired>
      )
    case 'manageShop':
      return (
        <AuthRequired>
          <SellerDashboardPage />
        </AuthRequired>
      )
    case 'home':
      return <HomePage />
  }
}

export default App
