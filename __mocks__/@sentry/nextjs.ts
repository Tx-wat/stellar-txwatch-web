// Stub for @sentry/nextjs used in tests.
// The real SDK is an optional runtime dependency; tests mock it via vi.mock().
export const captureException = () => {}
export const getClient = () => null
export const init = () => {}
