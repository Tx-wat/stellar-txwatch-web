'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Human-readable label for the shortcut, shown in the UI. */
export const NEW_CONTRACT_SHORTCUT_LABEL = '⌘N / Ctrl+N'

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [contenteditable=""]'

/**
 * True when the event is the "new contract" shortcut: Cmd+N on macOS,
 * Ctrl+N elsewhere, with no other modifier held.
 */
export function isNewContractShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'n'
  )
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest(EDITABLE_SELECTOR) !== null
}

/**
 * Global Cmd/Ctrl+N shortcut that opens the add-contract form.
 *
 * Mounted once in the root layout. It deliberately ignores keystrokes while
 * the user is typing in a field, so it never steals input.
 */
export default function NewContractShortcut() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      if (!isNewContractShortcut(event)) return
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      router.push('/contracts/new')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}
