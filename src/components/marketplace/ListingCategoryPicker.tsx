import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'
import { LISTING_CATEGORIES } from '../../utils/listingTaxonomy'

type CategorySelection = {
  category: string
  subcategory: string
}

export function ListingCategoryPicker({
  category,
  className = '',
  id,
  onChange,
  placeholder = 'Select category',
  subcategory,
  variant = 'default',
}: {
  category: string
  className?: string
  id: string
  onChange: (selection: CategorySelection) => void
  placeholder?: string
  subcategory: string
  variant?: 'default' | 'filter'
}) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')
  const [menuPosition, setMenuPosition] = useState({ left: 8, top: 8, width: 224 })
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const label = category ? `${category}${subcategory ? ` ← ${subcategory}` : ''}` : placeholder

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function choose(nextCategory: string, nextSubcategory = '') {
    onChange({ category: nextCategory, subcategory: nextSubcategory })
    setActiveCategory(nextCategory)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function showMenu() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(240, (window.innerWidth - 24) / 2)
    setMenuPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width * 2 - 8)),
      top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 330)),
      width,
    })
    setActiveCategory('')
    setOpen(true)
  }

  function showSubcategoriesOnHover(categoryLabel: string) {
    if (typeof window.matchMedia !== 'function') return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    setActiveCategory(categoryLabel)
  }

  function openWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return
    event.preventDefault()
    showMenu()
  }

  return (
    <>
      <input name="category" type="hidden" value={category} />
      <input name="subcategory" type="hidden" value={subcategory} />
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${variant === 'filter' ? 'h-11 rounded-xl' : 'h-12 rounded-lg'} flex w-full items-center justify-between gap-3 border border-foose-border bg-foose-surface px-3 text-left text-sm font-semibold text-foose-text outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15 ${className}`}
        id={id}
        onClick={() => {
          if (open) setOpen(false)
          else showMenu()
        }}
        onKeyDown={openWithKeyboard}
        ref={buttonRef}
        type="button"
      >
        <span className={`truncate ${category ? '' : 'text-foose-muted'}`}>{label}</span>
        <FaChevronDown aria-hidden className={`shrink-0 text-xs text-accent transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          className="fixed z-[1400] rounded-xl border border-foose-border bg-foose-surface p-1 shadow-2xl"
          ref={menuRef}
          role="menu"
          style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
        >
          <button
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold text-foose-muted hover:bg-accent-light hover:text-accent"
            onClick={() => choose('', '')}
            role="menuitem"
            type="button"
          >
            {placeholder}
          </button>
          {LISTING_CATEGORIES.map((item, index) => {
            const expanded = activeCategory === item.label
            const hasSubcategories = item.subcategories.length > 0
            return (
              <div
                className="relative"
                key={item.label}
                onMouseEnter={() => showSubcategoriesOnHover(item.label)}
              >
                <button
                  aria-expanded={hasSubcategories ? expanded : undefined}
                  aria-haspopup={hasSubcategories ? 'menu' : undefined}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-bold transition hover:bg-accent-light hover:text-accent ${category === item.label ? 'bg-accent-light text-accent' : 'text-foose-text'}`}
                  onClick={() => hasSubcategories ? setActiveCategory(item.label) : choose(item.label)}
                  onFocus={() => setActiveCategory(item.label)}
                  role="menuitem"
                  type="button"
                >
                  <span>{item.label}</span>
                  {hasSubcategories && <FaChevronRight aria-hidden className="shrink-0 text-xs text-accent" />}
                </button>
                {hasSubcategories && expanded && (
                  <div
                    className="absolute left-full z-10 ml-1 max-h-[70vh] overflow-y-auto rounded-xl border border-foose-border bg-foose-surface p-1 shadow-2xl [scrollbar-width:thin]"
                    role="menu"
                    style={{ top: -(index + 1) * 44, width: menuPosition.width }}
                  >
                    <button
                      className={`flex min-h-11 w-full items-center rounded-lg px-4 text-left text-sm font-black transition hover:bg-accent-light hover:text-accent ${category === item.label && !subcategory ? 'bg-accent-light text-accent' : 'text-foose-muted'}`}
                      onClick={() => choose(item.label)}
                      role="menuitem"
                      type="button"
                    >
                      All {item.label}
                    </button>
                    {item.subcategories.map((child) => (
                      <button
                        className={`flex min-h-10 w-full items-center rounded-lg py-2 pl-7 pr-3 text-left text-sm font-semibold transition hover:bg-accent-light hover:text-accent ${subcategory === child ? 'bg-accent-light text-accent' : 'text-foose-text'}`}
                        key={child}
                        onClick={() => choose(item.label, child)}
                        role="menuitem"
                        type="button"
                      >
                        {child}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
