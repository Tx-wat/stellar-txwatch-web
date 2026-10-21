'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { useAnalytics } from '@/lib/useAnalytics'

const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'

export default function WebVitals() {
  const { trackEvent } = useAnalytics()

  useReportWebVitals((metric) => {
    if (!ANALYTICS_ENABLED) return

    trackEvent('web_vital', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    })
  })

  return null
}