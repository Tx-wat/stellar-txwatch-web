// @vitest-environment jsdom
/**
 * Keyboard shortcut for the add-contract form (issue #591).
 *
 * Covers both the shortcut contract (Cmd/Ctrl+N only) and the accessibility
 * requirements: it must not fire while the user is typing, it must respect
 * already-handled events, and the UI hints must be exposed in the DOM.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import NewContractShortcut, {
  isNewContractShortcut,
  NEW_CONTRACT_SHORTCUT_LABEL,
} from '@/components/NewContractShortcut'
import EmptyState from '@/components/EmptyState'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

beforeEach(() => {
  push.mockClear()
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function pressWindow(init: KeyboardEventInit) {
  fireEvent.keyDown(window, init)
}

describe('isNewContractShortcut', () => {
  it('accepts Cmd+N and Ctrl+N', () => {
    expect(
      isNewContractShortcut({
        key: 'n',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      })
    ).toBe(true)
    expect(
      isNewContractShortcut({
        key: 'N',
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        shiftKey: false,
      })
    ).toBe(true)
  })

  it('rejects other keys and extra modifiers', () => {
    expect(
      isNewContractShortcut({
        key: 'm',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      })
    ).toBe(false)
    expect(
      isNewContractShortcut({
        key: 'n',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      })
    ).toBe(false)
    expect(
      isNewContractShortcut({
        key: 'n',
        metaKey: true,
        ctrlKey: true,
        altKey: false,
        shiftKey: true,
      })
    ).toBe(false)
    expect(
      isNewContractShortcut({
        key: 'n',
        metaKey: true,
        ctrlKey: false,
        altKey: true,
        shiftKey: false,
      })
    ).toBe(false)
  })
})

describe('NewContractShortcut', () => {
  it('navigates to the add-contract page on Cmd+N', () => {
    render(<NewContractShortcut />)
    pressWindow({ key: 'n', metaKey: true })
    expect(push).toHaveBeenCalledWith('/contracts/new')
  })

  it('navigates to the add-contract page on Ctrl+N', () => {
    render(<NewContractShortcut />)
    pressWindow({ key: 'n', ctrlKey: true })
    expect(push).toHaveBeenCalledWith('/contracts/new')
  })

  it('does not navigate for a bare "n" keypress', () => {
    render(<NewContractShortcut />)
    pressWindow({ key: 'n' })
    expect(push).not.toHaveBeenCalled()
  })

  it('does not hijack typing inside an input', () => {
    render(<NewContractShortcut />)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireEvent.keyDown(input, { key: 'n', ctrlKey: true, bubbles: true })

    expect(push).not.toHaveBeenCalled()
  })

  it('does not hijack typing inside a textarea or contenteditable region', () => {
    render(<NewContractShortcut />)

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    fireEvent.keyDown(textarea, { key: 'n', metaKey: true, bubbles: true })

    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    document.body.appendChild(editor)
    fireEvent.keyDown(editor, { key: 'n', metaKey: true, bubbles: true })

    expect(push).not.toHaveBeenCalled()
  })

  it('respects events another handler already consumed', () => {
    render(<NewContractShortcut />)
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    event.preventDefault()
    window.dispatchEvent(event)
    expect(push).not.toHaveBeenCalled()
  })

  it('stops listening when unmounted', () => {
    const { unmount } = render(<NewContractShortcut />)
    unmount()
    pressWindow({ key: 'n', ctrlKey: true })
    expect(push).not.toHaveBeenCalled()
  })
})

describe('shortcut hints', () => {
  it('renders the hint as a kbd element on the empty state', () => {
    render(
      <EmptyState
        title="No contracts yet"
        description="Add one to get started."
        shortcutHint={NEW_CONTRACT_SHORTCUT_LABEL}
      />
    )

    const hint = screen.getByText(NEW_CONTRACT_SHORTCUT_LABEL)
    expect(hint.tagName).toBe('KBD')
    expect(screen.getByText(/to add a contract/i)).toBeInTheDocument()
  })

  it('omits the hint when no shortcutHint is provided', () => {
    render(<EmptyState title="Nothing here" description="Nothing to show." />)
    expect(screen.queryByText(/press/i)).not.toBeInTheDocument()
  })
})
