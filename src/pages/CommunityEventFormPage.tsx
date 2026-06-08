import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState, Icon, ImagePreviewInput, LoadingState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { apiPost, apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { Event } from '../types/api'
import { eventTypeLabel, normalizedEventType } from '../utils/events'
import { getErrorMessage } from '../utils/errorMessage'
import { getCurrentAppPathname, navigateTo } from '../utils/navigation'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'

function editEventId() {
  const match = getCurrentAppPathname().match(/^\/community\/events\/([^/]+)\/edit/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function appendText(formData: FormData, name: string, value: FormDataEntryValue | null) {
  const text = String(value || '').trim()
  if (text) formData.append(name, text)
}

function appendSelectedFile(formData: FormData, form: HTMLFormElement, name: string) {
  const input = form.elements.namedItem(name) as HTMLInputElement | null
  const file = input?.files?.[0]
  if (file && file.name && file.size > 0) formData.append(name, file)
}

export function CommunityEventFormPage() {
  const eventId = editEventId()
  const { user } = useAuth()
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}` : null)
  const event = eventResource.data?.event
  const [selectedType, setSelectedType] = useState<'' | 'online-pop-up' | 'in-person-pop-up'>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const activeType = selectedType || (event ? (normalizedEventType(event) as 'online-pop-up' | 'in-person-pop-up') : 'in-person-pop-up')
  const onlineRequiresShop = activeType === 'online-pop-up' && user?.hasShop === false

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const payload = new FormData()
    ;['type', 'title', 'date', 'startTime', 'description'].forEach((field) => appendText(payload, field, sourceData.get(field)))
    if (activeType === 'online-pop-up') {
      appendText(payload, 'endTime', sourceData.get('endTime'))
    } else {
      appendText(payload, 'location', sourceData.get('location'))
    }
    appendSelectedFile(payload, form, 'coverImage')

    setSubmitting(true)
    setError('')
    try {
      let savedEvent: Event | undefined
      if (eventId) {
        const data = await apiPut<{ event: Event }>(`/community/events/${eventId}`, payload)
        savedEvent = data.event
      } else {
        const data = await apiPost<{ event: Event }>('/community/events', payload)
        savedEvent = data.event
      }
      navigateTo(savedEvent?._id ? `/community/events/${savedEvent._id}/manage` : '/community?tab=events&scope=mine')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save event'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="community" searchPlaceholder="Search community...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href="/community?tab=events&scope=mine">
            <Icon name="arrow" /> Back to events
          </a>
          <h1>{eventId ? 'Edit event' : 'Add event'}</h1>
          <p>{eventId ? 'Update your community event details.' : 'Create an in-person or online pop-up for the Foose community.'}</p>
        </div>
      </div>

      {eventId && eventResource.loading && <LoadingState label="Loading event..." />}
      {eventId && eventResource.error && <ErrorState message={eventResource.error} retry={eventResource.refetch} />}

      {(!eventId || event) && (
        <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 large community-form-page [&_form]:mx-auto [&_form]:w-full [&_form]:max-w-3xl [&_form]:rounded-xl [&_form]:border [&_form]:border-foose-border [&_form]:bg-foose-surface [&_form]:p-5 [&_form]:md:p-8 py-8">
          <form encType="multipart/form-data" onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-grid grid gap-4 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3">
              <label className="wide">
                Event type
                <select name="type" onChange={(input) => setSelectedType(input.target.value as 'online-pop-up' | 'in-person-pop-up')} value={activeType}>
                  <option value="in-person-pop-up">In-person pop-up</option>
                  <option value="online-pop-up">Online pop-up</option>
                </select>
              </label>
              <label className="wide">
                Title
                <input defaultValue={event?.title || ''} name="title" placeholder="Accra Thrift Fest" required />
              </label>
              <label>
                Date
                <input defaultValue={event?.date ? event.date.slice(0, 10) : ''} name="date" required type="date" />
              </label>
              <label>
                {activeType === 'online-pop-up' ? 'Start time' : 'Time'}
                <input defaultValue={event?.startTime || ''} name="startTime" required type="time" />
              </label>
              {activeType === 'online-pop-up' ? (
                <label>
                  End time
                  <input defaultValue={event?.endTime || ''} name="endTime" required type="time" />
                </label>
              ) : (
                <label>
                  Location
                  <input defaultValue={event?.location || ''} name="location" placeholder="Black Star Square, Accra" required />
                </label>
              )}
              <label className="wide">
                Description
                <textarea defaultValue={event?.description || ''} name="description" placeholder="Optional details for attendees" rows={5} />
              </label>
              <label className="wide">
                Cover image
                <ImagePreviewInput accept={ACCEPT_IMAGES} existingImages={event?.coverImage ? [event.coverImage] : []} maxFiles={1} name="coverImage" />
                {eventId && <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Choose a new image only if you want to replace the current cover.</span>}
              </label>
            </div>

            {activeType === 'online-pop-up' && (
              <div className="info-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5">
                <Icon name="store" />
                <div>
                  <strong>{eventTypeLabel({ type: activeType })}</strong>
                  <p>
                    Online pop-ups are hosted on Foose and require a DigiShop so listings can be added to the pop-up catalog.
                  </p>
                  {onlineRequiresShop && <ButtonLink to="/open-shop" variant="secondary">Open your DigiShop</ButtonLink>}
                </div>
              </div>
            )}

            {error && <ErrorState message={error} />}

            <div className="form-actions flex flex-wrap items-center gap-3">
              <ButtonLink to="/community?tab=events&scope=mine" variant="secondary">
                Cancel
              </ButtonLink>
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting || onlineRequiresShop} type="submit">
                {submitting ? 'Saving...' : eventId ? 'Save event' : 'Post event'}
              </button>
            </div>
          </form>
        </section>
      )}
    </AppShell>
  )
}
