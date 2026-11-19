// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const PUBLIC_KEY_REGEX = /\b[GC][A-Z2-7]{55}\b/g;
const WEBHOOK_URL_REGEX = /https?:\/\/[^\s"'<>]*\/webhooks[^\s"'<>]*/gi;

function redactString(value: string): string {
  return value
    .replace(PUBLIC_KEY_REGEX, "[REDACTED_PUBLIC_KEY]")
    .replace(WEBHOOK_URL_REGEX, "[REDACTED_WEBHOOK_URL]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = redactValue(nested);
    }
    return result;
  }
  return value;
}

function redactEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.message) {
    event.message = redactString(event.message);
  }

  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = redactString(exception.value);
      }
    }
  }

  if (event.breadcrumbs) {
    for (const breadcrumb of event.breadcrumbs) {
      if (breadcrumb.message) {
        breadcrumb.message = redactString(breadcrumb.message);
      }
      if (breadcrumb.data) {
        breadcrumb.data = redactValue(breadcrumb.data) as Record<string, unknown>;
      }
    }
  }

  if (event.extra) {
    event.extra = redactValue(event.extra) as Record<string, unknown>;
  }

  if (event.contexts) {
    event.contexts = redactValue(event.contexts) as typeof event.contexts;
  }

  if (event.tags) {
    event.tags = redactValue(event.tags) as typeof event.tags;
  }

  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    beforeSend(event) {
      return redactEvent(event);
    },
  });
}