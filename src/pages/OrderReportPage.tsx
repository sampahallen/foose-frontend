import { useRef, useState, type FormEvent } from 'react'
import {
  AppShell,
  ButtonLink,
  ChoiceCardGroup,
  ErrorSummary,
  FormPage,
  FormSection,
  ImagePreviewInput,
  InlineNotice,
  OrderStatusBadge,
  SafeImage,
  StatePanel,
  StepIndicator,
  SubmitButton,
  SuccessState,
  TextAreaField,
} from '../components'
import { OrderDetailSkeleton } from '../components/operational/OperationalStates'
import { NavigationBackButton } from '../components/navigation'
import { useAuth } from '../hooks/useAuth'
import { useApiResource } from '../hooks/useApiResource'
import { useOrderRealtimeRefresh } from '../hooks/useOrderRealtimeRefresh'
import { ApiError, apiGet } from '../lib/api'
import { createOrderIdempotencyKey, postOrderReport } from '../lib/orderActions'
import type { Listing, Order, OrderReport, OrderReportCategory } from '../types/api'
import { formatDateTime, formatMoney, getListingImage } from '../utils/format'
import { orderHasAction, orderTitle } from '../utils/orderStatus'
import { getCurrentAppPathname } from '../utils/navigation'

type ReportOutcome = 'refund' | 'replacement' | 'complete_order' | 'other'

const categories: Array<{ description: string; label: string; value: OrderReportCategory }> = [
  { description: 'The parcel or pickup order never reached you.', label: 'Order not received', value: 'not_received' },
  { description: 'The bus, station, driver, or parcel details are incorrect.', label: 'Invalid transit details', value: 'invalid_transit_details' },
  { description: 'You cannot reach the seller or the listed driver.', label: 'Seller or driver unreachable', value: 'seller_or_driver_unreachable' },
  { description: 'The parcel has the wrong item or something is missing.', label: 'Wrong or missing items', value: 'wrong_or_missing_items' },
  { description: 'An item arrived damaged or materially different from its listing.', label: 'Damaged or not as described', value: 'damaged_or_not_as_described' },
  { description: 'You are concerned about fraud, threats, or personal safety.', label: 'Fraud or safety concern', value: 'fraud_or_safety_concern' },
  { description: 'The problem does not fit the options above.', label: 'Another problem', value: 'other' },
]

const outcomes: Array<{ description: string; label: string; value: ReportOutcome }> = [
  { description: 'Ask for the protected order payment to return to your original payment method.', label: 'Full refund', value: 'refund' },
  { description: 'Ask the seller to provide the correct replacement order.', label: 'Replacement', value: 'replacement' },
  { description: 'Ask for help completing this order safely.', label: 'Complete the order', value: 'complete_order' },
  { description: 'Explain a different resolution in your account below.', label: 'Another outcome', value: 'other' },
]

function orderIdFromPath() {
  const match = getCurrentAppPathname().match(/^\/orders\/([^/]+)\/report/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function listingFromItem(item: Order['items'][number]): Listing | undefined {
  return item.listingId && typeof item.listingId === 'object' ? item.listingId : undefined
}

function itemImage(item: Order['items'][number]) {
  const listing = listingFromItem(item)
  return listing ? getListingImage(listing) : undefined
}

function itemId(item: Order['items'][number], index: number) {
  if (item._id) return item._id
  if (typeof item.listingId === 'string') return item.listingId
  return item.listingId?._id || String(index)
}

function OrderReportContent({ orderId }: { orderId: string }) {
  const { user } = useAuth()
  const orderResource = useApiResource<{ order: Order }>(
    orderId ? `/orders/${encodeURIComponent(orderId)}` : null,
    Boolean(orderId),
  )
  const order = orderResource.data?.order
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<OrderReportCategory | ''>('')
  const [affectedItemIds, setAffectedItemIds] = useState<string[]>([])
  const [requestedOutcome, setRequestedOutcome] = useState<ReportOutcome | ''>('')
  const [detailedAccount, setDetailedAccount] = useState('')
  const [evidence, setEvidence] = useState<File[]>([])
  const [declarationAccepted, setDeclarationAccepted] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [evidenceBusyIndex, setEvidenceBusyIndex] = useState<number | null>(null)
  const [evidenceError, setEvidenceError] = useState('')
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const reportIdempotencyKeyRef = useRef(createOrderIdempotencyKey(orderId || 'unknown', 'report'))
  const reportActive = Boolean(order?.workflow?.report?.active || order?.activeReportId)
  const canReport = Boolean(order && orderHasAction(order, 'report'))
  const activeReport: OrderReport | null = order && typeof order.activeReportId === 'object'
    ? order.activeReportId
    : order?.report || null
  const buyerId = order && typeof order.buyerId === 'object' ? order.buyerId._id : order?.buyerId
  const viewerIsBuyer = Boolean(user?._id && buyerId === user._id)

  useOrderRealtimeRefresh(orderResource.refetch, Boolean(order), orderId)

  function goToStep(nextStep: number) {
    setAttempted(false)
    setStep(nextStep)
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus()
      window.scrollTo({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        top: 0,
      })
    })
  }

  function validateCurrentStep() {
    setAttempted(true)
    if (step === 0) return Boolean(category && affectedItemIds.length)
    if (step === 1) return Boolean(requestedOutcome && detailedAccount.trim().length >= 30)
    if (step === 2) return true
    return declarationAccepted
  }

  function continueReport() {
    if (!validateCurrentStep()) return
    goToStep(Math.min(step + 1, 3))
  }

  function toggleItem(id: string) {
    setAffectedItemIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id])
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order || step !== 3 || !validateCurrentStep()) return

    const body = new FormData()
    body.set('category', category)
    body.set('affectedItemIds', JSON.stringify(affectedItemIds))
    body.set('requestedOutcome', requestedOutcome)
    body.set('detailedAccount', detailedAccount.trim())
    body.set('declarationAccepted', 'true')
    evidence.forEach((file) => body.append('evidence', file))

    setSubmitting(true)
    setError('')
    try {
      await postOrderReport(order._id, body, reportIdempotencyKeyRef.current)
      setSubmitted(true)
      await orderResource.refetch()
    } catch (requestError) {
      if (requestError instanceof ApiError && [409, 410].includes(requestError.status)) {
        await orderResource.refetch()
        setError('This order changed before the report could freeze settlement. The latest order state is now shown.')
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Unable to submit this report')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function openEvidence(index: number) {
    if (!order || evidenceBusyIndex !== null) return
    const previewWindow = window.open('about:blank', '_blank')
    if (!previewWindow) {
      setEvidenceError('Your browser blocked the private evidence viewer. Allow pop-ups for Foose, then try again.')
      return
    }
    previewWindow.opener = null
    setEvidenceBusyIndex(index)
    setEvidenceError('')
    try {
      const attachment = await apiGet<{ signedUrl?: string; url?: string }>(
        `/orders/${encodeURIComponent(order._id)}/attachments/report-evidence/${index}`,
      )
      const url = attachment.signedUrl || attachment.url
      if (!url) throw new Error('The private evidence link could not be created')
      previewWindow.location.replace(url)
    } catch (requestError) {
      previewWindow.close()
      setEvidenceError(requestError instanceof Error ? requestError.message : 'Unable to open this evidence image')
    } finally {
      setEvidenceBusyIndex(null)
    }
  }

  const categoryLabel = categories.find((item) => item.value === category)?.label
  const outcomeLabel = outcomes.find((item) => item.value === requestedOutcome)?.label

  return (
    <AppShell active="profile" searchPlaceholder="Search orders…" showFooter={false}>
      <NavigationBackButton className="mb-5" fallback={{ href: `/orders/${orderId}`, label: 'Order details' }} />
      {!orderId && <StatePanel body="This report link is missing an order id." layout="page" title="Report unavailable" tone="unavailable" />}
      {orderResource.initialLoading && <OrderDetailSkeleton label="Loading reporting options" />}
      {orderResource.error && !orderResource.data && (
        <StatePanel
          action={<button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void orderResource.refetch()} type="button">Retry</button>}
          body={orderResource.error}
          layout="page"
          title="Report unavailable"
          tone="error"
        />
      )}

      {order && (submitted || reportActive) && (
        <div className="mx-auto max-w-2xl">
          <SuccessState
            action={<ButtonLink to={`/orders/${order._id}`}>Return to order</ButtonLink>}
            message={viewerIsBuyer
              ? 'Automatic settlement is paused. Your report and evidence are now read-only while Foose reviews the order.'
              : 'Automatic settlement is paused. The buyer’s report and evidence are read-only while Foose reviews the order.'}
            title={viewerIsBuyer ? 'Funds frozen — awaiting review' : 'Buyer report — funds frozen'}
          />
          <div className="mt-5 rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <OrderStatusBadge order={order} />
              <span className="text-xs font-black uppercase tracking-wide text-foose-faint">Order #{order._id.slice(-8).toUpperCase()}</span>
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-foose-text">{orderTitle(order)}</h2>
            <p className="mt-2 text-sm leading-6 text-foose-muted">
              No automatic pickup refund or delivery release can run while this report remains active.
            </p>
          </div>
          {activeReport && (
            <section className="mt-5 rounded-2xl border border-foose-border bg-foose-surface p-5 shadow-sm" aria-labelledby="submitted-report-title">
              <div className="flex flex-col gap-2 border-b border-foose-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">Submitted report</p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-foose-text" id="submitted-report-title">Read-only account</h2>
                </div>
                <span className="text-xs font-bold text-foose-muted">
                  {formatDateTime(activeReport.submittedAt || activeReport.createdAt)}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 [&_div]:rounded-xl [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-black [&_dt]:uppercase [&_dt]:tracking-wide [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:font-semibold [&_dd]:text-foose-text">
                <div>
                  <dt>Issue</dt>
                  <dd>{categories.find((item) => item.value === activeReport.category)?.label || activeReport.category.replaceAll('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Requested outcome</dt>
                  <dd>{outcomes.find((item) => item.value === activeReport.requestedOutcome)?.label || activeReport.requestedOutcome.replaceAll('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Affected items</dt>
                  <dd>{activeReport.affectedItemIds?.length || 0} of {order.items.length}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{activeReport.evidence?.length || 0} private {(activeReport.evidence?.length || 0) === 1 ? 'image' : 'images'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt>Detailed account</dt>
                  <dd className="whitespace-pre-wrap leading-6">{activeReport.detailedAccount || activeReport.details || 'No account available.'}</dd>
                </div>
              </dl>
              {!!activeReport.evidence?.length && (
                <div className="mt-4">
                  <h3 className="text-sm font-black text-foose-text">Private evidence</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeReport.evidence.map((asset, index) => {
                      const name = typeof asset === 'string'
                        ? `Evidence ${index + 1}`
                        : asset.originalName || asset.name || `Evidence ${index + 1}`
                      return (
                        <button
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-4 text-sm font-black text-accent transition hover:border-accent hover:bg-accent-light disabled:opacity-60"
                          disabled={evidenceBusyIndex !== null}
                          key={`${name}-${index}`}
                          onClick={() => void openEvidence(index)}
                          type="button"
                        >
                          {evidenceBusyIndex === index ? 'Creating private link…' : `View ${name}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {evidenceError && <InlineNotice className="mt-4" title="Evidence unavailable" tone="error">{evidenceError}</InlineNotice>}
            </section>
          )}
        </div>
      )}

      {order && !submitted && !reportActive && !canReport && (
        <StatePanel
          action={<ButtonLink to={`/orders/${order._id}`}>Return to order</ButtonLink>}
          body="Reports are available only while an online payment is held, after pickup is ready or a delivery has been sent."
          layout="page"
          title="Reporting is not available for this order"
          tone="info"
        />
      )}

      {order && !submitted && !reportActive && canReport && (
        <FormPage
          description="Tell Foose exactly what happened. Submitting freezes every automatic payment deadline on this order."
          eyebrow={`Order #${order._id.slice(-8).toUpperCase()}`}
          title="Report an order problem"
          width="wide"
        >
          <form aria-busy={submitting} className="mx-auto max-w-3xl" noValidate onSubmit={(event) => void submitReport(event)}>
            <StepIndicator
              current={step}
              label="Order report progress"
              onStepChange={submitting ? undefined : (nextStep) => {
                if (nextStep < step) goToStep(nextStep)
              }}
              steps={['Issue', 'Account', 'Evidence', 'Review']}
            />
            <h2 className="sr-only" ref={stepHeadingRef} tabIndex={-1}>
              {step === 0 ? 'Choose the issue and affected items' : step === 1 ? 'Describe what happened' : step === 2 ? 'Add evidence' : 'Review and submit'}
            </h2>

            {error && <InlineNotice className="mb-4" title="Report was not submitted" tone="error">{error}</InlineNotice>}

            {step === 0 && (
              <FormSection
                description="Choose the closest issue, then select every item affected."
                title="What went wrong?"
              >
                {attempted && (!category || !affectedItemIds.length) && (
                  <ErrorSummary
                    errors={[
                      ...(!category ? [{ fieldId: 'report-category', message: 'Choose an issue category.' }] : []),
                      ...(!affectedItemIds.length ? [{ fieldId: 'report-items', message: 'Select at least one affected item.' }] : []),
                    ]}
                    focus
                  />
                )}
                <ChoiceCardGroup
                  className="sm:[&_[role=radiogroup]]:grid-cols-1"
                  error={attempted && !category ? 'Choose the issue that best matches what happened.' : undefined}
                  id="report-category"
                  label="Issue category"
                  name="reportCategory"
                  onChange={setCategory}
                  options={categories}
                  required
                  value={category}
                />
                <fieldset className="grid gap-3">
                  <legend className="text-sm font-black text-foose-text">Affected items <span className="text-foose-danger">*</span></legend>
                  <div className="divide-y divide-foose-border overflow-hidden rounded-xl border border-foose-border">
                    {order.items.map((item, index) => {
                      const id = itemId(item, index)
                      return (
                        <label className="flex cursor-pointer items-center gap-3 bg-foose-surface p-3 transition hover:bg-accent-light/25 sm:p-4" key={id}>
                          <input
                            checked={affectedItemIds.includes(id)}
                            className="size-5 shrink-0 accent-accent"
                            id={index === 0 ? 'report-items' : undefined}
                            onChange={() => toggleItem(id)}
                            type="checkbox"
                          />
                          <SafeImage alt="" className="size-12 shrink-0 rounded-lg object-cover" fallback="No image" fallbackClassName="text-[8px]" src={itemImage(item)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-foose-text">{item.title}</span>
                            <span className="mt-0.5 block text-xs text-foose-muted">Qty {item.quantity} · {formatMoney(item.price * item.quantity, order.currency)}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {attempted && !affectedItemIds.length && <p className="text-sm font-bold text-foose-danger">Select at least one affected item.</p>}
                </fieldset>
              </FormSection>
            )}

            {step === 1 && (
              <FormSection
                description="Give a factual timeline, including contact attempts, dates, and what you expected to receive."
                title="Describe what happened"
              >
                {attempted && (!requestedOutcome || detailedAccount.trim().length < 30) && (
                  <ErrorSummary
                    errors={[
                      ...(!requestedOutcome ? [{ fieldId: 'report-outcome', message: 'Choose the outcome you want.' }] : []),
                      ...(detailedAccount.trim().length < 30 ? [{ fieldId: 'report-account', message: 'Provide at least 30 characters of detail.' }] : []),
                    ]}
                    focus
                  />
                )}
                <ChoiceCardGroup
                  error={attempted && !requestedOutcome ? 'Choose the resolution you want Foose to consider.' : undefined}
                  id="report-outcome"
                  label="Desired outcome"
                  name="requestedOutcome"
                  onChange={setRequestedOutcome}
                  options={outcomes}
                  required
                  value={requestedOutcome}
                />
                <TextAreaField
                  error={attempted && detailedAccount.trim().length < 30 ? 'Give at least 30 characters so the reviewer has enough context.' : undefined}
                  hint="Do not include passwords, PINs, or card details."
                  id="report-account"
                  label="Detailed account"
                  maxLength={3000}
                  onChange={(event) => setDetailedAccount(event.target.value)}
                  placeholder="Start with what happened, when it happened, and how you tried to resolve it…"
                  required
                  rows={9}
                  value={detailedAccount}
                />
              </FormSection>
            )}

            {step === 2 && (
              <FormSection
                description="Evidence is optional but can help. Add clear photos of the parcel, item, station bill, or relevant conversation."
                title="Add private evidence"
              >
                <ImagePreviewInput
                  accept="image/jpeg,image/png,image/webp"
                  aspect="original"
                  hint="JPEG, PNG or WebP only. Up to five images, 5 MB each. Only order participants and authorized staff can view them."
                  id="report-evidence"
                  label="Evidence images"
                  maxBytes={5 * 1024 * 1024}
                  maxFiles={5}
                  multiple
                  name="evidence"
                  onFilesChange={setEvidence}
                />
                <InlineNotice title="Keep original evidence" tone="info">
                  Uploaded copies become part of this report. Keep the originals on your device until the case is resolved.
                </InlineNotice>
              </FormSection>
            )}

            {step === 3 && (
              <FormSection
                description="After submission, you cannot edit this report and all automatic settlement windows freeze."
                title="Review and submit"
              >
                {attempted && !declarationAccepted && (
                  <ErrorSummary errors={[{ fieldId: 'report-declaration', message: 'Accept the truthful-information declaration.' }]} focus />
                )}
                <dl className="grid gap-4 rounded-2xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-black uppercase tracking-wide text-foose-faint">Issue</dt><dd className="mt-1 font-black text-foose-text">{categoryLabel}</dd></div>
                  <div><dt className="text-xs font-black uppercase tracking-wide text-foose-faint">Requested outcome</dt><dd className="mt-1 font-black text-foose-text">{outcomeLabel}</dd></div>
                  <div><dt className="text-xs font-black uppercase tracking-wide text-foose-faint">Affected items</dt><dd className="mt-1 font-black text-foose-text">{affectedItemIds.length} of {order.items.length}</dd></div>
                  <div><dt className="text-xs font-black uppercase tracking-wide text-foose-faint">Evidence</dt><dd className="mt-1 font-black text-foose-text">{evidence.length ? `${evidence.length} image${evidence.length === 1 ? '' : 's'}` : 'No images'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-black uppercase tracking-wide text-foose-faint">Your account</dt><dd className="mt-1 whitespace-pre-wrap font-semibold leading-6 text-foose-text">{detailedAccount}</dd></div>
                </dl>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${attempted && !declarationAccepted ? 'border-foose-danger bg-foose-danger-bg/20' : 'border-foose-border bg-foose-surface'}`}>
                  <input
                    checked={declarationAccepted}
                    className="mt-0.5 size-5 shrink-0 accent-accent"
                    id="report-declaration"
                    onChange={(event) => setDeclarationAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm font-semibold leading-6 text-foose-text">
                    I confirm this account is truthful and complete to the best of my knowledge. I understand the report becomes read-only after submission.
                  </span>
                </label>
              </FormSection>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {step > 0 ? (
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-foose-border bg-foose-surface px-5 text-sm font-black text-foose-text transition hover:border-accent hover:text-accent"
                  disabled={submitting}
                  onClick={() => goToStep(step - 1)}
                  type="button"
                >
                  Back
                </button>
              ) : <span />}
              {step < 3 ? (
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-black text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover"
                  onClick={continueReport}
                  type="button"
                >
                  Continue
                </button>
              ) : (
                <SubmitButton loading={submitting} loadingLabel="Freezing funds & submitting…">
                  Submit report & freeze funds
                </SubmitButton>
              )}
            </div>
          </form>
        </FormPage>
      )}
    </AppShell>
  )
}

export function OrderReportPage() {
  const orderId = orderIdFromPath()
  return <OrderReportContent key={orderId || 'missing-order-report'} orderId={orderId} />
}
