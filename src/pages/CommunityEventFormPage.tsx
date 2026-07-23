import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, Icon, ImagePreviewInput, InlineNotice, SelectControl, StatePanel } from '../components'
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
import { formatDateInput, formatDateTyping, formatTimeTyping, parseDateInput, parseStoredTime, to24HourTime, type Meridiem } from '../utils/eventDateTimeInput'
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

function TypedTimeField({ error, id, label, name, onPeriodChange, onTimeChange, period, time }: {
  error?: string
  id: string
  label: string
  name: string
  onPeriodChange: (value: Meridiem) => void
  onTimeChange: (value: string) => void
  period: Meridiem
  time: string
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-end gap-2">
      <TextField
        autoComplete="off"
        error={error}
        id={id}
        inputMode="numeric"
        label={label}
        name={`${name}Display`}
        onChange={(input) => onTimeChange(formatTimeTyping(input.target.value))}
        placeholder="08:30"
        prefix={<Icon name="clock" size={17} />}
        required
        type="text"
        value={time}
      />
      <label className="grid gap-2 pb-px" htmlFor={`${id}-period`}>
        <span className="text-xs font-bold text-foose-muted">AM / PM</span>
        <SelectControl
          aria-label={`${label} AM or PM`}
          className="h-12 rounded-xl border border-foose-border bg-white px-3 text-sm font-black text-foose-text"
          id={`${id}-period`}
          name={`${name}Period`}
          onChange={(input) => onPeriodChange(input.target.value as Meridiem)}
          value={period}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </SelectControl>
      </label>
    </div>
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [startPeriod, setStartPeriod] = useState<Meridiem>('AM')
  const [endTime, setEndTime] = useState('')
  const [endPeriod, setEndPeriod] = useState<Meridiem>('PM')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [coverFiles, setCoverFiles] = useState<File[]>([])
  const restoredRef = useRef(false)
  const activeType = selectedType || (event ? (normalizedEventType(event) as 'online-pop-up' | 'in-person-pop-up') : 'in-person-pop-up')
  const onlineRequiresShop = activeType === 'online-pop-up' && user?.hasShop === false
  const storedStartTime = parseStoredTime(event?.startTime)
  const storedEndTime = parseStoredTime(event?.endTime)
  const draftValue = useMemo(() => ({ date, description, endPeriod, endTime, location, startPeriod, startTime, title, type: activeType }), [activeType, date, description, endPeriod, endTime, location, startPeriod, startTime, title])
  const draft = useLocalDraft({
    enabled: !eventResource.initialLoading,
    formId: 'community-event',
    onRestore: (saved) => {
      restoredRef.current = true
      if (saved.type === 'online-pop-up' || saved.type === 'in-person-pop-up') setSelectedType(saved.type)
      if (typeof saved.title === 'string') setTitle(saved.title)
      if (typeof saved.date === 'string') setDate(saved.date.includes('-') ? formatDateInput(saved.date) : saved.date)
      if (typeof saved.startTime === 'string') {
        if (saved.startPeriod === 'AM' || saved.startPeriod === 'PM') {
          setStartTime(saved.startTime)
          setStartPeriod(saved.startPeriod)
        } else {
          const parsed = parseStoredTime(saved.startTime)
          setStartTime(parsed.time)
          setStartPeriod(parsed.period)
        }
      }
      if (typeof saved.endTime === 'string') {
        if (saved.endPeriod === 'AM' || saved.endPeriod === 'PM') {
          setEndTime(saved.endTime)
          setEndPeriod(saved.endPeriod)
        } else {
          const parsed = parseStoredTime(saved.endTime)
          setEndTime(parsed.time)
          setEndPeriod(parsed.period)
        }
      }
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
      || date !== formatDateInput(event?.date)
      || startTime !== storedStartTime.time
      || startPeriod !== storedStartTime.period
      || (activeType === 'online-pop-up' && (endTime !== storedEndTime.time || endPeriod !== storedEndTime.period))
      || location !== (event?.location || '')
      || description !== (event?.description || '')
      || activeType !== (event ? normalizedEventType(event) : activeType)
    : Boolean(title || date || startTime || endTime || location || description || coverFiles.length || selectedType)

  useEffect(() => {
    if (!event || restoredRef.current) return
    setTitle(event.title || '')
    setDate(formatDateInput(event.date))
    const parsedStart = parseStoredTime(event.startTime)
    const parsedEnd = parseStoredTime(event.endTime)
    setStartTime(parsedStart.time)
    setStartPeriod(parsedStart.period)
    setEndTime(parsedEnd.time)
    setEndPeriod(parsedEnd.period)
    setLocation(event.location || '')
    setDescription(event.description || '')
    setDescriptionLength(event.description?.length || 0)
  }, [event])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const requiredErrors: Record<string, string> = {}
    const parsedDate = parseDateInput(date)
    const parsedStartTime = to24HourTime(startTime, startPeriod)
    const parsedEndTime = activeType === 'online-pop-up' ? to24HourTime(endTime, endPeriod) : null
    if (!String(sourceData.get('title') || '').trim()) requiredErrors['event-title'] = 'Enter an event title.'
    if (!parsedDate) requiredErrors['event-date'] = 'Enter a valid date as DD/MM/YYYY.'
    if (!parsedStartTime) requiredErrors['event-start-time'] = 'Enter a valid time from 01:00 to 12:59.'
    if (activeType === 'online-pop-up' && !parsedEndTime) requiredErrors['event-end-time'] = 'Enter a valid time from 01:00 to 12:59.'
    if (activeType === 'in-person-pop-up' && !String(sourceData.get('location') || '').trim()) requiredErrors['event-location'] = 'Enter the event location.'
    if (Object.keys(requiredErrors).length) {
      setFieldErrors(requiredErrors)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    setFieldErrors({})
    const payload = new FormData()
    ;['type', 'title', 'description'].forEach((field) => appendText(payload, field, sourceData.get(field)))
    payload.append('date', parsedDate as string)
    payload.append('startTime', parsedStartTime as string)
    if (activeType === 'online-pop-up') {
      payload.append('endTime', parsedEndTime as string)
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
              <TextField autoComplete="off" error={fieldErrors['event-date']} hint="DD/MM/YYYY" id="event-date" inputMode="numeric" label="Date" name="dateDisplay" onChange={(input) => setDate(formatDateTyping(input.target.value))} placeholder="23/07/2026" prefix={<Icon name="calendar" size={17} />} required type="text" value={date} />
              <TypedTimeField error={fieldErrors['event-start-time']} id="event-start-time" label={activeType === 'online-pop-up' ? 'Start time' : 'Time'} name="startTime" onPeriodChange={setStartPeriod} onTimeChange={setStartTime} period={startPeriod} time={startTime} />
              {activeType === 'online-pop-up' ? (
                <TypedTimeField error={fieldErrors['event-end-time']} id="event-end-time" label="End time" name="endTime" onPeriodChange={setEndPeriod} onTimeChange={setEndTime} period={endPeriod} time={endTime} />
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
