import { AppShell, ButtonLink, StatePanel } from '../components'

export function NotFoundPage() {
  return (
    <AppShell>
      <StatePanel
        actions={(
          <>
            <ButtonLink to="/">Go home</ButtonLink>
            <ButtonLink to="/search" variant="secondary">Explore Foose</ButtonLink>
          </>
        )}
        body="The address may be outdated, or this page may have moved."
        layout="immersive"
        title="We couldn't find that page"
        tone="unavailable"
      />
    </AppShell>
  )
}
