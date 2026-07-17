import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceCardGroup, ErrorSummary, PasswordField, SubmitButton, TextField } from '.'
import { Dialog } from './Dialog'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'
import { useFormValidation } from './useFormValidation'

describe('modern form primitives', () => {
  it('associates labels, hints, errors, and required state with controls', () => {
    render(
      <TextField error="Enter a valid email" hint="We only use this for receipts." label="Email" name="email" required type="email" />,
    )
    const input = screen.getByRole('textbox', { name: /email/i })
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('We only use this for receipts. Enter a valid email')
  })

  it('reveals passwords without changing the field value', async () => {
    const user = userEvent.setup()
    render(<PasswordField defaultValue="secret-value" label="Password" name="password" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('secret-value')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('exposes choice cards as a labelled radio group', async () => {
    const user = userEvent.setup()
    render(
      <ChoiceCardGroup
        label="Delivery method"
        name="delivery"
        options={[
          { description: 'Collect it yourself', label: 'Pickup', value: 'pickup' },
          { description: 'Bring it to my address', label: 'Delivery', value: 'delivery' },
        ]}
        required
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Delivery method' })).toBeVisible()
    const delivery = screen.getByRole('radio', { name: 'Delivery' })
    expect(delivery).toHaveAccessibleDescription('Bring it to my address')
    await user.click(delivery)
    expect(delivery).toBeChecked()
  })

  it('links an error summary to the invalid field', async () => {
    const user = userEvent.setup()
    render(
      <>
        <TextField id="shop-name" label="Shop name" />
        <ErrorSummary errors={[{ fieldId: 'shop-name', message: 'Enter your shop name' }]} />
      </>,
    )
    await user.click(screen.getByRole('link', { name: 'Enter your shop name' }))
    expect(screen.getByLabelText('Shop name')).toHaveFocus()
  })

  it('announces submission progress and prevents duplicate submission', () => {
    render(<SubmitButton loading loadingLabel="Publishing…">Publish</SubmitButton>)
    const button = screen.getByRole('button', { name: 'Publishing…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('reveals validation errors on submit and focuses the summary', async () => {
    const user = userEvent.setup()
    function Harness() {
      const form = useFormValidation({
        initialValues: { shopName: '' },
        validators: { shopName: (value) => value ? undefined : 'Enter a shop name' },
      })
      return (
        <form onSubmit={(event) => { event.preventDefault(); form.validateForm() }}>
          <ErrorSummary errors={form.errors as Record<string, string>} focus={form.submitAttempted} />
          <TextField error={form.errors.shopName} id="shopName" label="Shop name" onBlur={() => form.markTouched('shopName')} onChange={(event) => form.setValue('shopName', event.target.value)} value={form.values.shopName} />
          <button type="submit">Continue</button>
        </form>
      )
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    const summary = screen.getByRole('alert')
    expect(summary).toHaveFocus()
    expect(screen.getByLabelText('Shop name')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('dialogs and navigation protection', () => {
  it('traps focus, closes on Escape, and restores page scrolling', () => {
    const onClose = vi.fn()
    render(
      <Dialog footer={<button type="button">Save</button>} onClose={onClose} open title="Edit address">
        <input aria-label="Street" />
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Edit address' })).toBeVisible()
    expect(document.body.style.overflow).toBe('hidden')
    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows a custom discard confirmation for in-app links', async () => {
    const user = userEvent.setup()
    render(
      <UnsavedChangesGuard when>
        <a href="/another-page">Leave editor</a>
      </UnsavedChangesGuard>,
    )
    await user.click(screen.getByRole('link', { name: 'Leave editor' }))
    expect(screen.getByRole('dialog', { name: 'Discard your changes?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('supports controlled choice card values', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState('one')
      return <ChoiceCardGroup label="Plan" name="plan" onChange={setValue} options={[{ label: 'One', value: 'one' }, { label: 'Two', value: 'two' }]} value={value} />
    }
    render(<Harness />)
    await user.click(screen.getByRole('radio', { name: 'Two' }))
    expect(screen.getByRole('radio', { name: 'Two' })).toBeChecked()
  })
})
