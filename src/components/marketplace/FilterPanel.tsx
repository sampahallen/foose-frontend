import { LISTING_BRANDS, LISTING_CATEGORIES, LISTING_CONDITIONS } from '../../utils/listingTaxonomy'

export function FilterPanel({
  actionPath = '/browse',
  query = new URLSearchParams(window.location.search),
}: {
  actionPath?: string
  query?: URLSearchParams
}) {
  return (
    <form action={actionPath} className="filter-panel" method="get">
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
      <button className="button button-primary" type="submit">
        Apply Filters
      </button>
      <a className="button button-secondary" href={actionPath}>
        Clear All
      </a>
    </form>
  )
}
