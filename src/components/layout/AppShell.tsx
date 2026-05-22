import type { ReactNode } from 'react'
import { BottomTabs } from './BottomTabs'
import { TopNav } from './TopNav'

export function AppShell({
  active,
  children,
  searchPlaceholder,
  flush = false,
}: {
  active?: 'home' | 'browse' | 'community' | 'profile' | 'saved'
  children: ReactNode
  searchPlaceholder?: string
  flush?: boolean
}) {
  return (
    <>
      <TopNav active={active} searchPlaceholder={searchPlaceholder} />
      <main className={flush ? '' : 'page'}>{children}</main>
      <BottomTabs active={active} />
    </>
  )
}
