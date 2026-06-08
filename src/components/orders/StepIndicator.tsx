export function StepIndicator() {
  return (
    <div className="stepper mb-8 grid grid-cols-3 items-center gap-4 text-center [&_div]:relative [&_div]:flex [&_div]:flex-col [&_div]:items-center [&_div]:gap-2 [&_div]:text-sm [&_div]:font-semibold [&_div]:text-foose-faint [&_span]:inline-flex [&_span]:size-11 [&_span]:items-center [&_span]:justify-center [&_span]:rounded-full [&_span]:border [&_span]:border-foose-border [&_span]:bg-foose-surface [&_span]:font-bold [&_.active]:text-accent [&_.active_span]:border-accent [&_.active_span]:bg-accent [&_.active_span]:text-white">
      {['Delivery', 'Payment', 'Confirm'].map((step, index) => (
        <div className={index === 0 ? 'active' : ''} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  )
}
