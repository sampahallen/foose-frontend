import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { IoChevronDown, IoFunnelOutline } from 'react-icons/io5'
import { useFilterDropdownStore } from '../../stores/filterDropdownStore'
import { LISTING_BRANDS, LISTING_CATEGORIES, LISTING_COLORS, LISTING_CONDITIONS } from '../../utils/listingTaxonomy'
import { navigateTo, withBasePath } from '../../utils/navigation'

const dropdownControl =
  'h-11 w-full rounded-lg border border-accent/30 bg-accent-light/30 px-3 text-sm font-semibold text-foose-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15'
const topFilterControl =
  'inline-flex h-9 min-w-0 items-center justify-between gap-2 rounded-full border-0 bg-white px-3 text-xs font-bold text-foose-text outline-none ring-1 ring-foose-border transition hover:ring-accent focus:ring-2 focus:ring-accent/25'
const topInputControl =
  'h-9 min-w-0 rounded-full border-0 bg-white px-3 text-xs font-bold text-foose-text outline-none ring-1 ring-foose-border transition hover:ring-accent focus:ring-2 focus:ring-accent/25'

type TopFilterOption = {
  label: string
  swatch?: string
  value: string
}

function formQuery(form: HTMLFormElement) {
  const data = new FormData(form)
  const params = new URLSearchParams()

  data.forEach((value, key) => {
    const text = String(value || '').trim()
    if (text) params.set(key, text)
  })

  return params.toString()
}

function filterHref(actionPath: string, query: URLSearchParams, name: string, value: string) {
  const params = new URLSearchParams(query.toString())
  params.delete('page')

  if (value) {
    params.set(name, value)
  } else {
    params.delete(name)
  }

  const nextQuery = params.toString()
  return withBasePath(nextQuery ? `${actionPath}?${nextQuery}` : actionPath)
}

function TopFilterDropdown({
  actionPath,
  className = '',
  name,
  options,
  placeholder,
  query,
  value,
}: {
  actionPath: string
  className?: string
  name: string
  options: TopFilterOption[]
  placeholder: string
  query: URLSearchParams
  value?: string
}) {
  const closeDropdown = useFilterDropdownStore((store) => store.closeDropdown)
  const openDropdownId = useFilterDropdownStore((store) => store.openDropdownId)
  const toggleDropdown = useFilterDropdownStore((store) => store.toggleDropdown)
  const dropdownId = `${actionPath}:${name}`
  const isOpen = openDropdownId === dropdownId
  const selectedValue = value ?? query.get(name) ?? ''
  const selected = options.find((option) => option.value === selectedValue)
  const label = selected?.label || placeholder

  return (
    <div className={`top-filter-dropdown relative z-[80] shrink-0 ${className}`}>
      <button
        aria-expanded={isOpen}
        className={`${topFilterControl} w-full`}
        onClick={() => toggleDropdown(dropdownId)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.swatch && (
            <span aria-hidden className="inline-flex size-4 shrink-0 rounded-full border border-black/10" style={{ background: selected.swatch }} />
          )}
          <span className="truncate">{label}</span>
        </span>
        <IoChevronDown aria-hidden className={`shrink-0 text-sm text-accent transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-11 z-[120] max-h-80 w-56 overflow-y-auto rounded-xl border border-foose-border bg-white p-1 shadow-2xl [scrollbar-width:thin]">
          <a
            className={`flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-sm font-semibold text-foose-text transition hover:bg-accent-light ${!selectedValue ? 'bg-accent-light text-accent' : ''}`}
            href={filterHref(actionPath, query, name, '')}
            onClick={closeDropdown}
          >
            <span>{placeholder}</span>
            <span className={`size-4 rounded border ${!selectedValue ? 'border-accent bg-accent' : 'border-foose-border bg-white'}`} />
          </a>
          {options.map((option) => {
            const active = option.value === selectedValue
            return (
              <a
                className={`flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-sm font-semibold text-foose-text transition hover:bg-accent-light ${active ? 'bg-accent-light text-accent' : ''}`}
                href={filterHref(actionPath, query, name, option.value)}
                key={option.value}
                onClick={closeDropdown}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {option.swatch && (
                    <span aria-hidden className="inline-flex size-6 shrink-0 rounded-full border border-black/10" style={{ background: option.swatch }} />
                  )}
                  <span className="truncate">{option.label}</span>
                </span>
                <span className={`size-4 rounded border ${active ? 'border-accent bg-accent' : 'border-foose-border bg-white'}`} />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TopFilterBar({
  actionPath = '/browse',
  hidePriceAndSize = false,
  hideType = false,
  query = new URLSearchParams(window.location.search),
  resultLabel,
  resultLabelVariant = 'pill',
  showResultLabel = true,
}: {
  actionPath?: string
  hidePriceAndSize?: boolean
  hideType?: boolean
  query?: URLSearchParams
  resultLabel: string
  resultLabelVariant?: 'pill' | 'plain'
  showResultLabel?: boolean
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)
  const closeDropdown = useFilterDropdownStore((store) => store.closeDropdown)
  const typeOptions = [
    { label: 'Retail', value: 'retail' },
    { label: 'Wholesale', value: 'wholesale' },
  ]
  const categoryOptions = LISTING_CATEGORIES.map((category) => ({ label: category.label, value: category.label }))
  const brandOptions = LISTING_BRANDS.map((brand) => ({ label: brand, value: brand }))
  const colorOptions = LISTING_COLORS.map((color) => ({ label: color.label, swatch: color.hex, value: color.value }))
  const conditionOptions = LISTING_CONDITIONS.map((condition) => ({ label: condition[0].toUpperCase() + condition.slice(1), value: condition }))
  const sortOptions = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price high', value: 'price_desc' },
    { label: 'Price low', value: 'price_asc' },
    { label: 'Popular', value: 'popular' },
  ]

  function applyFilters(form: HTMLFormElement) {
    window.clearTimeout(debounceRef.current)
    const nextQuery = formQuery(form)
    navigateTo(nextQuery ? `${actionPath}?${nextQuery}` : actionPath)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    applyFilters(event.currentTarget)
  }

  function handleAutoApply(event: ChangeEvent<HTMLFormElement>) {
    const field = event.target
    if (!(field instanceof HTMLInputElement)) return

    const form = event.currentTarget
    if (['number', 'search', 'text'].includes(field.type)) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => applyFilters(form), 450)
      return
    }

    applyFilters(form)
  }

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target
      if (target instanceof Element && target.closest('.top-filter-dropdown')) return
      closeDropdown()
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDropdown()
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeDropdown])

  function renderControls() {
    return (
      <>
      {query.get('q') && <input name="q" type="hidden" value={query.get('q') || ''} />}
      {(['type', 'category', 'brand', 'color', 'condition', 'sort'] as const).map((name) => (
        query.get(name) ? <input key={name} name={name} type="hidden" value={query.get(name) || ''} /> : null
      ))}
      {showResultLabel && (
        <span className={resultLabelVariant === 'plain' ? 'shrink-0 px-1 text-sm font-black text-foose-text' : 'shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black text-accent ring-1 ring-accent/20'}>{resultLabel}</span>
      )}
      {!hideType && (
        <>
          <label htmlFor="filter-type">Type</label>
          <TopFilterDropdown actionPath={actionPath} className="w-[104px]" name="type" options={typeOptions} placeholder="All types" query={query} />
        </>
      )}
      <label htmlFor="filter-category">Category</label>
      <TopFilterDropdown actionPath={actionPath} className="w-[132px]" name="category" options={categoryOptions} placeholder="Category" query={query} />
      <label htmlFor="filter-brand">Brand</label>
      <TopFilterDropdown actionPath={actionPath} className="w-[112px]" name="brand" options={brandOptions} placeholder="Brand" query={query} />
      <label htmlFor="filter-color">Color</label>
      <TopFilterDropdown actionPath={actionPath} className="w-[104px]" name="color" options={colorOptions} placeholder="Color" query={query} />
      <label htmlFor="filter-condition">Condition</label>
      <TopFilterDropdown actionPath={actionPath} className="w-[108px]" name="condition" options={conditionOptions} placeholder="Condition" query={query} />
      {!hidePriceAndSize && (
        <>
          <label htmlFor="filter-size">Size</label>
          <input className={`${topInputControl} w-[66px]`} defaultValue={query.get('size') || ''} id="filter-size" name="size" placeholder="Size" />
          <label htmlFor="filter-min-price">Min price</label>
          <input className={`${topInputControl} w-[90px]`} defaultValue={query.get('minPrice') || ''} id="filter-min-price" min="0" name="minPrice" placeholder="Min GHC" type="number" />
          <label htmlFor="filter-max-price">Max price</label>
          <input className={`${topInputControl} w-[92px]`} defaultValue={query.get('maxPrice') || ''} id="filter-max-price" min="0" name="maxPrice" placeholder="Max GHC" type="number" />
        </>
      )}
      <label htmlFor="filter-sort">Sort</label>
      <TopFilterDropdown actionPath={actionPath} className="w-[116px]" name="sort" options={sortOptions} placeholder="Sort" query={query} value={query.get('sort') || 'newest'} />
      <a className="ml-auto inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-white px-3 text-xs font-black text-accent ring-1 ring-accent/20 transition hover:bg-accent hover:text-white" href={withBasePath(actionPath)}>
        Clear
      </a>
      </>
    )
  }

  const formProps = {
    action: withBasePath(actionPath),
    key: query.toString(),
    method: 'get',
    onChange: handleAutoApply,
    onSubmit: handleSubmit,
  } as const

  return (
    <>
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-black text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover lg:hidden"
        onClick={() => setDrawerOpen(true)}
        type="button"
      >
        <IoFunnelOutline /> Filters
      </button>
      <form
        {...formProps}
        className="top-filter-bar relative z-[70] hidden w-full flex-wrap items-center gap-2 rounded-2xl bg-accent-light/70 p-2 shadow-sm backdrop-blur lg:flex lg:flex-nowrap [&_label]:sr-only"
      >
        {renderControls()}
      </form>
      {drawerOpen && (
        <div className="fixed inset-0 z-100 lg:hidden">
          <button aria-label="Close filters" className="absolute inset-0 bg-black/45" onClick={() => setDrawerOpen(false)} type="button" />
          <aside className="absolute left-0 top-0 h-full w-[min(22rem,88vw)] overflow-y-auto bg-foose-surface p-4 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-foose-text">Filters</h2>
              <button className="inline-flex size-9 items-center justify-center rounded-full border border-foose-border bg-white text-foose-text" onClick={() => setDrawerOpen(false)} type="button">
                x
              </button>
            </div>
            <form
              {...formProps}
              className="top-filter-bar relative z-[70] flex w-full flex-col items-stretch gap-3 rounded-2xl bg-accent-light/60 p-3 shadow-sm [&_.top-filter-dropdown]:w-full [&_.top-filter-dropdown_button]:h-11 [&_.top-filter-dropdown_button]:rounded-xl [&_a.ml-auto]:ml-0 [&_a.ml-auto]:w-full [&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:px-4 [&_label]:sr-only"
            >
              {renderControls()}
            </form>
          </aside>
        </div>
      )}
    </>
  )
}

export function FilterPanel({
  actionPath = '/browse',
  query = new URLSearchParams(window.location.search),
}: {
  actionPath?: string
  query?: URLSearchParams
}) {
  const selectedColor = LISTING_COLORS.find((color) => color.value === query.get('color'))

  return (
    <form action={withBasePath(actionPath)} className="filter-panel sticky top-44 flex max-h-[calc(100dvh-12rem)] flex-col gap-4 overflow-y-auto rounded-xl border border-foose-border bg-foose-surface p-4 [scrollbar-width:thin] [&_h2]:font-display [&_h2]:text-xl [&_fieldset]:border-0 [&_fieldset]:p-0 [&_legend]:text-sm [&_legend]:font-semibold [&_legend]:text-foose-text [&_label]:flex [&_label]:items-center [&_label]:gap-2 [&_label]:py-1 [&_label]:text-sm [&_label]:text-foose-muted [&_input[type='range']]:w-full [&_input[type='range']]:accent-accent [&_.button]:w-full" method="get">
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
        <select className={dropdownControl} defaultValue={query.get('category') || ''} name="category">
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
            {condition[0].toUpperCase() + condition.slice(1)}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Color</legend>
        <details className="group relative">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-light/30 px-3 text-sm font-semibold text-foose-text transition hover:border-accent group-open:border-accent [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              {selectedColor && (
                <span
                  aria-hidden
                  className="inline-flex size-5 shrink-0 rounded-full border border-black/10"
                  style={{ background: selectedColor.hex }}
                />
              )}
              <span className="truncate">{selectedColor?.label || 'All colors'}</span>
            </span>
            <IoChevronDown aria-hidden className="text-accent transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 right-0 top-12 z-20 max-h-72 overflow-y-auto rounded-xl border border-foose-border bg-white p-1 shadow-xl [scrollbar-width:thin]">
            <label className="justify-between rounded-lg px-3 py-2 hover:bg-accent-light">
              <span className="font-semibold text-foose-text">All colors</span>
              <input defaultChecked={!query.get('color')} name="color" type="radio" value="" />
            </label>
          {LISTING_COLORS.map((color) => (
            <label className="justify-between rounded-lg px-3 py-2 hover:bg-accent-light" key={color.value}>
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-flex size-6 rounded-full border border-black/10"
                  style={{ background: color.hex }}
                />
                {color.label}
              </span>
              <input defaultChecked={query.get('color') === color.value} name="color" type="radio" value={color.value} />
            </label>
          ))}
          </div>
        </details>
      </fieldset>
      <fieldset>
        <legend>Price (GHS)</legend>
        <input aria-label="Minimum price" defaultValue={query.get('minPrice') || ''} name="minPrice" placeholder="Min GHC" type="number" />
        <input aria-label="Maximum price" defaultValue={query.get('maxPrice') || ''} name="maxPrice" placeholder="Max GHC" type="number" />
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
