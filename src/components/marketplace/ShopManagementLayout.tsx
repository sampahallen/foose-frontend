import type { ReactNode } from 'react'
import { useShopManagementLayoutStore } from '../../stores/shopManagementLayoutStore'
import { AppShell } from '../layout/AppShell'
import { ShopManagementMobileNav, ShopManagementSidebar, type ShopManagementActivePanel } from './ShopManagementNavigation'

export function ShopManagementLayout({
  activePanel,
  children,
  fab,
  searchPlaceholder = 'Search marketplace...',
}: {
  activePanel: ShopManagementActivePanel
  children: ReactNode
  fab?: ReactNode
  searchPlaceholder?: string
}) {
  const collapsed = useShopManagementLayoutStore((state) => state.collapsed)
  const toggle = useShopManagementLayoutStore((state) => state.toggle)

  return (
    <AppShell active="shop" searchPlaceholder={searchPlaceholder} showFooter={false}>
      <ShopManagementSidebar activePanel={activePanel} collapsed={collapsed} onToggle={toggle} />
      <div className={`${collapsed ? 'lg:pl-24' : 'lg:pl-72'} min-w-0 pb-16 lg:pb-0`}>
        <ShopManagementMobileNav activePanel={activePanel} />
        {children}
      </div>
      {fab}
    </AppShell>
  )
}
