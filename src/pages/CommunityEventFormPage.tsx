import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, Icon, ImagePreviewInput, InlineNotice, StatePanel } from '../components'
import { ChoiceCardGroup, ErrorSummary, SubmitButton } from '../components/forms/FormControls'
import { FormField, TextAreaField, TextField } from '../components/forms/FormField'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { UnsavedChangesGuard } from '../components/forms/UnsavedChangesGuard'
import { useLocalDraft } from '../components/forms/useLocalDraft'
import { FormPageSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { apiPost, apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { Event } from '../types/api'
import { eventTypeLabel, normalizedEventType } from '../utils/events'
import { getErrorMessage } from '../utils/errorMessage'
import { getCurrentAppPathname } from '../utils/navigation'
import { navigateWithFlash } from '../utils/navigationFlash'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'
const EVENT_DESCRIPTION_MAX = 60
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
  const [descriptionLength, setDescriptionLength] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [coverFiles, setCoverFiles] = useState<File[]>([])
  const restoredRef = useRef(false)
  const activeType = selectedType || (event ? (normalizedEventType(event) as 'online-pop-up' | 'in-person-pop-up') : 'in-person-pop-up')
  const onlineRequiresShop = activeType === 'online-pop-up' && user?.hasShop === false
  const draftValue = useMemo(() => ({ date, description, endTime, location, startTime, title, type: activeType }), [activeType, date, description, endTime, location, startTime, title])
  const draft = useLocalDraft({
    enabled: !eventResource.initialLoading,
    formId: 'community-event',
    onRestore: (saved) => {
      restoredRef.current = true
      if (saved.type === 'online-pop-up' || saved.type === 'in-person-pop-up') setSelectedType(saved.type)
      if (typeof saved.title === 'string') setTitle(saved.title)
      if (typeof saved.date === 'string') setDate(saved.date)
      if (typeof saved.startTime === 'string') setStartTime(saved.startTime)
      if (typeof saved.endTime === 'string') setEndTime(saved.endTime)
      if (typeof saved.location === 'string') setLocation(saved.location)
      if (typeof saved.description === 'string') setDescription(saved.description)
    },
    resourceId: eventId || 'new',
    userId: user?._id,
    value: draftValue,
  })
  const dirty = eventId
    ? coverFiles.length > 0
      || title !== (event?.title || '')
      || date !== (event?.date ? event.date.slice(0, 10) : '')
      || startTime !== (event?.startTime || '')
      || endTime !== (event?.endTime || '')
      || location !== (event?.location || '')
      || description !== (event?.description || '')
      || activeType !== (event ? normalizedEventType(event) : activeType)
    : Boolean(title || date || startTime || endTime || location || description || coverFiles.length || selectedType)

  useEffect(() => {
    if (!event || restoredRef.current) return
    setTitle(event.title || '')
    setDate(event.date ? event.date.slice(0, 10) : '')
    setStartTime(event.startTime || '')
    setEndTime(event.endTime || '')
    setLocation(event.location || '')
    setDescription(event.description || '')
    setDescriptionLength(event.description?.length || 0)
  }, [event])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const requiredErrors: Record<string, string> = {}
    if (!String(sourceData.get('title') || '').trim()) requiredErrors['event-title'] = 'Enter an event title.'
    if (!String(sourceData.get('date') || '').trim()) requiredErrors['event-date'] = 'Choose an event date.'
    if (!String(sourceData.get('startTime') || '').trim()) requiredErrors['event-start-time'] = 'Choose a start time.'
    if (activeType === 'online-pop-up' && !String(sourceData.get('endTime') || '').trim()) requiredErrors['event-end-time'] = 'Choose an end time.'
    if (activeType === 'in-person-pop-up' && !String(sourceData.get('location') || '').trim()) requiredErrors['event-location'] = 'Enter the event location.'
    if (Object.keys(requiredErrors).length) {
      setFieldErrors(requiredErrors)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    setFieldErrors({})
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
      navigateWithFlash(
        savedEvent?._id ? `/community/events/${savedEvent._id}/manage` : '/community?tab=events&scope=mine',
        { message: `Your event was ${eventId ? 'updated' : 'created'}.`, title: 'Event saved', tone: 'success' },
      )
      draft.clearDraft()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save event'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="community" searchPlaceholder="Search community...">
      {eventId && !event && <NavigationBackButton className="mb-5" fallback={{ href: '/community?tab=events&scope=mine', label: 'My events' }} />}
      {eventId && eventResource.initialLoading && <FormPageSkeleton label="Loading event editor" media />}
      {eventId && eventResource.error && !eventResource.data && <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void eventResource.refetch()} type="button">Retry</button>} body={eventResource.error} layout="page" title="Event unavailable" tone="unavailable" />}

      {(!eventId || event) && (
        <FormPage
          description={eventId ? 'Update the schedule, attendee details, and cover shown to the community.' : 'Create an in-person or online pop-up for the Foose community.'}
          eyebrow={<NavigationBackButton fallback={{ href: '/community?tab=events&scope=mine', label: 'My events' }} />}
          title={eventId ? 'Edit event' : 'Add event'}
          width="standard"
        >
          <form className="space-y-5" encType="multipart/form-data" noValidate onSubmit={(event) => void handleSubmit(event)}>
            <UnsavedChangesGuard when={dirty && !submitting} />
            {draft.hasRecoverableDraft && (
              <InlineNotice
                action={<div className="flex gap-2"><button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-white" onClick={() => draft.resumeDraft()} type="button">Resume</button><button className="min-h-11 rounded-lg px-3 font-black text-foose-muted hover:bg-white" onClick={() => draft.discardDraft()} type="button">Discard</button></div>}
                title="Continue your event draft?"
              >Event details were saved on this device. Choose the cover image again if needed.</InlineNotice>
            )}
            <ErrorSummary errors={Object.entries(fieldErrors).map(([fieldId, message]) => ({ fieldId, message }))} focus={validationAttempt > 0} />

            <FormSection description="Choose how people attend, then give the event a clear name." title="Event format">
              <ChoiceCardGroup
                label="Event type"
                name="type"
                onChange={(value) => setSelectedType(value as 'online-pop-up' | 'in-person-pop-up')}
                options={[
                  { description: 'For physical events with a venue and meetup time.', label: 'In-person pop-up', value: 'in-person-pop-up', visual: <Icon name="location" /> },
                  { description: 'Host a timed shopping window from your DigiShop catalog.', label: 'Online pop-up', value: 'online-pop-up', visual: <Icon name="store" /> },
                ]}
                required
                value={activeType}
              />
              <TextField error={fieldErrors['event-title']} id="event-title" label="Event title" name="title" onChange={(input) => setTitle(input.target.value)} placeholder="Accra Thrift Fest" required value={title} />
            </FormSection>

            <FormSection columns={2} description="Use the local event time. Attendees will see these details before they join." title="Schedule and place">
              <TextField error={fieldErrors['event-date']} id="event-date" label="Date" name="date" onChange={(input) => setDate(input.target.value)} prefix={<Icon name="calendar" size={17} />} required type="date" value={date} />
              <TextField error={fieldErrors['event-start-time']} id="event-start-time" label={activeType === 'online-pop-up' ? 'Start time' : 'Time'} name="startTime" onChange={(input) => setStartTime(input.target.value)} prefix={<Icon name="clock" size={17} />} required type="time" value={startTime} />
              {activeType === 'online-pop-up' ? (
                <TextField error={fieldErrors['event-end-time']} id="event-end-time" label="End time" name="endTime" onChange={(input) => setEndTime(input.target.value)} prefix={<Icon name="clock" size={17} />} required type="time" value={endTime} />
              ) : (
                <TextField error={fieldErrors['event-location']} id="event-location" label="Location" name="location" onChange={(input) => setLocation(input.target.value)} placeholder="Black Star Square, Accra" required value={location} />
              )}
              <TextAreaField
                id="event-description"
                label="Description"
                maxLength={EVENT_DESCRIPTION_MAX}
                name="description"
                onChange={(input) => { setDescription(input.target.value); setDescriptionLength(input.target.value.length) }}
                optional
                placeholder="Useful details for attendees"
                rows={3}
                value={description}
                wrapperClassName="form-field-wide"
              />
              <span className="sr-only" aria-live="polite">{descriptionLength} characters entered</span>
            </FormSection>

            <FormSection description="A wide, clear cover helps the event feel trustworthy and improves promotion cards." title="Cover image">
              <FormField hint={eventId ? 'Choose a new image only if you want to replace the current cover.' : 'Optional. Upload a wide JPEG, PNG, or WebP image.'} htmlFor="coverImage" label="Event cover" optional>
                <ImagePreviewInput accept={ACCEPT_IMAGES} aspect="wide" existingImages={event?.coverImage ? [event.coverImage] : []} id="coverImage" maxFiles={1} name="coverImage" onFilesChange={setCoverFiles} />
              </FormField>
            </FormSection>

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

            {error && <InlineNotice title="Event was not saved" tone="error">{error}</InlineNotice>}

            <FormActions sticky>
              <ButtonLink to="/community?tab=events&scope=mine" variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton disabled={onlineRequiresShop} loading={submitting} loadingLabel="Saving event…">{eventId ? 'Save event' : 'Post event'}</SubmitButton>
            </FormActions>
          </form>
        </FormPage>
      )}
    </AppShell>
  )
}
