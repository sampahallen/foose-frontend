export function StepIndicator() {
  return (
    <div className="stepper">
      {['Delivery', 'Payment', 'Confirm'].map((step, index) => (
        <div className={index === 0 ? 'active' : ''} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  )
}
