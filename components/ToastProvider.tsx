'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_VISIBLE = 3
const DEFAULT_DURATION = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = DEFAULT_DURATION) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      const newToast: ToastItem = { id, message, type, duration }

      setToasts((prev) => {
        // Keep at most MAX_VISIBLE toasts — drop the oldest
        const next = [...prev, newToast]
        if (next.length > MAX_VISIBLE) {
          const removed = next.slice(0, next.length - MAX_VISIBLE)
          removed.forEach((t) => {
            const timer = timersRef.current.get(t.id)
            if (timer) {
              clearTimeout(timer)
              timersRef.current.delete(t.id)
            }
          })
          return next.slice(next.length - MAX_VISIBLE)
        }
        return next
      })

      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration)
        timersRef.current.set(id, timer)
      }
    },
    [removeToast]
  )

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast viewport — fixed bottom-right, stacks vertically */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`px-4 py-3 rounded-lg border text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
            }`}
          >
            <span className="font-bold">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
