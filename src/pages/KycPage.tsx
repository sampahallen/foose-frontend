import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ButtonLink, EmptyState, ErrorState, Icon, ImagePreviewInput, LightboxImage, LoadingState } from '../components'
import { getAppName } from '../config/env'
import { apiPost, apiPut } from '../lib/api'
import { useApiResource } from '../hooks/useApiResource'
import { useAuth } from '../hooks/useAuth'
import type { KycRecord } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formIsValid, normalizePhone } from '../utils/formValidation'

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
  const { user } = useAuth()
  const brand = getAppName()
  const kyc = useApiResource<{ kyc: KycRecord }>('/kyc/me')
  const formRef = useRef<HTMLFormElement | null>(null)
  const [error, setError] = useState('')
  const [formReady, setFormReady] = useState(false)
  const [touched, setTouched] = useState({ dob: false, idNo: false })
  const [submitting, setSubmitting] = useState(false)

  const status = kyc.data?.kyc.status
  const isResubmit = status === 'rejected'

  useEffect(() => {
    const timer = window.setTimeout(() => setFormReady(formIsValid(formRef.current)), 0)
    return () => window.clearTimeout(timer)
  }, [kyc.data, isResubmit])

  function updateFormReady() {
    setFormReady(formIsValid(formRef.current))
  }

  const idNoInput = formRef.current?.elements.namedItem('idNo') as HTMLInputElement | null
  const dobInput = formRef.current?.elements.namedItem('dob') as HTMLInputElement | null
  const idImgInput = formRef.current?.elements.namedItem('idImg') as HTMLInputElement | null
  const selfieInput = formRef.current?.elements.namedItem('selfie') as HTMLInputElement | null
  const idNoInvalid = touched.idNo && !idNoInput?.value.trim()
  const dobInvalid = touched.dob && !dobInput?.value
  const submitHint = !idNoInput?.value.trim()
    ? 'Enter your ID number.'
    : !dobInput?.value
      ? 'Enter your date of birth.'
      : !isResubmit && !idImgInput?.files?.length
        ? 'Upload your ID document photo.'
        : !isResubmit && !selfieInput?.files?.length
          ? 'Upload your selfie.'
          : ''

  function requiredBadge(invalid: boolean) {
    return <span className={`ml-auto text-[10px] font-bold ${invalid ? 'text-foose-danger' : 'text-foose-faint'}`}>Required</span>
  }

  async function submitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formReady) return
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
          <form className="kyc-grid grid gap-6 lg:grid-cols-2" encType="multipart/form-data" onChange={updateFormReady} onInput={updateFormReady} onSubmit={(event) => void submitKyc(event)} ref={formRef}>
            <section className="form-card rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-6 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface [&_input]:px-3 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-foose-surface [&_select]:px-3 [&_select]:py-3 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-accent [&_select]:focus:ring-2 [&_select]:focus:ring-accent/15 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-foose-surface [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-4">
              <h2>
                <Icon name="user" /> Personal information
              </h2>
              <label>
                <span className="flex items-center gap-2">ID type {requiredBadge(false)}</span>
                <select defaultValue={kyc.data.kyc.idType || 'Ghana Card'} name="idType" required>
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="flex items-center gap-2">ID number {requiredBadge(idNoInvalid)}</span>
                <input defaultValue={kyc.data.kyc.idNo || ''} name="idNo" onBlur={() => setTouched((current) => ({ ...current, idNo: true }))} placeholder="GHA-000000000-0" required />
                {idNoInvalid && <span className="text-xs font-semibold text-foose-danger">Enter your ID number.</span>}
              </label>
              <div className="form-grid grid gap-4 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3">
                <label>
                  <span className="flex items-center gap-2">Date of birth {requiredBadge(dobInvalid)}</span>
                  <input defaultValue={kyc.data.kyc.dob || ''} name="dob" onBlur={() => setTouched((current) => ({ ...current, dob: true }))} required type="date" />
                  {dobInvalid && <span className="text-xs font-semibold text-foose-danger">Enter your date of birth.</span>}
                </label>
                <label>
                  Phone number
                  <input
                    autoComplete="tel"
                    defaultValue={kyc.data.kyc.phone || user?.phone || ''}
                    name="phone"
                    onBlur={(event) => { event.currentTarget.value = normalizePhone(event.currentTarget.value) }}
                    placeholder="0240000000"
                  />
                </label>
              </div>
              <p className="muted-copy text-sm leading-6 text-foose-muted md:text-base">
                Phone will become compulsory for KYC once SMS verification is connected. For now, it is optional.
              </p>
              {kyc.data.kyc.rejectionReason && <p className="danger-text font-semibold text-foose-danger">{kyc.data.kyc.rejectionReason}</p>}
            </section>
            <section className="form-card rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm md:p-6 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-foose-border [&_input]:bg-foose-surface [&_input]:px-3 [&_input]:py-3 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-accent [&_input]:focus:ring-2 [&_input]:focus:ring-accent/15 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-foose-border [&_select]:bg-foose-surface [&_select]:px-3 [&_select]:py-3 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-accent [&_select]:focus:ring-2 [&_select]:focus:ring-accent/15 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-foose-border [&_textarea]:bg-foose-surface [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-4">
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
                <span className="flex items-center gap-2">ID document photo {!isResubmit && requiredBadge(false)}</span>
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
                <span className="flex items-center gap-2">Selfie (holding ID optional) {!isResubmit && requiredBadge(false)}</span>
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
              <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:border-foose-border disabled:bg-foose-surface-mid disabled:text-foose-faint disabled:shadow-none [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={submitting || !formReady} type="submit">
                {submitting ? 'Submitting…' : 'Submit verification'}
              </button>
              {!formReady && <p className="w-full text-sm font-bold text-foose-muted">{submitHint || 'Complete the required fields.'}</p>}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
