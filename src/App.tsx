import './App.css'
import { AuthRequired } from './components'
import { useCurrentRoute } from './hooks/useCurrentRoute'
import {
  AdminDisputesPage,
  AdminKycPage,
  AdminOverviewPage,
  BrowsePage,
  BuyerDashboardPage,
  CartPage,
  CheckoutPage,
  CommunityPage,
  HomePage,
  InboxPage,
  KycPage,
  LoginPage,
  OpenShopPage,
  OrderConfirmedPage,
  RegisterPage,
  RetailDetailPage,
  SellerDashboardPage,
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
    case 'retailDetail':
      return <RetailDetailPage />
    case 'community':
      return <CommunityPage />
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
    case 'sellerDashboard':
      return (
        <AuthRequired>
          <SellerDashboardPage />
        </AuthRequired>
      )
    case 'buyerDashboard':
      return (
        <AuthRequired>
          <BuyerDashboardPage />
        </AuthRequired>
      )
    case 'home':
      return <HomePage />
  }
}

export default App
