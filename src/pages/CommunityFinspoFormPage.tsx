import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState, Icon, ImagePreviewInput, LightboxImage, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost, apiPut } from '../lib/api'
import type { GalleryPost } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { getCurrentAppPathname, navigateTo } from '../utils/navigation'

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
  const postId = editFinspoId()
  const postResource = useApiResource<{ post: GalleryPost }>(postId ? `/community/gallery/${postId}` : null)
  const post = postResource.data?.post
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submitFinspo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const payload = new FormData()
    appendText(payload, 'caption', sourceData.get('caption'))
    appendText(payload, 'tags', sourceData.get('tags'))
    appendSelectedFile(payload, form, 'image')

    setSubmitting(true)
    setError('')
    try {
      if (postId) {
        await apiPut(`/community/gallery/${postId}`, payload)
      } else {
        await apiPost('/community/gallery', payload)
      }
      navigateTo('/community?tab=finspo&scope=mine')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save Finspo'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="community" searchPlaceholder="Search Finspo...">
      <div className="dashboard-head mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
        <div>
          <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href="/community?tab=finspo&scope=mine">
            <Icon name="arrow" /> Back to Finspo
          </a>
          <h1>{postId ? 'Edit Finspo' : 'Post Finspo'}</h1>
          <p>{postId ? 'Update your inspiration post.' : 'Share a full-ratio image with the Foose community.'}</p>
        </div>
      </div>

      {postId && postResource.loading && <LoadingState label="Loading Finspo..." />}
      {postId && postResource.error && <ErrorState message={postResource.error} retry={postResource.refetch} />}

      {(!postId || post) && (
        <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 large community-form-page [&_form]:mx-auto [&_form]:w-full [&_form]:max-w-3xl [&_form]:rounded-xl [&_form]:border [&_form]:border-foose-border [&_form]:bg-foose-surface [&_form]:p-5 [&_form]:md:p-8 py-8">
          <form encType="multipart/form-data" onSubmit={(event) => void submitFinspo(event)}>
            {post?.imageUrl && (
              <div className="current-finspo-image overflow-hidden rounded-lg bg-foose-surface-mid [&_img]:h-full [&_img]:w-full [&_img]:object-cover aspect-[4/3]">
                <LightboxImage alt={post.caption || 'Current Finspo'} src={post.imageUrl} />
              </div>
            )}
            <div className="form-grid grid gap-4 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3">
              <label className="wide">
                Image
                <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="image" required={!postId} />
                {postId && <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">Choose a new image only if you want to replace the current post image.</span>}
              </label>
              <label className="wide">
                Caption
                <textarea defaultValue={post?.caption || ''} name="caption" rows={5} />
              </label>
              <label className="wide">
                Tags
                <input defaultValue={post?.tags?.join(', ') || ''} name="tags" placeholder="streetwear, accra" />
              </label>
            </div>

            {error && <ErrorState message={error} />}

            <div className="form-actions flex flex-wrap items-center gap-3">
              <ButtonLink to="/community?tab=finspo&scope=mine" variant="secondary">
                Cancel
              </ButtonLink>
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting} type="submit">
                {submitting ? 'Saving...' : postId ? 'Save Finspo' : 'Publish Finspo'}
              </button>
            </div>
          </form>
        </section>
      )}
    </AppShell>
  )
}
