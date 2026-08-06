import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AppShell,
  ButtonLink,
  FinspoMediaCarousel,
  FinspoMediaComposer,
  InlineNotice,
  StatePanel,
  type FinspoComposerMedia,
} from '../components'
import { ErrorSummary, SubmitButton } from '../components/forms/FormControls'
import { TextAreaField } from '../components/forms/FormField'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { HashtagInput } from '../components/ui/HashtagInput'
import { UnsavedChangesGuard } from '../components/forms/UnsavedChangesGuard'
import { useLocalDraft } from '../components/forms/useLocalDraft'
import { FormPageSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useApiResource } from '../hooks/useApiResource'
import { useAuth } from '../hooks/useAuth'
import { apiPost, apiPut } from '../lib/api'
import type { GalleryPost } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { finspoImages } from '../utils/finspoImages'
import { getCurrentAppPathname } from '../utils/navigation'
import { navigateWithFlash } from '../utils/navigationFlash'

const SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50'

function editFinspoId() {
  const match = getCurrentAppPathname().match(/^\/community\/finspo\/([^/]+)\/edit/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function existingMedia(post: GalleryPost): FinspoComposerMedia[] {
  return finspoImages(post).map((url, index) => ({
    id: `existing-${index}-${url}`,
    kind: 'existing',
    url,
  }))
}

export function CommunityFinspoFormPage() {
  const { user } = useAuth()
  const postId = editFinspoId()
  const postResource = useApiResource<{ post: GalleryPost }>(postId ? `/community/gallery/${postId}` : null)
  const post = postResource.data?.post
  const [step, setStep] = useState<'details' | 'media'>('media')
  const [media, setMedia] = useState<FinspoComposerMedia[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [imageMissing, setImageMissing] = useState(false)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const restoredRef = useRef(false)
  const initializedPostRef = useRef('')
  const mediaRef = useRef(media)
  const originalImages = post ? finspoImages(post) : []
  const mediaDirty = postId
    ? media.some((item) => item.kind === 'new') || media.map((item) => item.url).join('\u0000') !== originalImages.join('\u0000')
    : media.length > 0
  const dirty = mediaDirty || caption !== (post?.caption || '') || tags.join('\u0000') !== (post?.tags || []).join('\u0000')
  const draftValue = useMemo(() => ({ caption, tags }), [caption, tags])
  const draft = useLocalDraft({
    enabled: !postResource.initialLoading,
    formId: 'finspo',
    onRestore: (saved) => {
      restoredRef.current = true
      if (typeof saved.caption === 'string') setCaption(saved.caption)
      if (Array.isArray(saved.tags)) setTags(saved.tags.filter((tag): tag is string => typeof tag === 'string'))
    },
    resourceId: postId || 'new',
    userId: user?._id,
    value: draftValue,
  })

  useEffect(() => {
    if (!post || initializedPostRef.current === post._id) return
    initializedPostRef.current = post._id
    setMedia(existingMedia(post))
    if (!restoredRef.current) {
      setCaption(post.caption || '')
      setTags(post.tags || [])
    }
  }, [post])

  useEffect(() => {
    mediaRef.current = media
  }, [media])

  useEffect(() => () => {
    mediaRef.current.forEach((item) => {
      if (item.kind === 'new') URL.revokeObjectURL(item.url)
    })
  }, [])

  function continueToDetails() {
    if (!media.length) {
      setImageMissing(true)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    setImageMissing(false)
    setStep('details')
  }

  async function submitFinspo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 'media') {
      continueToDetails()
      return
    }
    if (!media.length) {
      setStep('media')
      setImageMissing(true)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }

    const payload = new FormData()
    if (caption.trim()) payload.append('caption', caption.trim())
    payload.append('tags', tags.join(','))
    const newMedia = media.filter((item) => item.kind === 'new' && item.file)
    newMedia.forEach((item) => payload.append('images', item.file as File))
    if (postId) {
      payload.append('imageOrder', JSON.stringify(media.map((item) => (
        item.kind === 'existing'
          ? { type: 'existing', url: item.url }
          : { type: 'new', index: newMedia.findIndex((candidate) => candidate.id === item.id) }
      ))))
    }

    setSubmitting(true)
    setError('')
    try {
      if (postId) {
        await apiPut(`/community/gallery/${postId}`, payload)
      } else {
        await apiPost('/community/gallery', payload)
      }
      draft.clearDraft()
      navigateWithFlash('/profile?tab=finspo', {
        message: `Your Finspo was ${postId ? 'updated' : 'posted'}.`,
        title: 'Finspo saved',
        tone: 'success',
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save Finspo'))
    } finally {
      setSubmitting(false)
    }
  }

  const stepAside = (
    <ol className="grid gap-3 rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm" aria-label="Finspo publishing steps">
      <li className={`flex items-center gap-3 rounded-xl p-3 ${step === 'media' ? 'bg-accent-light text-accent' : 'text-foose-muted'}`}>
        <span className="grid size-8 place-items-center rounded-full bg-current/10 font-black">1</span>
        <span><strong className="block text-sm">Choose photos</strong><small className="text-xs">Select and arrange up to eight.</small></span>
      </li>
      <li className={`flex items-center gap-3 rounded-xl p-3 ${step === 'details' ? 'bg-accent-light text-accent' : 'text-foose-muted'}`}>
        <span className="grid size-8 place-items-center rounded-full bg-current/10 font-black">2</span>
        <span><strong className="block text-sm">Add details</strong><small className="text-xs">Review, caption, and publish.</small></span>
      </li>
    </ol>
  )

  return (
    <AppShell active="community" searchPlaceholder="Search Finspo...">
      {postId && !post && <NavigationBackButton className="mb-5" fallback={{ href: '/profile?tab=finspo', label: 'Profile Finspo' }} />}
      {postId && postResource.initialLoading && <FormPageSkeleton label="Loading Finspo editor" media />}
      {postId && postResource.error && !postResource.data && <StatePanel action={<button className={SECONDARY_BUTTON_CLASS} onClick={() => void postResource.refetch()} type="button">Retry</button>} body={postResource.error} layout="page" title="Finspo unavailable" tone="unavailable" />}

      {(!postId || post) && (
        <FormPage
          aside={stepAside}
          description={postId ? 'Update the photos and story on your inspiration post.' : 'Share up to eight photos with the Foose community.'}
          eyebrow={<NavigationBackButton fallback={{ href: '/profile?tab=finspo', label: 'Profile Finspo' }} />}
          title={postId ? 'Edit Finspo' : 'Post Finspo'}
          width="wide"
        >
          <form className="space-y-5" encType="multipart/form-data" noValidate onSubmit={(event) => void submitFinspo(event)}>
            <UnsavedChangesGuard when={!submitting && dirty} />
            {draft.hasRecoverableDraft && (
              <InlineNotice
                action={<div className="flex gap-2"><button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-accent-light" onClick={() => draft.resumeDraft()} type="button">Resume</button><button className="min-h-11 rounded-lg px-3 font-black text-foose-muted hover:bg-foose-surface-low" onClick={() => draft.discardDraft()} type="button">Discard</button></div>}
                title="Continue your Finspo draft?"
              >Caption and hashtags were saved on this device. New photos must be selected again after a reload.</InlineNotice>
            )}
            <ErrorSummary errors={imageMissing ? [{ fieldId: 'finspo-media', message: 'Choose at least one image to publish this Finspo.' }] : []} focus={validationAttempt > 0} />

            {step === 'media' ? (
              <FormSection description="The first photo becomes the cover. Use the arrow controls to arrange the final order." title="Choose photos">
                <div id="finspo-media">
                  <FinspoMediaComposer items={media} onChange={(items) => {
                    setMedia(items)
                    if (items.length) setImageMissing(false)
                  }} />
                </div>
              </FormSection>
            ) : (
              <>
                <FormSection description="Swipe through the final order before publishing." title="Review">
                  <FinspoMediaCarousel alt={caption || 'Finspo preview'} images={media.map((item) => item.url)} variant="detail" />
                </FormSection>
                <FormSection description="A short caption and a few intentional tags make your post easier to discover." title="Post details">
                  <TextAreaField id="finspo-caption" label="Caption" maxLength={1200} name="caption" onChange={(event) => setCaption(event.target.value)} optional placeholder="What inspired this look?" rows={5} value={caption} />
                  <HashtagInput initialTags={tags} label="Hashtags" name="tags" onChange={setTags} placeholder="#streetwear" />
                </FormSection>
              </>
            )}

            {error && <InlineNotice title="Finspo was not saved" tone="error">{error}</InlineNotice>}
            <FormActions sticky>
              {step === 'media' ? (
                <>
                  <ButtonLink to="/profile?tab=finspo" variant="secondary">Cancel</ButtonLink>
                  <SubmitButton>Next</SubmitButton>
                </>
              ) : (
                <>
                  <button className={SECONDARY_BUTTON_CLASS} disabled={submitting} onClick={() => setStep('media')} type="button">Back</button>
                  <SubmitButton loading={submitting} loadingLabel="Saving Finspo…">{postId ? 'Save Finspo' : 'Publish Finspo'}</SubmitButton>
                </>
              )}
            </FormActions>
          </form>
        </FormPage>
      )}
    </AppShell>
  )
}
