/**
 * useAnalytics
 *
 * A no-op analytics hook that provides a typed `trackEvent` callback point.
 * Wire this to a real analytics provider (e.g. Segment, PostHog, Mixpanel)
 * by replacing the stub implementation below — no call sites need to change.
 *
 * Usage:
 *   const { trackEvent } = useAnalytics()
 *   trackEvent('rule_edit_opened', { contractId: '...' })
 */

export type AnalyticsEventName =
  | 'rule_edit_opened'
  | 'rule_edit_saved'
  | 'rule_edit_cancelled'
  | 'rule_added'
  | 'rule_removed'

export interface AnalyticsEventProperties {
  contractId?: string
  ruleCount?: number
  ruleType?: string
  [key: string]: unknown
}

// Stub: replace this function body to integrate a real analytics provider.
function trackEventStub(
  _event: AnalyticsEventName,
  _properties?: AnalyticsEventProperties,
): void {
  // no-op — intentionally empty until a provider is configured
}

export function useAnalytics() {
  return { trackEvent: trackEventStub }
}
