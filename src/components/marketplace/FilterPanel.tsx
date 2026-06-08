import { LISTING_BRANDS, LISTING_CATEGORIES, LISTING_CONDITIONS } from '../../utils/listingTaxonomy'
import { withBasePath } from '../../utils/navigation'

export function FilterPanel({
  actionPath = '/browse',
  query = new URLSearchParams(window.location.search),
}: {
  actionPath?: string
  query?: URLSearchParams
}) {
  return (
    <form action={withBasePath(actionPath)} className="filter-panel sticky top-24 flex flex-col gap-4 rounded-xl border border-foose-border bg-foose-surface p-4 [&_h2]:font-display [&_h2]:text-xl [&_fieldset]:border-0 [&_fieldset]:p-0 [&_legend]:text-sm [&_legend]:font-semibold [&_legend]:text-foose-text [&_label]:flex [&_label]:items-center [&_label]:gap-2 [&_label]:py-1 [&_label]:text-sm [&_label]:text-foose-muted [&_input[type='range']]:w-full [&_input[type='range']]:accent-accent [&_.button]:w-full" method="get">
      <h2>Filters</h2>
      <fieldset>
        <legend>Listing type</legend>
        <label>
          <input defaultChecked={query.get('type') === 'retail'} name="type" type="radio" value="retail" />
          Retail
        </label>
        <label>
          <input defaultChecked={query.get('type') === 'wholesale'} name="type" type="radio" value="wholesale" />
          Wholesale
        </label>
      </fieldset>
      <fieldset>
        <legend>Category</legend>
        <select defaultValue={query.get('category') || ''} name="category">
          <option value="">All categories</option>
          {LISTING_CATEGORIES.map((category) => (
            <option key={category.label} value={category.label}>
              {category.label}
            </option>
          ))}
        </select>
      </fieldset>
      <fieldset>
        <legend>Brand</legend>
        <input defaultValue={query.get('brand') || ''} list="filter-brands" name="brand" placeholder="Nike, Adidas, Levi's..." />
        <datalist id="filter-brands">
          {LISTING_BRANDS.map((brand) => (
            <option key={brand} value={brand} />
          ))}
        </datalist>
      </fieldset>
      <fieldset>
        <legend>Condition</legend>
        {LISTING_CONDITIONS.map((condition) => (
          <label key={condition}>
            <input defaultChecked={query.get('condition') === condition} name="condition" type="radio" value={condition} />
            {condition === 'new' ? 'New' : 'Used'}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Price (GHS)</legend>
        <input aria-label="Minimum price" defaultValue={query.get('minPrice') || ''} name="minPrice" placeholder="Min" type="number" />
        <input aria-label="Maximum price" defaultValue={query.get('maxPrice') || ''} name="maxPrice" placeholder="Max" type="number" />
      </fieldset>
      <fieldset>
        <legend>Size</legend>
        <input defaultValue={query.get('size') || ''} name="size" placeholder="S, M, XL..." />
      </fieldset>
      <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" type="submit">
        Apply Filters
      </button>
      <a className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" href={withBasePath(actionPath)}>
        Clear All
      </a>
    </form>
  )
}
