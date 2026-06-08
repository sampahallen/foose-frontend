import { useState, type FormEvent } from 'react'
import { ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput, LightboxImage, LoadingState } from '../components'
import { getAppName } from '../config/env'
import { apiPost, apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import type { KycRecord } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'

const ID_TYPES = ['Ghana Card', 'Passport', 'Driving License'] as const

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'

function appendText(formData: FormData, name: string, value: FormDataEntryValue | null) {
  const text = String(value || '').trim()
  if (text) formData.append(name, text)
}

function appendSelectedFile(formData: FormData, form: HTMLFormElement, name: string) {
  const input = form.elements.namedItem(name) as HTMLInputElement | null
  const file = input?.files?.[0]
  if (file && file.name && file.size > 0) formData.append(name, file)
}

export function KycPage() {
  const brand = getAppName()
  const kyc = useApiResource<{ kyc: KycRecord }>('/kyc/me')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const status = kyc.data?.kyc.status
  const isResubmit = status === 'rejected'

  async function submitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const sourceData = new FormData(form)
    const formData = new FormData()
    appendText(formData, 'idType', sourceData.get('idType'))
    appendText(formData, 'idNo', sourceData.get('idNo'))
    appendText(formData, 'dob', sourceData.get('dob'))
    appendText(formData, 'phone', sourceData.get('phone'))
    appendSelectedFile(formData, form, 'idImg')
    appendSelectedFile(formData, form, 'selfie')

    setSubmitting(true)
    setError('')

    try {
      if (isResubmit) {
        await apiPut<{ kyc: KycRecord }>('/kyc', formData)
      } else {
        await apiPost<{ kyc: KycRecord }>('/kyc', formData)
      }
      await kyc.refetch()
      form.reset()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to submit KYC'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flow-page min-h-dvh bg-foose-bg">
      <header className="flow-top flex h-16 items-center justify-between bg-accent px-4 text-white md:px-8">
        <a href="/">{brand}</a>
        <span>Identity verification</span>
        <Icon name="info" />
      </header>
      <main className="flow-content mx-auto w-full max-w-5xl px-4 py-8 [&.narrow]:max-w-3xl">
        <section className="kyc-intro mb-6 flex items-center gap-4 rounded-xl border border-foose-border bg-foose-surface-low p-5 [&_.icon]:rounded-full [&_.icon]:bg-accent-light [&_.icon]:p-4 [&_.icon]:text-accent">
          <Icon name="shield" size={48} />
          <div>
            <h1>Identity verification</h1>
            <p>Upload photos of your ID and a matching selfie. Images are sent securely and stored in cloud storage; only the returned links are saved with your application.</p>
          </div>
        </section>
        {kyc.loading && <LoadingState label="Loading KYC status…" />}
        {kyc.error && <ErrorState message={kyc.error} retry={kyc.refetch} />}
        {kyc.data?.kyc.status === 'approved' && (
          <EmptyState
            action={<ButtonLink to="/open-shop">Open DigiShop</ButtonLink>}
            body="Your KYC is approved. You can create and manage a DigiShop."
            icon="check"
            title="Verification approved"
          />
        )}
        {kyc.data?.kyc.status === 'pending' && (
          <EmptyState body="Your submission is waiting for admin review." icon="shield" title="KYC pending" />
        )}
        {kyc.data && ['not_submitted', 'rejected'].includes(kyc.data.kyc.status) && (
          <form className="kyc-grid grid gap-5 lg:grid-cols-2" encType="multipart/form-data" onSubmit={(event) => void submitKyc(event)}>
            <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3">
              <h2>
                <Icon name="user" /> Personal information
              </h2>
              <label>
                ID type
                <select defaultValue={kyc.data.kyc.idType || 'Ghana Card'} name="idType" required>
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ID number
                <input defaultValue={kyc.data.kyc.idNo || ''} name="idNo" placeholder="GHA-000000000-0" required />
              </label>
              <div className="form-grid grid gap-4 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3">
                <label>
                  Date of birth
                  <input defaultValue={kyc.data.kyc.dob || ''} name="dob" required type="date" />
                </label>
                <label>
                  Phone number
                  <input
                    autoComplete="tel"
                    defaultValue={kyc.data.kyc.phone || ''}
                    name="phone"
                    placeholder="024 000 0000"
                  />
                </label>
              </div>
              <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">
                Phone will become compulsory for KYC once SMS verification is connected. For now, it is optional.
              </p>
              {kyc.data.kyc.rejectionReason && <p className="danger-text font-semibold text-foose-danger">{kyc.data.kyc.rejectionReason}</p>}
            </section>
            <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3">
              <h2>
                <Icon name="camera" /> Photos
              </h2>
              {isResubmit && kyc.data.kyc.idImgUrl && (
                <div className="kyc-preview-row flex items-center gap-3 rounded-lg bg-foose-surface-low p-3">
                  <span>Current ID photo</span>
                  <LightboxImage alt="Previously uploaded ID" className="kyc-preview-img h-24 w-32 overflow-hidden rounded-lg" src={kyc.data.kyc.idImgUrl} />
                </div>
              )}
              <label>
                ID document photo
                <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="idImg" required={!isResubmit} />
                <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">JPEG, PNG, or WebP · max 10 MB</span>
              </label>
              {isResubmit && kyc.data.kyc.selfieImgUrl && (
                <div className="kyc-preview-row flex items-center gap-3 rounded-lg bg-foose-surface-low p-3">
                  <span>Current selfie</span>
                  <LightboxImage alt="Previously uploaded selfie" className="kyc-preview-img h-24 w-32 overflow-hidden rounded-lg" src={kyc.data.kyc.selfieImgUrl} />
                </div>
              )}
              <label>
                Selfie (holding ID optional)
                <ImagePreviewInput accept={ACCEPT_IMAGES} maxFiles={1} name="selfie" required={!isResubmit} />
                <span className="muted-copy text-sm leading-6 text-foose-muted md:text-base">JPEG, PNG, or WebP · max 10 MB</span>
              </label>
              {isResubmit && (
                <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">
                  Leave a file empty to keep your previous upload for that slot. Replace either or both by choosing new images.
                </p>
              )}
            </section>
            <section className="requirements rounded-xl border border-foose-border bg-foose-surface p-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-foose-muted">
              <Icon name="info" />
              <div>
                <strong>Verification requirements</strong>
                <ul>
                  <li>Document must be valid and not expired.</li>
                  <li>All four corners of the ID must be visible.</li>
                  <li>Details should match your profile name.</li>
                </ul>
              </div>
            </section>
            {error && <ErrorState message={error} />}
            <div className="flow-actions flex flex-wrap items-center gap-3">
              <p>By submitting, you agree to seller terms and data processing policies.</p>
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting} type="submit">
                {submitting ? 'Submitting…' : 'Submit verification'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
