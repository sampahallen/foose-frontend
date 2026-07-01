import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState, Icon, ImagePreviewInput, LoadingState } from '../components'
import { useAuth } from '../hooks/useAuth'
import { apiPost, apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { Event } from '../types/api'
import { eventTypeLabel, normalizedEventType } from '../utils/events'
import { getErrorMessage } from '../utils/errorMessage'
import { getCurrentAppPathname, navigateTo } from '../utils/navigation'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'
const EVENT_DESCRIPTION_MAX = 60
const eventTypeCard =
  'flex min-h-28 w-full flex-col items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-accent hover:bg-accent-light/60 focus:outline-none focus:ring-2 focus:ring-accent/20'
const eventTypeCardActive = 'border-accent bg-accent-light text-foose-text shadow-sm shadow-accent/10'
const eventTypeCardIdle = 'border-foose-border bg-white text-foose-text'

type StyledPickerInputProps = {
  defaultValue?: string
  name: string
  required?: boolean
  type: 'date' | 'time'
}

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

function StyledPickerInput({ defaultValue = '', name, required = false, type }: StyledPickerInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const iconName = type === 'date' ? 'calendar' : 'clock'

  function openPicker() {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
      return
    }
    input.focus()
  }

  return (
    <span className="group relative flex min-h-12 items-center rounded-xl border border-foose-border bg-white shadow-sm transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 hover:border-accent/60">
      <span className="pointer-events-none absolute left-3 inline-flex size-8 items-center justify-center rounded-full bg-accent-light text-accent">
        <Icon name={iconName} size={17} />
      </span>
      <input
        className="!h-12 !rounded-xl !border-0 !bg-transparent !py-0 !pl-12 !pr-12 text-sm font-bold text-foose-text outline-none [color-scheme:light] focus:!border-0 focus:!ring-0 [&::-webkit-calendar-picker-indicator]:opacity-0"
        defaultValue={defaultValue}
        name={name}
        ref={inputRef}
        required={required}
        type={type}
      />
      <button
        aria-label={`Open ${type} picker`}
        className="absolute right-2 inline-flex size-8 items-center justify-center rounded-full border border-foose-border bg-foose-surface text-foose-muted transition hover:border-accent hover:bg-accent hover:text-white"
        onClick={openPicker}
        type="button"
      >
        <Icon name="chevron" size={15} />
      </button>
    </span>
  )
}

export function CommunityEventFormPage() {
  const eventId = editEventId()
  const { user } = useAuth()
  const eventResource = useApiResource<{ event: Event }>(eventId ? `/community/events/${eventId}` : null)
  const event = eventResource.data?.event
  const [selectedType, setSelectedType] = useState<'' | 'online-pop-up' | 'in-person-pop-up'>('')
  const [descriptionLength, setDescriptionLength] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const activeType = selectedType || (event ? (normalizedEventType(event) as 'online-pop-up' | 'in-person-pop-up') : 'in-person-pop-up')
  const onlineRequiresShop = activeType === 'online-pop-up' && user?.hasShop === false

  useEffect(() => {
    setDescriptionLength(event?.description?.length || 0)
  }, [event?.description])

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
        <section className="community-form-page rounded-2xl border border-foose-border bg-white p-4 shadow-sm md:p-7">
          <form
            className="mx-auto w-full max-w-3xl space-y-7 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-black [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-foose-border [&_input]:bg-white [&_input]:px-4 [&_input]:py-3 [&_input]:text-sm [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-white [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-accent [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-accent/15"
            encType="multipart/form-data"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="rounded-2xl border border-foose-border bg-foose-surface-low p-4 md:p-5">
              <div className="mb-4">
                <h2 className="text-lg font-black text-foose-text">Event details</h2>
                <p className="mt-1 text-sm leading-6 text-foose-muted">Choose the pop-up format, schedule, and attendee-facing details.</p>
              </div>
              <div className="form-grid grid gap-5 sm:grid-cols-2 [&_.wide]:sm:col-span-2">
                <div className="wide">
                  <span className="mb-2 block text-sm font-black text-foose-text">Event type</span>
                  <input name="type" type="hidden" value={activeType} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      className={`${eventTypeCard} ${activeType === 'in-person-pop-up' ? eventTypeCardActive : eventTypeCardIdle}`}
                      onClick={() => setSelectedType('in-person-pop-up')}
                      type="button"
                    >
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent-light text-accent">
                        <Icon name="location" />
                      </span>
                      <span>
                        <strong className="block text-sm font-black">In-person pop-up</strong>
                        <small className="mt-1 block text-xs leading-5 text-foose-muted">For physical events with a venue and meetup time.</small>
                      </span>
                    </button>
                    <button
                      className={`${eventTypeCard} ${activeType === 'online-pop-up' ? eventTypeCardActive : eventTypeCardIdle}`}
                      onClick={() => setSelectedType('online-pop-up')}
                      type="button"
                    >
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent-light text-accent">
                        <Icon name="store" />
                      </span>
                      <span>
                        <strong className="block text-sm font-black">Online pop-up</strong>
                        <small className="mt-1 block text-xs leading-5 text-foose-muted">Host a timed shopping window from your DigiShop catalog.</small>
                      </span>
                    </button>
                  </div>
                </div>
              <label className="wide">
                Title
                <input defaultValue={event?.title || ''} name="title" placeholder="Accra Thrift Fest" required />
              </label>
              <label>
                Date
                <StyledPickerInput defaultValue={event?.date ? event.date.slice(0, 10) : ''} name="date" required type="date" />
              </label>
              <label>
                {activeType === 'online-pop-up' ? 'Start time' : 'Time'}
                <StyledPickerInput defaultValue={event?.startTime || ''} name="startTime" required type="time" />
              </label>
              {activeType === 'online-pop-up' ? (
                <label>
                  End time
                  <StyledPickerInput defaultValue={event?.endTime || ''} name="endTime" required type="time" />
                </label>
              ) : (
                <label>
                  Location
                  <input defaultValue={event?.location || ''} name="location" placeholder="Black Star Square, Accra" required />
                </label>
              )}
              <label className="wide">
                Description
                <textarea
                  defaultValue={event?.description || ''}
                  maxLength={EVENT_DESCRIPTION_MAX}
                  name="description"
                  onChange={(input) => setDescriptionLength(input.target.value.length)}
                  placeholder="Optional details for attendees"
                  rows={3}
                />
                <span className="text-xs font-semibold text-foose-muted">{descriptionLength}/{EVENT_DESCRIPTION_MAX} characters</span>
              </label>
              </div>
            </div>

            <div className="rounded-2xl border border-foose-border bg-white p-4 md:p-5">
              <label className="wide">
                Cover image
                <span className="text-sm font-normal leading-6 text-foose-muted">Optional, but a strong banner makes promoted events feel more trustworthy.</span>
                <ImagePreviewInput accept={ACCEPT_IMAGES} existingImages={event?.coverImage ? [event.coverImage] : []} maxFiles={1} name="coverImage" />
                {eventId && <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Choose a new image only if you want to replace the current cover.</span>}
              </label>
            </div>

            {activeType === 'online-pop-up' && (
              <div className="info-card flex flex-col gap-4 rounded-2xl border border-accent/25 bg-accent-light/60 p-4 shadow-sm md:flex-row md:p-5">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-accent">
                  <Icon name="store" />
                </span>
                <div className="space-y-2">
                  <strong className="block text-sm font-black text-foose-text">{eventTypeLabel({ type: activeType })}</strong>
                  <p className="text-sm leading-6 text-foose-muted">
                    Online pop-ups are hosted on Foose and require a DigiShop so listings can be added to the pop-up catalog.
                  </p>
                  {onlineRequiresShop && <ButtonLink to="/open-shop" variant="secondary">Open your DigiShop</ButtonLink>}
                </div>
              </div>
            )}

            {error && <ErrorState message={error} />}

            <div className="form-actions flex flex-col-reverse gap-3 border-t border-foose-border pt-5 sm:flex-row sm:items-center sm:justify-end">
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
