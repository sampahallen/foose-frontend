import { LISTING_CATEGORIES } from '../../utils/listingTaxonomy'
import { withBasePath } from '../../utils/navigation'

export function CategoryStrip({
  basePath = '/browse',
  query = new URLSearchParams(window.location.search),
}: {
  basePath?: string
  query?: URLSearchParams
}) {
  function categoryHref(category?: string) {
    const nextQuery = new URLSearchParams(query)
    if (category) {
      nextQuery.set('category', category)
    } else {
      nextQuery.delete('category')
    }
    nextQuery.set('page', '1')

    const queryString = nextQuery.toString()
    return withBasePath(queryString ? `${basePath}?${queryString}` : basePath)
  }

  const activeCategory = query.get('category') || ''

  return (
    <section className="category-strip mx-auto w-full max-w-[1280px] flex gap-2 overflow-x-auto border-b border-foose-border px-4 py-4 [scrollbar-width:thin] md:px-6 [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-foose-border [&_button]:bg-foose-surface-low [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-foose-muted [&_button]:transition [&_button]:hover:border-accent [&_button]:hover:text-accent [&_a]:shrink-0 [&_a]:rounded-full [&_a]:border [&_a]:border-foose-border [&_a]:bg-foose-surface-low [&_a]:px-4 [&_a]:py-2 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-foose-muted [&_a]:transition [&_a]:hover:border-accent [&_a]:hover:text-accent [&_button.active]:border-accent [&_button.active]:bg-accent [&_button.active]:text-white [&_a.active]:border-accent [&_a.active]:bg-accent [&_a.active]:text-white browse-category-strip mb-6 rounded-xl border bg-foose-surface" aria-label="Listing categories">
      <a className={!activeCategory ? 'active' : ''} href={categoryHref()}>
        All
      </a>
      {LISTING_CATEGORIES.slice(0, 14).map((category) => (
        <a className={activeCategory === category.label ? 'active' : ''} href={categoryHref(category.label)} key={category.label}>
          {category.label}
        </a>
      ))}
    </section>
  )
}
