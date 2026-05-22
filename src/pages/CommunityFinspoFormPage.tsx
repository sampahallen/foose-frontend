import { useState, type FormEvent } from 'react'
import { AppShell, ButtonLink, ErrorState, Icon, ImagePreviewInput, LightboxImage, LoadingState } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { apiPost, apiPut } from '../lib/api'
import type { GalleryPost } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'

function editFinspoId() {
  const match = window.location.pathname.match(/^\/community\/finspo\/([^/]+)\/edit/)
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
      window.location.assign('/community?tab=finspo&scope=mine')
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save Finspo'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell active="community" searchPlaceholder="Search Finspo...">
      <div className="dashboard-head">
        <div>
          <a className="back-link" href="/community?tab=finspo&scope=mine">
            <Icon name="arrow" /> Back to Finspo
          </a>
          <h1>{postId ? 'Edit Finspo' : 'Post Finspo'}</h1>
          <p>{postId ? 'Update your inspiration post.' : 'Share a full-ratio image with the Foose community.'}</p>
        </div>
      </div>

      {postId && postResource.loading && <LoadingState label="Loading Finspo..." />}
      {postId && postResource.error && <ErrorState message={postResource.error} retry={postResource.refetch} />}

      {(!postId || post) && (
        <section className="form-card large community-form-page">
          <form encType="multipart/form-data" onSubmit={(event) => void submitFinspo(event)}>
            {post?.imageUrl && (
              <div className="current-finspo-image">
                <LightboxImage alt={post.caption || 'Current Finspo'} src={post.imageUrl} />
              </div>
            )}
            <div className="form-grid">
              <label className="wide">
                Image
                <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="image" required={!postId} />
                {postId && <span className="muted-copy">Choose a new image only if you want to replace the current post image.</span>}
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

            <div className="form-actions">
              <ButtonLink to="/community?tab=finspo&scope=mine" variant="secondary">
                Cancel
              </ButtonLink>
              <button className="button button-primary" disabled={submitting} type="submit">
                {submitting ? 'Saving...' : postId ? 'Save Finspo' : 'Publish Finspo'}
              </button>
            </div>
          </form>
        </section>
      )}
    </AppShell>
  )
}
