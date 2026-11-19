/* eslint-disable @typescript-eslint/no-unused-vars */
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
  | 'web_vital'

export interface AnalyticsEventProperties {
  contractId?: string
  ruleCount?: number
  ruleType?: string
  [key: string]: unknown
}

// Stub: replace this function body to integrate a real analytics provider.
/* eslint-disable @typescript-eslint/no-unused-vars */
function trackEventStub(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _event: AnalyticsEventName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _properties?: AnalyticsEventProperties,
): void {
  // no-op — intentionally empty until a provider is configured
  void _event
  void _properties
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export function useAnalytics() {
  return { trackEvent: trackEventStub }
}