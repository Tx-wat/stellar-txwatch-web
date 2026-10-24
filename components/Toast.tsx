'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  duration?: number
  onClose?: () => void
  actionLabel?: string
  onAction?: () => void
}

export default function Toast({ message, type, duration = 4000, onClose, actionLabel, onAction }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  const bgColor = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
  const textColor = type === 'success' ? 'text-emerald-400' : 'text-red-400'
  const icon = type === 'success' ? '✓' : '✕'

  const handleAction = () => {
    onAction?.()
    setIsVisible(false)
    onClose?.()
  }

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm px-4 py-3 rounded-lg border ${bgColor} ${textColor} text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      <span className="font-bold">{icon}</span>
      <span className="flex-1">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={handleAction}
          className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-current rounded"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}