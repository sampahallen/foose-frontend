import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState, Icon, ImagePreviewInput, LoadingState } from '../components'
import { apiPost, apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { Event } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo } from '../utils/navigation'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'

function editEventId() {
  const match = window.location.pathname.match(/^\/community\/events\/([^/]+)\/edit/)
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
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}` : null)
  const event = eventResource.data?.event
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const payload = new FormData()
    ;['title', 'description', 'date', 'location', 'type', 'status'].forEach((field) => appendText(payload, field, sourceData.get(field)))
    appendSelectedFile(payload, form, 'coverImage')

    setSubmitting(true)
    setError('')
    try {
      if (eventId) {
        await apiPut(`/community/events/${eventId}`, payload)
      } else {
        await apiPost('/community/events', payload)
      }
      navigateTo('/community?tab=events&scope=mine')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save event'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="community" searchPlaceholder="Search community...">
      <div className="dashboard-head">
        <div>
          <a className="back-link" href="/community?tab=events&scope=mine">
            <Icon name="arrow" /> Back to events
          </a>
          <h1>{eventId ? 'Edit event' : 'Add event'}</h1>
          <p>{eventId ? 'Update your community event details.' : 'Create an event for the Foose community.'}</p>
        </div>
      </div>

      {eventId && eventResource.loading && <LoadingState label="Loading event..." />}
      {eventId && eventResource.error && <ErrorState message={eventResource.error} retry={eventResource.refetch} />}

      {(!eventId || event) && (
        <section className="form-card large community-form-page">
          <form encType="multipart/form-data" onSubmit={(event) => void handleSubmit(event)}>
            <div className="form-grid">
              <label className="wide">
                Title
                <input defaultValue={event?.title || ''} name="title" placeholder="Accra Thrift Fest" required />
              </label>
              <label>
                Date
                <input defaultValue={event?.date ? event.date.slice(0, 10) : ''} name="date" required type="date" />
              </label>
              <label>
                Type
                <select defaultValue={event?.type || 'pop-up'} name="type">
                  <option value="pop-up">Pop-up</option>
                  <option value="fair">Fair</option>
                  <option value="online">Online</option>
                </select>
              </label>
              <label>
                Status
                <select defaultValue={event?.status || 'upcoming'} name="status">
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="past">Past</option>
                </select>
              </label>
              <label>
                Location
                <input defaultValue={event?.location || ''} name="location" placeholder="Black Star Square, Accra" />
              </label>
              <label className="wide">
                Description
                <textarea defaultValue={event?.description || ''} name="description" rows={5} />
              </label>
              <label className="wide">
                Cover image
                <ImagePreviewInput accept={ACCEPT_IMAGES} existingImages={event?.coverImage ? [event.coverImage] : []} maxFiles={1} name="coverImage" />
                {eventId && <span className="muted-copy">Choose a new image only if you want to replace the current cover.</span>}
              </label>
            </div>

            {error && <ErrorState message={error} />}

            <div className="form-actions">
              <ButtonLink to="/community?tab=events&scope=mine" variant="secondary">
                Cancel
              </ButtonLink>
              <button className="button button-primary" disabled={submitting} type="submit">
                {submitting ? 'Saving...' : eventId ? 'Save event' : 'Post event'}
              </button>
            </div>
          </form>
        </section>
      )}
    </AppShell>
  )
}
