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
    <nav aria-label="Browse listing type" className="mx-auto flex w-full max-w-2xl items-center justify-center rounded-2xl border border-foose-border bg-foose-bg/95 px-3 py-2 shadow-sm backdrop-blur">
      <div className="flex w-full max-w-sm items-center justify-between gap-4 text-sm font-black">
        <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'retail' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref(actionPath, 'retail', search)}>
          Retail
        </a>
        <a className={`border-b-2 px-4 py-2 transition ${activeMode === 'wholesale' ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-accent'}`} href={modeHref(actionPath, 'wholesale', search)}>
          Bale
        </a>
      </div>
    </nav>
  )
}
