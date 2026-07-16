import type { ReactNode } from 'react'
import { BottomTabs } from './BottomTabs'
import { Footer } from './Footer'
import { TopNav } from './TopNav'

export function AppShell({
  active,
  children,
  compactImmersive = false,
  searchPlaceholder,
  flush = false,
  showFooter = true,
}: {
  active?: 'home' | 'browse' | 'community' | 'profile' | 'saved'
  children: ReactNode
  compactImmersive?: boolean
  searchPlaceholder?: string
  flush?: boolean
  showFooter?: boolean
}) {
  return (
    <>
      <TopNav active={active} className={compactImmersive ? 'max-xl:hidden' : ''} searchPlaceholder={searchPlaceholder} />
      <main className={flush ? '' : 'page mx-auto w-full max-w-[1280px] px-4 pb-24 pt-8 md:px-6 lg:px-8 max-md:px-3 max-md:pt-5'}>{children}</main>
      {showFooter && <Footer />}
      {!compactImmersive && <BottomTabs active={active} />}
    </>
  )
}
