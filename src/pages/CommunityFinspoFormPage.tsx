import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, HashtagInput, ImagePreviewInput, InlineNotice, LightboxImage, StatePanel } from '../components'
import { ErrorSummary, SubmitButton } from '../components/forms/FormControls'
import { FormField, TextAreaField } from '../components/forms/FormField'
import { FormActions, FormPage, FormSection } from '../components/forms/FormLayout'
import { UnsavedChangesGuard } from '../components/forms/UnsavedChangesGuard'
import { useLocalDraft } from '../components/forms/useLocalDraft'
import { FormPageSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useApiResource } from '../hooks/useApiResource'
import { useAuth } from '../hooks/useAuth'
import { apiPost, apiPut } from '../lib/api'
import type { GalleryPost } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { getCurrentAppPathname } from '../utils/navigation'
import { navigateWithFlash } from '../utils/navigationFlash'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'

function editFinspoId() {
  const match = getCurrentAppPathname().match(/^\/community\/finspo\/([^/]+)\/edit/)
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

export function CommunityFinspoFormPage() {
  const { user } = useAuth()
  const postId = editFinspoId()
  const postResource = useApiResource<{ post: GalleryPost }>(postId ? `/community/gallery/${postId}` : null)
  const post = postResource.data?.post
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imageMissing, setImageMissing] = useState(false)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const restoredRef = useRef(false)
  const dirty = postId
    ? selectedFiles.length > 0 || caption !== (post?.caption || '') || tags.join('\u0000') !== (post?.tags || []).join('\u0000')
    : Boolean(caption || tags.length || selectedFiles.length)
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
    if (post && !restoredRef.current) {
      setCaption(post.caption || '')
      setTags(post.tags || [])
    }
  }, [post])

  async function submitFinspo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const imageInput = form.elements.namedItem('image') as HTMLInputElement | null
    if (!postId && !imageInput?.files?.length) {
      setImageMissing(true)
      setValidationAttempt((attempt) => attempt + 1)
      return
    }
    setImageMissing(false)
    const payload = new FormData()
    appendText(payload, 'caption', sourceData.get('caption'))
    payload.append('tags', String(sourceData.get('tags') || '').trim())
    appendSelectedFile(payload, form, 'image')

    setSubmitting(true)
    setError('')
    try {
      if (postId) {
        await apiPut(`/community/gallery/${postId}`, payload)
      } else {
        await apiPost('/community/gallery', payload)
      }
      draft.clearDraft()
      navigateWithFlash('/community?tab=finspo&scope=mine', { message: `Your Finspo was ${postId ? 'updated' : 'posted'}.`, title: 'Finspo saved', tone: 'success' })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save Finspo'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="community" searchPlaceholder="Search Finspo...">
      {postId && !post && <NavigationBackButton className="mb-5" fallback={{ href: '/community?tab=finspo&scope=mine', label: 'My Finspo' }} />}
      {postId && postResource.initialLoading && <FormPageSkeleton label="Loading Finspo editor" media />}
      {postId && postResource.error && !postResource.data && <StatePanel action={<button className="button button-secondary min-h-11 px-5" onClick={() => void postResource.refetch()} type="button">Retry</button>} body={postResource.error} layout="page" title="Finspo unavailable" tone="unavailable" />}

      {(!postId || post) && (
        <FormPage
          aside={post?.imageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-foose-border bg-white p-3 shadow-sm">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-foose-faint">Current image</p>
              <div className="overflow-hidden rounded-xl bg-foose-surface-low [&_.lightbox-trigger]:w-full [&_img]:h-auto [&_img]:max-h-[65dvh] [&_img]:w-full [&_img]:object-contain">
                <LightboxImage alt={post.caption || 'Current Finspo'} src={post.imageUrl} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-foose-border bg-accent-light/30 p-5 text-sm leading-6 text-foose-muted">
              <strong className="mb-1 block font-display text-lg text-foose-text">Full-ratio preview</strong>
              Your image keeps its original proportions in Finspo. Nothing is cropped when you publish.
            </div>
          )}
          description={postId ? 'Refine the image, caption, and searchable tags on your inspiration post.' : 'Share a full-ratio image with the Foose community.'}
          eyebrow={<NavigationBackButton fallback={{ href: '/community?tab=finspo&scope=mine', label: 'My Finspo' }} />}
          title={postId ? 'Edit Finspo' : 'Post Finspo'}
          width="wide"
        >
          <form className="space-y-5" encType="multipart/form-data" noValidate onSubmit={(event) => void submitFinspo(event)}>
            <UnsavedChangesGuard when={!submitting && dirty} />
            {draft.hasRecoverableDraft && (
              <InlineNotice
                action={<div className="flex gap-2"><button className="min-h-11 rounded-lg px-3 font-black text-accent hover:bg-white" onClick={() => draft.resumeDraft()} type="button">Resume</button><button className="min-h-11 rounded-lg px-3 font-black text-foose-muted hover:bg-white" onClick={() => draft.discardDraft()} type="button">Discard</button></div>}
                title="Continue your Finspo draft?"
              >Caption and hashtags were saved on this device. Choose the image again before publishing.</InlineNotice>
            )}
            <ErrorSummary errors={imageMissing ? [{ fieldId: 'finspo-image', message: 'Choose an image to publish this Finspo.' }] : []} focus={validationAttempt > 0} />
            <FormSection description="Use a clear JPEG, PNG, or WebP image. The original aspect ratio is preserved." title="Image">
              <FormField error={imageMissing ? 'Choose an image before publishing.' : undefined} hint={postId ? 'Choose a new image only if you want to replace the current post image.' : 'Files are not stored in recovered drafts and must be selected again.'} htmlFor="finspo-image" label="Finspo image" required={!postId}>
                <ImagePreviewInput accept={ACCEPT_IMAGES} aspect="original" id="finspo-image" maxFiles={1} name="image" onFilesChange={setSelectedFiles} required={!postId} />
              </FormField>
            </FormSection>
            <FormSection description="A short caption and a few intentional tags make your post easier to discover." title="Post details">
              <TextAreaField id="finspo-caption" label="Caption" maxLength={1200} name="caption" onChange={(event) => setCaption(event.target.value)} optional placeholder="What inspired this look?" rows={5} value={caption} />
              <HashtagInput initialTags={tags} label="Hashtags" name="tags" onChange={setTags} placeholder="#streetwear" />
            </FormSection>
            {error && <InlineNotice title="Finspo was not saved" tone="error">{error}</InlineNotice>}
            <FormActions sticky>
              <ButtonLink to="/community?tab=finspo&scope=mine" variant="secondary">Cancel</ButtonLink>
              <SubmitButton loading={submitting} loadingLabel="Saving Finspo…">{postId ? 'Save Finspo' : 'Publish Finspo'}</SubmitButton>
            </FormActions>
          </form>
        </FormPage>
      )}
    </AppShell>
  )
}
