import { useRef, useState, type FormEvent } from 'react'
import {
  ButtonLink,
  ErrorSummary,
  FormActions,
  FormField,
  FormPage,
  FormSection,
  Icon,
  ImagePreviewInput,
  InlineNotice,
  LightboxImage,
  SelectControl,
  StatePanel,
  StepIndicator,
  SubmitButton,
  TextField,
} from '../components'
import { FormPageSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { getAppName } from '../config/env'
import { useApiResource } from '../hooks/useApiResource'
import { useAuth } from '../hooks/useAuth'
import { apiPost, apiPut } from '../lib/api'
import type { KycRecord, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { normalizePhone } from '../utils/formValidation'

const ID_TYPES = ['Ghana Card', 'Passport', 'Driving License'] as const
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp'
const KYC_IMAGE_LIMIT = 10 * 1024 * 1024

function appendValue(formData: FormData, name: string, value: string) {
  const normalized = value.trim()
  if (normalized) formData.append(name, normalized)
}

function KycForm({ kyc, onSaved, user }: { kyc: KycRecord; onSaved: () => Promise<void>; user: User | null }) {
  const isResubmit = kyc.status === 'rejected'
  const [step, setStep] = useState(0)
  const [idType, setIdType] = useState<string>(kyc.idType || 'Ghana Card')
  const [idNo, setIdNo] = useState(kyc.idNo || '')
  const [dob, setDob] = useState(kyc.dob || '')
  const [phone, setPhone] = useState(kyc.phone || user?.phone || '')
  const [idFiles, setIdFiles] = useState<File[]>([])
  const [selfieFiles, setSelfieFiles] = useState<File[]>([])
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  const idNoError = attemptedStep === 0 && idNo.trim().length < 2 ? 'Enter your ID number.' : ''
  const dobError = attemptedStep === 0 && !dob ? 'Enter your date of birth.' : ''
  const idImageError = attemptedStep === 1 && !isResubmit && !idFiles.length ? 'Add a clear photo of your ID document.' : ''
  const selfieError = attemptedStep === 1 && !isResubmit && !selfieFiles.length ? 'Add a clear selfie.' : ''

  function goToStep(next: number) {
    setAttemptedStep(null)
    setStep(next)
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  function continueFromIdentity() {
    setAttemptedStep(0)
    if (!idNo.trim() || !dob) {
      return
    }
    goToStep(1)
  }

  function continueFromDocuments() {
    setAttemptedStep(1)
    if (!isResubmit && (!idFiles.length || !selfieFiles.length)) {
      return
    }
    goToStep(2)
  }

  async function submitKyc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || step !== 2) return

    const formData = new FormData()
    appendValue(formData, 'idType', idType)
    appendValue(formData, 'idNo', idNo)
    appendValue(formData, 'dob', dob)
    appendValue(formData, 'phone', phone)
    if (idFiles[0]) formData.append('idImg', idFiles[0])
    if (selfieFiles[0]) formData.append('selfie', selfieFiles[0])

    setSubmitting(true)
    setError('')
    try {
      if (isResubmit) await apiPut<{ kyc: KycRecord }>('/kyc', formData)
      else await apiPost<{ kyc: KycRecord }>('/kyc', formData)
      await onSaved()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to submit KYC'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormPage
      description="Complete each step carefully. Your documents are used only for seller verification."
      eyebrow={isResubmit ? 'Verification update' : 'Seller verification'}
      title={isResubmit ? 'Update your verification' : 'Verify your identity'}
      width="standard"
    >
      <form aria-busy={submitting} className="grid gap-6" encType="multipart/form-data" onSubmit={(event) => void submitKyc(event)}>
        <StepIndicator current={step} label="Verification progress" onStepChange={(next) => { if (next < step) goToStep(next) }} steps={['Identity', 'Documents', 'Review']} />
        <h2 className="sr-only" ref={headingRef} tabIndex={-1}>{step === 0 ? 'Identity information' : step === 1 ? 'Verification documents' : 'Review submission'}</h2>

        {isResubmit && kyc.rejectionReason && (
          <InlineNotice title="Changes requested" tone="warning">{kyc.rejectionReason}</InlineNotice>
        )}

        {step === 0 && (
          <FormSection columns={2} description="Use the same details shown on your government-issued ID." title="Identity information">
            {(idNoError || dobError) && <ErrorSummary className="form-field-wide" errors={[...(idNoError ? [{ fieldId: 'kyc-id-number', message: idNoError }] : []), ...(dobError ? [{ fieldId: 'kyc-dob', message: dobError }] : [])]} focus />}
            <FormField htmlFor="kyc-id-type" label="ID type" required>
              <SelectControl id="kyc-id-type" name="idType" onChange={(event) => setIdType(event.target.value as typeof idType)} required value={idType}>
                {ID_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </SelectControl>
            </FormField>
            <TextField error={idNoError} id="kyc-id-number" label="ID number" name="idNo" onChange={(event) => setIdNo(event.target.value)} placeholder="GHA-000000000-0" required value={idNo} />
            <TextField error={dobError} id="kyc-dob" label="Date of birth" name="dob" onChange={(event) => setDob(event.target.value)} required type="date" value={dob} />
            <TextField autoComplete="tel" hint="Phone is optional until SMS verification is connected." id="kyc-phone" inputMode="tel" label="Phone number" name="phone" onBlur={() => setPhone((current) => normalizePhone(current))} onChange={(event) => setPhone(event.target.value)} optional placeholder="0240000000" type="tel" value={phone} />
          </FormSection>
        )}

        {step === 1 && (
          <FormSection description="Use bright, in-focus images with every document corner visible." title="Verification documents">
            {(idImageError || selfieError) && <ErrorSummary errors={[...(idImageError ? [{ fieldId: 'kyc-id-image', message: idImageError }] : []), ...(selfieError ? [{ fieldId: 'kyc-selfie', message: selfieError }] : [])]} focus />}
            {isResubmit && (kyc.idImgUrl || kyc.selfieImgUrl) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {kyc.idImgUrl && <LightboxImage alt="Current ID document" className="aspect-[4/3] overflow-hidden rounded-xl border border-foose-border [&_img]:h-full [&_img]:w-full [&_img]:object-cover" src={kyc.idImgUrl} />}
                {kyc.selfieImgUrl && <LightboxImage alt="Current verification selfie" className="aspect-[4/3] overflow-hidden rounded-xl border border-foose-border [&_img]:h-full [&_img]:w-full [&_img]:object-cover" src={kyc.selfieImgUrl} />}
              </div>
            )}
            <ImagePreviewInput
              accept={ACCEPT_IMAGES}
              aspect="4 / 3"
              error={idImageError}
              hint={isResubmit ? 'Choose a file only to replace the current ID photo.' : 'JPEG, PNG, or WebP, up to 10 MB.'}
              id="kyc-id-image"
              label="ID document photo"
              maxBytes={KYC_IMAGE_LIMIT}
              maxFiles={1}
              name="idImg"
              onFilesChange={setIdFiles}
              required={!isResubmit}
            />
            <ImagePreviewInput
              accept={ACCEPT_IMAGES}
              aspect="4 / 3"
              error={selfieError}
              hint={isResubmit ? 'Choose a file only to replace the current selfie.' : 'Your face must be clear. Holding your ID is optional.'}
              id="kyc-selfie"
              label="Selfie"
              maxBytes={KYC_IMAGE_LIMIT}
              maxFiles={1}
              name="selfie"
              onFilesChange={setSelfieFiles}
              required={!isResubmit}
            />
          </FormSection>
        )}

        {step === 2 && (
          <FormSection description="Confirm the details below before sending them for review." title="Review submission">
            <dl className="grid gap-4 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold text-foose-muted">ID type</dt><dd className="mt-1 font-bold text-foose-text">{idType}</dd></div>
              <div><dt className="font-semibold text-foose-muted">ID number</dt><dd className="mt-1 font-bold text-foose-text">{idNo}</dd></div>
              <div><dt className="font-semibold text-foose-muted">Date of birth</dt><dd className="mt-1 font-bold text-foose-text">{dob}</dd></div>
              <div><dt className="font-semibold text-foose-muted">Phone</dt><dd className="mt-1 font-bold text-foose-text">{phone || 'Not provided'}</dd></div>
              <div><dt className="font-semibold text-foose-muted">ID photo</dt><dd className="mt-1 font-bold text-foose-text">{idFiles[0]?.name || (isResubmit ? 'Keep current upload' : 'Ready')}</dd></div>
              <div><dt className="font-semibold text-foose-muted">Selfie</dt><dd className="mt-1 font-bold text-foose-text">{selfieFiles[0]?.name || (isResubmit ? 'Keep current upload' : 'Ready')}</dd></div>
            </dl>
            <InlineNotice tone="info">By submitting, you confirm these details are accurate and agree to Foose’s seller terms and data-processing policies.</InlineNotice>
            {error && <InlineNotice title="Verification was not submitted" tone="error">{error}</InlineNotice>}
          </FormSection>
        )}

        <FormActions sticky>
          {step > 0 && <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-white px-5 text-sm font-bold text-foose-text hover:border-accent hover:text-accent" disabled={submitting} onClick={() => goToStep(step - 1)} type="button">Back</button>}
          {step === 0 && <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover" onClick={continueFromIdentity} type="button">Continue to documents</button>}
          {step === 1 && <button className="inline-flex min-h-12 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover" onClick={continueFromDocuments} type="button">Review details</button>}
          {step === 2 && <SubmitButton loading={submitting} loadingLabel="Submitting verification…">{isResubmit ? 'Resubmit verification' : 'Submit verification'}</SubmitButton>}
        </FormActions>
      </form>
    </FormPage>
  )
}

export function KycPage() {
  const { user } = useAuth()
  const brand = getAppName()
  const resource = useApiResource<{ kyc: KycRecord }>('/kyc/me')
  const record = resource.data?.kyc

  return (
    <div className="flow-page min-h-dvh bg-foose-bg">
      <header className="flow-top flex min-h-16 items-center justify-between gap-3 border-b border-white/15 bg-accent px-4 py-3 text-white md:px-8">
        <div className="flex items-center gap-2">
          <NavigationBackButton
            className="bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white focus-visible:ring-white focus-visible:ring-offset-accent"
            fallback={{ href: '/profile', label: 'Profile' }}
            variant="icon"
          />
          <a className="hidden font-display text-lg font-semibold sm:inline" href="/">{brand}</a>
        </div>
        <span className="text-sm font-semibold">Identity verification</span>
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-white/10"><Icon name="shield" /></span>
      </header>
      <main>
        {resource.initialLoading && <FormPageSkeleton label="Loading identity verification" media />}
        {resource.error && !record && <StatePanel action={<button className="button button-secondary" onClick={() => void resource.refetch()} type="button">Try again</button>} body={resource.error} layout="page" title="Verification could not load" tone="error" />}
        {record?.status === 'approved' && <StatePanel action={<ButtonLink to="/open-shop">Open DigiShop</ButtonLink>} body="Your identity is verified and you can create and manage a DigiShop." layout="page" title="Verification approved" tone="success" />}
        {record?.status === 'pending' && <StatePanel body="Your documents are waiting for review. We will notify you when the decision is ready." layout="page" title="Verification pending" tone="info" />}
        {record && ['not_submitted', 'rejected'].includes(record.status) && <KycForm key={`${record.status}:${record.submissionCount || 0}`} kyc={record} onSaved={resource.refetch} user={user} />}
      </main>
    </div>
  )
}
