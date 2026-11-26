'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface ContractQrModalProps {
  value: string
  label: string
  onClose: () => void
}

export default function ContractQrModal({ value, label, onClose }: ContractQrModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: 256, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`QR code for ${label}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4 text-center">
        <h3 className="text-lg font-semibold text-zinc-100">{label}</h3>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`QR code for contract ${value}`} className="mx-auto rounded-lg bg-white p-2" width={256} height={256} />
        ) : (
          <p className="text-sm text-zinc-500">Generating QR code…</p>
        )}
        <p className="text-xs font-mono text-zinc-500 break-all">{value}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
