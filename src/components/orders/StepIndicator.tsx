import { Icon } from '../icons/Icon'

export function StepIndicator({
  current = 0,
  label = 'Workflow progress',
  onStepChange,
  steps = ['Delivery', 'Payment', 'Review'],
}: {
  current?: number
  label?: string
  onStepChange?: (step: number) => void
  steps?: string[]
}) {
  return (
    <nav aria-label={label} className="stepper mb-6 w-full">
      <ol
        className="grid w-full items-start text-center"
        style={{ gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => {
          const complete = index < current
          const active = index === current
          const enabled = Boolean(onStepChange) && index <= current
          return (
            <li className="relative flex min-w-0 flex-col items-center gap-2" key={step}>
              {index > 0 && (
                <span
                  aria-hidden
                  className={`absolute right-1/2 top-[21px] h-0.5 w-full transition-colors ${index <= current ? 'bg-accent' : 'bg-foose-border'}`}
                />
              )}
              <button
                aria-current={active ? 'step' : undefined}
                aria-label={`${step}${complete ? ', completed' : active ? ', current step' : ', upcoming step'}`}
                className={`relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-black transition ${active ? 'border-accent bg-accent text-white shadow-md shadow-accent/25 ring-4 ring-accent-light' : complete ? 'border-accent bg-accent text-white' : 'border-foose-border bg-white text-foose-faint'} ${enabled ? 'cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:hover:translate-y-0' : 'cursor-default'}`}
                disabled={!enabled}
                onClick={() => onStepChange?.(index)}
                type="button"
              >
                {complete ? <Icon name="check" size={20} /> : index + 1}
              </button>
              <strong className={`max-w-full px-1 text-[11px] font-bold leading-tight sm:text-sm ${active ? 'text-accent' : complete ? 'text-foose-text' : 'text-foose-faint'}`}>
                {step}
              </strong>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
