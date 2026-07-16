import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

type SelectOption = {
  disabled: boolean
  label: string
  value: string
}

export type SelectControlProps = ComponentPropsWithoutRef<'select'> & {
  variant?: 'default' | 'filter'
}

export function DropdownChevron({ className = '', open = false }: { className?: string; open?: boolean }) {
  const Chevron = open ? FaChevronUp : FaChevronDown

  return <Chevron aria-hidden className={className} />
}

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children)
  return ''
}

function selectOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<ComponentPropsWithoutRef<'option'>>(child) || child.type !== 'option') return []

    const label = nodeText(child.props.children).trim()
    return [{
      disabled: Boolean(child.props.disabled),
      label,
      value: child.props.value === undefined ? label : String(child.props.value),
    }]
  })
}

function menuPosition(button: HTMLButtonElement): CSSProperties {
  const rect = button.getBoundingClientRect()
  const viewportPadding = 8
  const menuGap = 6
  const belowSpace = window.innerHeight - rect.bottom - viewportPadding
  const aboveSpace = rect.top - viewportPadding
  const opensAbove = belowSpace < 180 && aboveSpace > belowSpace
  const availableSpace = opensAbove ? aboveSpace : belowSpace
  const width = Math.min(Math.max(rect.width, 160), window.innerWidth - viewportPadding * 2)
  const left = Math.min(
    Math.max(rect.left, viewportPadding),
    Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
  )

  return {
    bottom: opensAbove ? window.innerHeight - rect.top + menuGap : undefined,
    left,
    maxHeight: Math.max(96, Math.min(288, availableSpace - menuGap)),
    top: opensAbove ? undefined : rect.bottom + menuGap,
    width,
  }
}

function nextEnabledOption(options: SelectOption[], current: number, direction: 1 | -1) {
  if (!options.length) return -1

  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (current + direction * offset + options.length) % options.length
    if (!options[index]?.disabled) return index
  }

  return -1
}

function normalizedValue(options: SelectOption[], candidate: unknown) {
  const value = String(candidate ?? '')
  if (options.some((option) => option.value === value)) return value
  return options.find((option) => !option.disabled)?.value ?? ''
}

export function SelectControl(props: SelectControlProps) {
  const options = selectOptions(props.children)
  const optionKey = options.map((option) => `${option.value}:${option.label}:${option.disabled}`).join('|')
  const resetKey = props.value === undefined ? `${String(props.defaultValue ?? '')}:${optionKey}` : 'controlled'

  return <SelectControlState {...props} key={resetKey} options={options} />
}

function SelectControlState({
  children,
  className = '',
  defaultValue,
  disabled = false,
  id,
  onChange,
  onInvalid,
  options,
  required,
  value,
  variant = 'default',
  ...nativeProps
}: SelectControlProps & { options: SelectOption[] }) {
  const initialValue = normalizedValue(options, value ?? defaultValue)
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState<CSSProperties | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const nativeSelectRef = useRef<HTMLSelectElement | null>(null)
  const typeaheadRef = useRef('')
  const typeaheadTimerRef = useRef<number | undefined>(undefined)
  const generatedId = useId()
  const buttonId = id || `select-${generatedId}`
  const listboxId = `${buttonId}-options`
  const selectedValue = normalizedValue(options, value === undefined ? uncontrolledValue : value)
  const selectedOption = options.find((option) => option.value === selectedValue)
  const selectedLabel = selectedOption?.label || selectedValue || options[0]?.label || 'Select an option'
  const selectedIndex = options.findIndex((option) => option.value === selectedValue)

  function closeMenu({ focus = false } = {}) {
    window.clearTimeout(typeaheadTimerRef.current)
    typeaheadRef.current = ''
    setOpen(false)
    setActiveIndex(-1)
    if (focus) window.requestAnimationFrame(() => buttonRef.current?.focus())
  }

  function openMenu() {
    if (disabled || !buttonRef.current) return
    setPosition(menuPosition(buttonRef.current))
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabledOption(options, -1, 1))
    setOpen(true)
  }

  function selectValue(nextValue: string) {
    if (disabled) return
    const select = nativeSelectRef.current
    if (!select) return

    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set
    if (valueSetter) valueSetter.call(select, nextValue)
    else select.value = nextValue
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))
    closeMenu({ focus: true })
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      if (!open) {
        openMenu()
        return
      }
      setActiveIndex((current) => nextEnabledOption(options, current, direction))
      return
    }

    if (event.key === 'Home' && open) {
      event.preventDefault()
      setActiveIndex(nextEnabledOption(options, -1, 1))
      return
    }

    if (event.key === 'End' && open) {
      event.preventDefault()
      setActiveIndex(nextEnabledOption(options, 0, -1))
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      const option = options[activeIndex]
      if (option && !option.disabled) selectValue(option.value)
      return
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault()
      closeMenu()
    }

    if (event.key === 'Tab' && open) closeMenu()

    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      window.clearTimeout(typeaheadTimerRef.current)
      typeaheadRef.current += event.key.toLocaleLowerCase()
      typeaheadTimerRef.current = window.setTimeout(() => {
        typeaheadRef.current = ''
      }, 600)

      const repeatedCharacter = typeaheadRef.current.length > 1
        && Array.from(typeaheadRef.current).every((character) => character === typeaheadRef.current[0])
      const query = repeatedCharacter ? event.key.toLocaleLowerCase() : typeaheadRef.current
      const start = open && activeIndex >= 0 ? activeIndex : selectedIndex
      const matchingIndex = Array.from({ length: options.length }, (_, offset) => (
        (start + offset + 1 + options.length) % options.length
      )).find((index) => !options[index]?.disabled && options[index]?.label.toLocaleLowerCase().startsWith(query))

      if (matchingIndex !== undefined) {
        if (!open) openMenu()
        setActiveIndex(matchingIndex)
      }
    }
  }

  useEffect(() => {
    if (!open) return undefined

    function updatePosition() {
      if (buttonRef.current) setPosition(menuPosition(buttonRef.current))
    }

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      closeMenu()
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') closeMenu({ focus: true })
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listboxId, open])

  useEffect(() => {
    const select = nativeSelectRef.current
    const form = select?.form
    if (!form || value !== undefined) return undefined

    let resetFrame: number | undefined
    function syncAfterReset() {
      resetFrame = window.requestAnimationFrame(() => {
        if (select) setUncontrolledValue(normalizedValue(options, select.value))
      })
    }

    form.addEventListener('reset', syncAfterReset)
    return () => {
      form.removeEventListener('reset', syncAfterReset)
      if (resetFrame !== undefined) window.cancelAnimationFrame(resetFrame)
    }
  }, [options, value])

  useEffect(() => () => window.clearTimeout(typeaheadTimerRef.current), [])

  function handleNativeChange(event: FormEvent<HTMLSelectElement>) {
    if (value === undefined) setUncontrolledValue(event.currentTarget.value)
    onChange?.(event as Parameters<NonNullable<typeof onChange>>[0])
  }

  function handleNativeInvalid(event: FormEvent<HTMLSelectElement>) {
    onInvalid?.(event as Parameters<NonNullable<typeof onInvalid>>[0])
    buttonRef.current?.focus()
    openMenu()
  }

  const controlledProps = value === undefined ? { defaultValue: selectedValue } : { value: selectedValue }
  const filterVariant = variant === 'filter'

  return (
    <span className="relative block w-full">
      <button
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-controls={open ? listboxId : undefined}
        aria-describedby={nativeProps['aria-describedby']}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={nativeProps['aria-invalid']}
        aria-label={nativeProps['aria-label']}
        aria-labelledby={nativeProps['aria-labelledby']}
        aria-required={required || undefined}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-foose-border bg-foose-surface px-3 text-left text-sm font-semibold outline-none transition hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-foose-surface-low disabled:text-foose-faint disabled:opacity-70 ${selectedValue ? 'text-foose-text' : 'text-foose-faint'} ${filterVariant ? 'h-11 border-accent/30 bg-accent-light/30' : 'h-12'} ${className}`}
        disabled={disabled}
        id={buttonId}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
        role="combobox"
        title={nativeProps.title}
        type="button"
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <span className="inline-flex shrink-0 text-accent">
          <DropdownChevron className="text-[15px]" open={open} />
        </span>
      </button>
      <select
        {...nativeProps}
        {...controlledProps}
        aria-hidden="true"
        className="pointer-events-none absolute size-px opacity-0"
        disabled={disabled}
        id={`${buttonId}-native`}
        onChange={handleNativeChange}
        onInvalid={handleNativeInvalid}
        ref={nativeSelectRef}
        required={required}
        tabIndex={-1}
      >
        {children}
      </select>

      {open && position && createPortal(
        <div
          className="fixed z-[1200] overflow-y-auto rounded-xl border border-foose-border bg-white p-1.5 shadow-2xl [scrollbar-width:thin]"
          id={listboxId}
          ref={menuRef}
          role="listbox"
          style={position}
        >
          {options.map((option, index) => {
            const active = option.value === selectedValue
            return (
              <button
                aria-selected={active}
                className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-lg px-3 text-left text-sm font-semibold transition hover:bg-accent-light hover:text-accent focus:bg-accent-light focus:text-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'bg-accent-light text-accent' : 'text-foose-text'} ${activeIndex === index ? 'bg-accent-light/70' : ''}`}
                data-active={activeIndex === index ? 'true' : undefined}
                disabled={disabled || option.disabled}
                id={`${listboxId}-${index}`}
                key={`${option.value}-${index}`}
                onClick={() => selectValue(option.value)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                tabIndex={-1}
                type="button"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {filterVariant && (
                  <span className={`size-4 shrink-0 rounded border ${active ? 'border-accent bg-accent' : 'border-foose-border bg-white'}`} />
                )}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </span>
  )
}
