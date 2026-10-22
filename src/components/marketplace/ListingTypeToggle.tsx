import { withBasePath } from '../../utils/navigation'

function modeHref(actionPath: string, mode: 'retail' | 'wholesale', search: string) {
  const query = new URLSearchParams(search)
  query.set('type', mode)
  query.delete('page')
  query.delete('limit')
  return withBasePath(`${actionPath}?${query.toString()}`)
}

export function ListingTypeToggle({
  actionPath,
  activeMode,
  search,
}: {
  actionPath: string
  activeMode: 'retail' | 'wholesale'
  search: string
}) {
  return (
    <nav aria-label="Browse listing type" className="mx-auto flex w-full max-w-2xl items-center justify-center rounded-full bg-foose-surface-low p-1">
      <div className="grid w-full grid-cols-2 gap-1 text-center text-sm font-black">
        <a aria-current={activeMode === 'retail' ? 'page' : undefined} className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-accent/25 ${activeMode === 'retail' ? 'bg-foose-surface text-accent shadow-sm' : 'text-foose-muted hover:text-accent'}`} href={modeHref(actionPath, 'retail', search)}>
          Retail
        </a>
        <a aria-current={activeMode === 'wholesale' ? 'page' : undefined} className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-accent/25 ${activeMode === 'wholesale' ? 'bg-foose-surface text-accent shadow-sm' : 'text-foose-muted hover:text-accent'}`} href={modeHref(actionPath, 'wholesale', search)}>
          Bale
        </a>
      </div>
    </nav>
  )
}
