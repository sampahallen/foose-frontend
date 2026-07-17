import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { localDraftKey, sanitizeDraftValue, useLocalDraft } from './useLocalDraft'

describe('local form drafts', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('removes sensitive fields and file values before persistence', () => {
    const image = new File(['image'], 'photo.png', { type: 'image/png' })
    const sanitized = sanitizeDraftValue({
      bio: 'Vintage collector',
      nested: { cardNumber: '4242', city: 'Accra' },
      password: 'secret',
      photos: [image],
      privateNote: 'remove me',
      title: 'My listing',
    }, ['privateNote'])

    expect(sanitized).toEqual({
      bio: 'Vintage collector',
      nested: { city: 'Accra' },
      photos: [],
      title: 'My listing',
    })
  })

  it('stores a versioned, user-isolated draft after the debounce', () => {
    vi.useFakeTimers()
    function Harness() {
      useLocalDraft({ debounceMs: 50, formId: 'listing', userId: 'user-a', value: { title: 'Blue jacket' }, version: 2 })
      return null
    }
    render(<Harness />)
    act(() => vi.advanceTimersByTime(50))
    const key = localDraftKey({ formId: 'listing', userId: 'user-a', version: 2 })
    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toMatchObject({
      userId: 'user-a',
      value: { title: 'Blue jacket' },
      version: 2,
    })
    expect(localDraftKey({ formId: 'listing', userId: 'user-b', version: 2 })).not.toBe(key)
    vi.useRealTimers()
  })

  it('offers resume and discard for a non-expired draft', async () => {
    const user = userEvent.setup()
    const key = localDraftKey({ formId: 'event', userId: 'user-a' })
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), userId: 'user-a', value: { title: 'Night market' }, version: 1 }))
    const restored: Array<Record<string, unknown>> = []

    function Harness() {
      const draft = useLocalDraft({ formId: 'event', onRestore: (value) => restored.push(value), userId: 'user-a', value: { title: '' } })
      return draft.hasRecoverableDraft ? (
        <><button onClick={draft.resumeDraft} type="button">Resume</button><button onClick={draft.discardDraft} type="button">Discard</button></>
      ) : <span>No recovery</span>
    }
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    expect(restored).toEqual([{ title: 'Night market' }])
    expect(screen.getByText('No recovery')).toBeVisible()
  })

  it('rejects expired drafts', () => {
    const key = localDraftKey({ formId: 'finspo', userId: 'user-a' })
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now() - 1000, userId: 'user-a', value: { caption: 'Old' }, version: 1 }))
    function Harness() {
      const draft = useLocalDraft({ expiresInMs: 100, formId: 'finspo', userId: 'user-a', value: { caption: '' } })
      return <span>{draft.hasRecoverableDraft ? 'Recovery found' : 'No recovery'}</span>
    }
    render(<Harness />)
    expect(screen.getByText('No recovery')).toBeVisible()
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('does not immediately recreate a draft cleared after success', () => {
    vi.useFakeTimers()
    const key = localDraftKey({ formId: 'listing', userId: 'user-a' })
    function Harness() {
      const [title, setTitle] = useState('Original')
      const draft = useLocalDraft({ debounceMs: 20, formId: 'listing', userId: 'user-a', value: { title } })
      return <><input aria-label="Title" onChange={(event) => setTitle(event.target.value)} value={title} /><button onClick={draft.clearDraft} type="button">Clear saved draft</button></>
    }
    render(<Harness />)
    act(() => vi.advanceTimersByTime(20))
    expect(window.localStorage.getItem(key)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear saved draft' }))
    act(() => vi.advanceTimersByTime(100))
    expect(window.localStorage.getItem(key)).toBeNull()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'A new edit' } })
    act(() => vi.advanceTimersByTime(20))
    expect(JSON.parse(window.localStorage.getItem(key) || '{}')).toMatchObject({ value: { title: 'A new edit' } })
    vi.useRealTimers()
  })
})
