import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { IoFunnelOutline } from 'react-icons/io5'
import { GHANA_REGION_OPTIONS } from '../../utils/ghanaRegions'
import {
  LISTING_BALE_GRADES,
  LISTING_BRANDS,
  LISTING_COLORS,
  LISTING_CONDITIONS,
  LISTING_FITS,
  LISTING_MATERIALS,
  LISTING_PATTERNS,
  categoryUsesField,
  normalizeCategorySelection,
  optionLabel,
  sizeLabelForCategory,
  sizePlaceholderForCategory,
} from '../../utils/listingTaxonomy'
import { navigateTo, withBasePath } from '../../utils/navigation'
import { SelectControl } from '../ui/SelectControl'
import { ListingCategoryPicker } from './ListingCategoryPicker'
import { PriceRangeFilter } from './PriceRangeFilter'

type FilterOption = { label: string; value: string }
type DrawerState = 'closed' | 'closing' | 'open' | 'opening'

const transitionMs = 300
const controlClass = 'h-11 w-full rounded-xl border border-foose-border bg-white px-3 text-sm font-semibold text-foose-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15'
function availableLocations(options: FilterOption[], selected: string) {
  const defaults = GHANA_REGION_OPTIONS
  if (!selected || defaults.some((option) => option.value === selected)) return defaults
  return [...defaults, options.find((option) => option.value === selected) || { label: selected, value: selected }]
}

function clearHref(actionPath: string, query: URLSearchParams, preserveType: boolean) {
  const next = new URLSearchParams()
  const search = query.get('q')?.trim()
  const type = query.get('type')?.trim()
  if (search) next.set('q', search)
  if (preserveType && type) next.set('type', type)
  const value = next.toString()
  return withBasePath(value ? `${actionPath}?${value}` : actionPath)
}

function optionElements(options: readonly string[]) {
  return options.map((value) => <option key={value} value={value}>{optionLabel(value)}</option>)
}

export function MarketplaceFilters({
  actionPath,
  desktopOnly = false,
  hideType = false,
  locationOptions = [],
  query,
}: {
  actionPath: string
  desktopOnly?: boolean
  hideType?: boolean
  locationOptions?: FilterOption[]
  query: URLSearchParams
}) {
  const [drawerState, setDrawerState] = useState<DrawerState>('closed')
  const initialSelection = normalizeCategorySelection(query.get('category') || '', query.get('subcategory') || '')
  const [selectedCategory, setSelectedCategory] = useState(initialSelection.category)
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialSelection.subcategory)
  const [selectedType, setSelectedType] = useState(query.get('type') || '')
  const drawerId = useId()
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerPanelRef = useRef<HTMLElement | null>(null)
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null)
  const exitTimerRef = useRef<number | undefined>(undefined)
  const drawerMounted = drawerState !== 'closed'
  const drawerVisible = drawerState === 'open'
  const selectedLocation = query.get('location') || ''
  const locations = availableLocations(locationOptions, selectedLocation)

  const openDrawer = useCallback(() => {
    window.clearTimeout(exitTimerRef.current)
    setDrawerState('opening')
  }, [])

  const closeDrawer = useCallback(() => {
    window.clearTimeout(exitTimerRef.current)
    setDrawerState('closing')
    exitTimerRef.current = window.setTimeout(() => {
      setDrawerState('closed')
      drawerTriggerRef.current?.focus()
    }, transitionMs)
  }, [])

  useEffect(() => {
    if (drawerState !== 'opening') return
    const frame = window.requestAnimationFrame(() => {
      setDrawerState('open')
      closeButtonRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [drawerState])

  useEffect(() => {
    if (!drawerMounted) return
    const previousOverflow = document.body.style.overflow
    const desktopViewport = window.matchMedia('(min-width: 1024px)')
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDrawer()
        return
      }
      if (event.key !== 'Tab' || !drawerPanelRef.current) return
      const focusable = Array.from(drawerPanelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    function closeAtDesktop(event: MediaQueryListEvent) {
      if (event.matches) closeDrawer()
    }

    document.addEventListener('keydown', handleKeyDown)
    desktopViewport.addEventListener('change', closeAtDesktop)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      desktopViewport.removeEventListener('change', closeAtDesktop)
    }
  }, [closeDrawer, drawerMounted])

  useEffect(() => () => window.clearTimeout(exitTimerRef.current), [])

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params = new URLSearchParams()
    data.forEach((value, key) => {
      const text = String(value || '').trim()
      if (text) params.set(key, text)
    })
    navigateTo(params.size ? `${actionPath}?${params.toString()}` : actionPath)
  }

  function renderForm(idPrefix: string, className: string) {
    const show = (field: Parameters<typeof categoryUsesField>[1]) =>
      categoryUsesField(selectedCategory, field, selectedSubcategory, selectedType)
    return (
      <form action={withBasePath(actionPath)} className={className} key={`${idPrefix}-${query.toString()}`} method="get" onSubmit={submitFilters}>
        {query.get('q') && <input name="q" type="hidden" value={query.get('q') || ''} />}
        {hideType && query.get('type') && <input name="type" type="hidden" value={query.get('type') || ''} />}
        {query.get('sort') && <input name="sort" type="hidden" value={query.get('sort') || ''} />}
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-foose-text">Filters</h2>
          <a className="text-sm font-black text-accent hover:text-accent-hover" href={clearHref(actionPath, query, hideType)}>Clear all</a>
        </div>

        {!hideType && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-type`}>
            Listing type
            <SelectControl className={controlClass} id={`${idPrefix}-type`} name="type" onChange={(event) => setSelectedType(event.target.value)} value={selectedType} variant="filter">
              <option value="">All types</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
            </SelectControl>
          </label>
        )}

        <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-category`}>
          Category
          <ListingCategoryPicker
            category={selectedCategory}
            id={`${idPrefix}-category`}
            onChange={(selection) => {
              setSelectedCategory(selection.category)
              setSelectedSubcategory(selection.subcategory)
            }}
            placeholder="All categories"
            subcategory={selectedSubcategory}
            variant="filter"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-location`}>
          Location
          <SelectControl className={controlClass} defaultValue={selectedLocation} id={`${idPrefix}-location`} name="location" variant="filter">
            <option value="">All locations</option>
            {locations.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectControl>
        </label>

        {show('brand') && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-brand`}>
            Brand
            <SelectControl className={controlClass} defaultValue={query.get('brand') || ''} id={`${idPrefix}-brand`} name="brand" variant="filter">
              <option value="">All brands</option>
              {LISTING_BRANDS.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </SelectControl>
          </label>
        )}

        {show('size') && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-size`}>
            {sizeLabelForCategory(selectedCategory, selectedSubcategory)}
            <input className={controlClass} defaultValue={query.get('size') || ''} id={`${idPrefix}-size`} name="size" placeholder={sizePlaceholderForCategory(selectedCategory, selectedSubcategory)} />
          </label>
        )}

        {show('gender') && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-gender`}>
            Gender
            <SelectControl className={controlClass} defaultValue={query.get('gender') || ''} id={`${idPrefix}-gender`} name="gender" variant="filter">
              <option value="">All</option>
              {optionElements(['men', 'women', 'unisex', 'kids'])}
            </SelectControl>
          </label>
        )}

        {show('material') && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-material`}>
            Material
            <SelectControl className={controlClass} defaultValue={query.get('material') || ''} id={`${idPrefix}-material`} name="material" variant="filter">
              <option value="">All materials</option>
              {optionElements(LISTING_MATERIALS)}
            </SelectControl>
          </label>
        )}

        {show('fit') && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-fit`}>
            Fit
            <SelectControl className={controlClass} defaultValue={query.get('fit') || ''} id={`${idPrefix}-fit`} name="fit" variant="filter">
              <option value="">All fits</option>
              {optionElements(LISTING_FITS)}
            </SelectControl>
          </label>
        )}

        {show('pattern') && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-pattern`}>
            Pattern
            <SelectControl className={controlClass} defaultValue={query.get('pattern') || ''} id={`${idPrefix}-pattern`} name="pattern" variant="filter">
              <option value="">All patterns</option>
              {optionElements(LISTING_PATTERNS)}
            </SelectControl>
          </label>
        )}

        {show('baleGrade') && (
          <label className="grid gap-1.5 text-sm font-bold text-foose-text" htmlFor={`${idPrefix}-bale-grade`}>
            Bale grade
            <SelectControl className={controlClass} defaultValue={query.get('baleGrade') || ''} id={`${idPrefix}-bale-grade`} name="baleGrade" variant="filter">
              <option value="">All grades</option>
              {optionElements(LISTING_BALE_GRADES)}
            </SelectControl>
          </label>
        )}

        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-sm font-bold text-foose-text">Condition</legend>
          <SelectControl className={controlClass} defaultValue={query.get('condition') || ''} name="condition" variant="filter">
            <option value="">All conditions</option>
            {LISTING_CONDITIONS.map((condition) => <option key={condition} value={condition}>{optionLabel(condition)}</option>)}
          </SelectControl>
        </fieldset>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-sm font-bold text-foose-text">Color</legend>
          <SelectControl aria-label="Color" className={controlClass} defaultValue={query.get('color') || ''} id={`${idPrefix}-color`} name="color" variant="filter">
            <option value="">All colors</option>
            {LISTING_COLORS.map((color) => <option data-swatch={color.hex} key={color.value} value={color.value}>{color.label}</option>)}
          </SelectControl>
        </fieldset>

        <PriceRangeFilter defaultMax={query.get('maxPrice') || ''} defaultMin={query.get('minPrice') || ''} idPrefix={`${idPrefix}-price`} />

        <button className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-black text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover" type="submit">Apply filters</button>
      </form>
    )
  }

  return (
    <>
      <button aria-controls={drawerId} aria-expanded={drawerVisible} className={`${desktopOnly ? 'hidden' : 'inline-flex lg:hidden'} min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-black text-white shadow-md shadow-accent/15`} onClick={openDrawer} ref={drawerTriggerRef} type="button">
        <IoFunnelOutline /> Filters
      </button>
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        {renderForm('desktop', 'flex min-h-[calc(100dvh-7rem)] max-h-[calc(100dvh-7rem)] flex-col gap-4 overflow-y-auto rounded-2xl border border-foose-border/80 bg-foose-surface p-4 shadow-sm [scrollbar-width:thin]')}
      </aside>
      {drawerMounted && createPortal(
        <div className="fixed inset-0 z-[1000] lg:hidden">
          <button aria-label="Close filters" className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ease-out motion-reduce:transition-none ${drawerVisible ? 'opacity-100' : 'opacity-0'}`} onClick={closeDrawer} type="button" />
          <aside aria-labelledby={`${drawerId}-title`} aria-modal="true" className={`absolute left-0 top-0 z-10 h-full w-[min(22rem,88vw)] overflow-y-auto bg-foose-surface p-4 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${drawerVisible ? 'translate-x-0' : '-translate-x-full'}`} id={drawerId} ref={drawerPanelRef} role="dialog" tabIndex={-1}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="sr-only" id={`${drawerId}-title`}>Marketplace filters</h2>
              <span className="font-display text-xl font-semibold">Marketplace</span>
              <button aria-label="Close filters" className="inline-flex size-11 items-center justify-center rounded-full border border-foose-border bg-white text-xl" onClick={closeDrawer} ref={closeButtonRef} type="button">×</button>
            </div>
            {renderForm('mobile', 'flex w-full flex-col gap-4')}
          </aside>
        </div>,
        document.body,
      )}
    </>
  )
}
