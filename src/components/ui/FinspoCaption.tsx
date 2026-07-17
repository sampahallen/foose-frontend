export function FinspoCaption({ caption }: { caption?: string }) {
  const text = caption?.trim()
  if (!text) return null

  return (
    <p className="finspo-caption mt-1 truncate text-xs leading-5 text-foose-muted" title={text}>
      {text}
    </p>
  )
}
