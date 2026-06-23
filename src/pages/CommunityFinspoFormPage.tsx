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
        <section className="form-card rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-7 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface [&_input]:px-3 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-foose-surface [&_select]:px-3 [&_select]:py-3 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-accent [&_select]:focus:ring-2 [&_select]:focus:ring-accent/15 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-foose-surface [&_textarea]:px-3 [&_textarea]:py-3 [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-accent [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-accent/15 max-lg:rounded-lg max-lg:p-4 large community-form-page py-8">
          <form className="mx-auto w-full max-w-3xl space-y-6" encType="multipart/form-data" onSubmit={(event) => void submitFinspo(event)}>
            {post?.imageUrl && (
              <div className="current-finspo-image overflow-hidden rounded-lg border border-foose-border bg-foose-surface-mid [&_.lightbox-trigger]:h-full [&_.lightbox-trigger]:w-full [&_img]:h-full [&_img]:w-full [&_img]:object-contain aspect-[4/3]">
                <LightboxImage alt={post.caption || 'Current Finspo'} src={post.imageUrl} />
              </div>
            )}
            <div className="form-grid grid gap-5 sm:grid-cols-2 [&_.wide]:sm:col-span-2">
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
