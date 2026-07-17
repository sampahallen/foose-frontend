import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { IoReceiptOutline } from 'react-icons/io5'
import { RiDraftLine } from 'react-icons/ri'
import { withBasePath } from '../../utils/navigation'
import { Icon } from '../icons/Icon'

export type ShopManagementActivePanel = 'overview' | 'listings' | 'drafts' | 'sold' | 'orders' | 'settings'

type ShopManagementNavigationProps = {
  activePanel: ShopManagementActivePanel
  collapsed: boolean
  mobileClassName?: string
  onToggle: () => void
}

type NavigationItem = {
  activePanel?: ShopManagementActivePanel
  href: string
  icon: ReactNode
  label: string
  mobileLabel?: string
}

const primaryItems: NavigationItem[] = [
  { activePanel: 'overview', href: '/manage-shop', icon: <Icon name="store" />, label: 'Shop Management', mobileLabel: 'Overview' },
  { activePanel: 'listings', href: '/manage-shop/listings', icon: <Icon name="grid" />, label: 'Active listings', mobileLabel: 'Active' },
  { activePanel: 'drafts', href: '/manage-shop/drafts', icon: <RiDraftLine aria-hidden="true" />, label: 'Drafts' },
  { activePanel: 'sold', href: '/manage-shop/sold', icon: <IoReceiptOutline aria-hidden="true" />, label: 'Sold items', mobileLabel: 'Sold' },
  { activePanel: 'orders', href: '/manage-shop/orders', icon: <Icon name="box" />, label: 'Orders' },
]

const secondaryItems: NavigationItem[] = [
  { activePanel: 'settings', href: '/manage-shop/settings', icon: <Icon name="settings" />, label: 'Shop settings' },
]

function isActive(item: NavigationItem, activePanel: ShopManagementActivePanel) {
  return item.activePanel === activePanel
}

export function ShopManagementSidebar({
  activePanel,
  collapsed,
  onToggle,
}: Omit<ShopManagementNavigationProps, 'mobileClassName'>) {
  function navLink(item: NavigationItem) {
    const active = isActive(item, activePanel)
    return (
      <a
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition hover:bg-accent-light hover:text-accent ${active ? 'bg-accent text-white hover:bg-accent hover:text-white' : 'text-foose-muted'} ${collapsed ? 'justify-center' : ''}`}
        href={withBasePath(item.href)}
        key={item.href}
        title={collapsed ? item.label : undefined}
      >
        <span className="inline-flex size-5 shrink-0 items-center justify-center text-xl">{item.icon}</span>
        {!collapsed && <span>{item.label}</span>}
      </a>
    )
  }

  return (
    <aside className={`fixed left-4 top-20 z-30 hidden h-[calc(100dvh-6rem)] flex-col rounded-2xl border border-foose-border bg-foose-surface p-3 shadow-xl transition-all lg:flex ${collapsed ? 'w-18' : 'w-64'}`}>
      <button
        aria-label={collapsed ? 'Expand shop sidebar' : 'Collapse shop sidebar'}
        className="mb-4 inline-flex size-11 items-center justify-center self-end rounded-xl border border-foose-border bg-foose-surface-low text-foose-text transition hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        onClick={onToggle}
        type="button"
      >
        <Icon name="menu" />
      </button>
      <nav aria-label="Shop management" className="flex min-h-0 flex-1 flex-col justify-between gap-8 overflow-y-auto">
        <div className="flex flex-col gap-2">{primaryItems.map(navLink)}</div>
        <div className="flex flex-col gap-2 border-t border-foose-border pt-4">{secondaryItems.map(navLink)}</div>
      </nav>
    </aside>
  )
}

export function ShopManagementMobileNav({
  activePanel,
  className = '',
}: {
  activePanel: ShopManagementActivePanel
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const scroller = scrollRef.current
    const activeLink = scroller?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!scroller || !activeLink) return

    const centeredLeft = activeLink.offsetLeft - (scroller.clientWidth - activeLink.offsetWidth) / 2
    const left = Math.max(0, Math.min(centeredLeft, scroller.scrollWidth - scroller.clientWidth))
    scroller.scrollLeft = left
  }, [activePanel])

  return (
    <nav
      aria-label="Shop management"
      className={`sticky top-16 z-40 -mx-3 mb-5 border-b border-foose-border/80 bg-foose-bg/95 px-3 py-2 backdrop-blur md:-mx-6 md:px-6 lg:hidden ${className}`}
    >
      <div
        className="flex min-w-0 snap-x snap-mandatory scroll-px-3 items-center gap-2 overflow-x-auto overscroll-x-contain pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        {[...primaryItems, ...secondaryItems].map((item) => {
          const active = isActive(item, activePanel)
          return (
            <a
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 shrink-0 snap-start items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${active ? 'border-accent bg-accent text-white shadow-sm' : 'border-foose-border bg-foose-surface text-foose-muted hover:border-accent hover:text-accent'}`}
              href={withBasePath(item.href)}
              key={item.href}
            >
              <span className="inline-flex size-5 shrink-0 items-center justify-center text-lg">{item.icon}</span>
              <span>{item.mobileLabel || item.label}</span>
            </a>
          )
        })}
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-2 right-0 w-9 bg-gradient-to-l from-foose-bg via-foose-bg/95 to-transparent" />
    </nav>
  )
}

export function ShopManagementNavigation({
  activePanel,
  collapsed,
  mobileClassName = '',
  onToggle,
}: ShopManagementNavigationProps) {
  return (
    <>
      <ShopManagementSidebar activePanel={activePanel} collapsed={collapsed} onToggle={onToggle} />
      <ShopManagementMobileNav activePanel={activePanel} className={mobileClassName} />
    </>
  )
}
