export function CollectionHero({ description, title }: { description: string; title: string }) {
  return (
    <section className="mb-6 rounded-2xl border border-foose-border bg-foose-surface p-5 md:p-8">
      <h1 className="text-2xl font-black text-foose-text md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">{description}</p>
    </section>
  )
}
