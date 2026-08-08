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
    expect(container.querySelector('.message-row')?.lastElementChild).toContainElement(reply)

    fireEvent.click(reply)
    expect(onReply).toHaveBeenCalledOnce()
  })

  it('places a visible react button alongside reply, on the same side for incoming and outgoing messages', () => {
    const { container: incomingContainer } = render(
      <Message currentUserId="me" incoming messageId="message-1" onReact={vi.fn()} onReply={vi.fn()}>Hello there</Message>,
    )
    const incomingReact = screen.getByRole('button', { name: 'React to this message' })
    const incomingReply = screen.getByRole('button', { name: 'Reply to this message' })
    expect(incomingContainer.querySelector('.message-row')?.lastElementChild).toContainElement(incomingReact)
    expect(incomingContainer.querySelector('.message-row')?.lastElementChild).toContainElement(incomingReply)
    expect(incomingContainer.querySelector('.message')).not.toContainElement(incomingReact)

    const { container: outgoingContainer } = render(
      <Message currentUserId="me" messageId="message-2" onReact={vi.fn()} onReply={vi.fn()}>Hello there</Message>,
    )
    const outgoingReact = screen.getAllByRole('button', { name: 'React to this message' })[1]
    expect(outgoingContainer.querySelector('.message-row')?.firstElementChild).toContainElement(outgoingReact)
  })

  it('opens the animated reaction pill and submits the selected reaction', () => {
    const onReact = vi.fn()
    render(
      <Message currentUserId="me" messageId="message-1" onReact={onReact}>Hello there</Message>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'React to this message' }))
    expect(screen.getByRole('menu', { name: 'Choose a reaction' })).toHaveClass('message-reaction-picker')

    fireEvent.click(screen.getByRole('menuitem', { name: 'Heart' }))
    expect(onReact).toHaveBeenCalledWith('message-1', 'heart')
    expect(screen.queryByRole('menu', { name: 'Choose a reaction' })).not.toBeInTheDocument()
  })

  it('shows my reaction and the other participant reaction in a summary row below the bubble, never overlapping it', () => {
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

    const myChip = screen.getByRole('button', { name: 'Your reaction: Heart. Tap to remove' })
    const theirChip = screen.getByLabelText('Fire from Foose member')

    expect(container.querySelector('.message-reaction-rail')).not.toBeInTheDocument()
    expect(container.querySelector('.message')).not.toContainElement(myChip)
    expect(container.querySelector('.message')).not.toContainElement(theirChip)
  })

  it('offers undo when the selected reaction is chosen again from the picker', () => {
    const onReact = vi.fn()
    render(
      <Message currentUserId="me" messageId="message-1" onReact={onReact} reactions={[{ reaction: 'heart', userId: 'me' }]}>
        Hello there
      </Message>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'React to this message' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Undo Heart reaction' }))

    expect(onReact).toHaveBeenCalledWith('message-1', 'heart')
    expect(screen.queryByRole('menu', { name: 'Choose a reaction' })).not.toBeInTheDocument()
  })

  it('removes my reaction when I tap my own reaction chip', () => {
    const onReact = vi.fn()
    render(
      <Message currentUserId="me" messageId="message-1" onReact={onReact} reactions={[{ reaction: 'heart', userId: 'me' }]}>
        Hello there
      </Message>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Your reaction: Heart. Tap to remove' }))
    expect(onReact).toHaveBeenCalledWith('message-1', 'heart')
  })
})
