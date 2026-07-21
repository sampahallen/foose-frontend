import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Message } from './Message'

describe('Message', () => {
  it('uses an icon-only reply action in the open space beside the bubble', () => {
    const onReply = vi.fn()
    const { container } = render(
      <Message incoming onReply={onReply}>Hello there</Message>,
    )

    const reply = screen.getByRole('button', { name: 'Reply to this message' })
    expect(reply).toHaveAttribute('title', 'Reply')
    expect(reply).not.toHaveTextContent('Reply')
    expect(container.querySelector('.message-row')?.lastElementChild).toBe(reply)

    fireEvent.click(reply)
    expect(onReply).toHaveBeenCalledOnce()
  })

  it('opens the animated reaction pill and submits the selected reaction', () => {
    const onReact = vi.fn()
    render(
      <Message currentUserId="me" messageId="message-1" onReact={onReact}>Hello there</Message>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }))
    expect(screen.getByRole('menu', { name: 'Choose a reaction' })).toHaveClass('message-reaction-picker')

    fireEvent.click(screen.getByRole('menuitem', { name: 'Heart' }))
    expect(onReact).toHaveBeenCalledWith('message-1', 'heart')
    expect(screen.queryByRole('menu', { name: 'Choose a reaction' })).not.toBeInTheDocument()
  })

  it('puts my reaction on the outer edge and the other participant reaction on the open edge', () => {
    const { container } = render(
      <Message
        currentUserId="me"
        incoming
        messageId="message-1"
        onReact={vi.fn()}
        reactions={[
          { reaction: 'heart', userId: 'me' },
          { reaction: 'fire', userId: 'other' },
        ]}
      >
        Hello there
      </Message>,
    )

    const myReaction = screen.getByRole('button', { name: 'Heart reaction. Change or remove reaction' })

    const theirReaction = screen.getByLabelText('Fire from Foose member')
    const rail = container.querySelector('.message-reaction-rail')
    expect(rail).toHaveClass('bottom-0', 'h-7', 'items-center', 'translate-y-1/2')
    expect(myReaction.closest('.message-reaction-rail')).toBe(rail)
    expect(theirReaction.closest('.message-reaction-rail')).toBe(rail)
    expect(myReaction.parentElement).toHaveClass('h-7')
    expect(theirReaction).toHaveClass('h-7')
    expect(container.querySelector('.message')).toContainElement(theirReaction)
  })

  it('offers undo when the selected reaction is chosen again', () => {
    const onReact = vi.fn()
    render(
      <Message currentUserId="me" messageId="message-1" onReact={onReact} reactions={[{ reaction: 'heart', userId: 'me' }]}>
        Hello there
      </Message>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Heart reaction. Change or remove reaction' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Undo Heart reaction' }))

    expect(onReact).toHaveBeenCalledWith('message-1', 'heart')
    expect(screen.queryByRole('menu', { name: 'Choose a reaction' })).not.toBeInTheDocument()
  })
})
