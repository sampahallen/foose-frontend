import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { AppShell } from '../layout/AppShell'
import { StatePanel } from '../feedback/StatePanel'
import { ButtonLink } from '../ui/ButtonLink'

export function ShopAccessGate({
  children,
  loading = false,
  loadingContent,
  noShopBody = 'Open a DigiShop to manage listings and seller orders.',
  noShopVisual,
}: {
  children: ReactNode
  loading?: boolean
  loadingContent?: ReactNode
  noShopBody?: ReactNode
  noShopVisual?: ReactNode
}) {
  const { user } = useAuth()

  if (loading || !user) {
    return (
      <AppShell active="profile" showFooter={false}>
        {loadingContent}
      </AppShell>
    )
  }

  if (!user.isKycVerified) {
    return (
      <AppShell active="profile">
        <StatePanel
          action={<ButtonLink to="/kyc">Start KYC</ButtonLink>}
          body="Approved identity verification is required before managing your DigiShop."
          layout="page"
          title="KYC required"
          tone="permission"
        />
      </AppShell>
    )
  }

  if (!user.hasShop) {
    return (
      <AppShell active="profile">
        <StatePanel
          action={<ButtonLink to="/open-shop">Open your DigiShop</ButtonLink>}
          body={noShopBody}
          layout="page"
          title="No DigiShop yet"
          tone="empty"
          visual={noShopVisual}
        />
      </AppShell>
    )
  }

  return <>{children}</>
}
