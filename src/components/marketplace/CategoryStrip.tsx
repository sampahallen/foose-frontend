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
    <section className="category-strip browse-category-strip" aria-label="Listing categories">
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
