# Deployment

## Vercel one-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/github?repo-url=https://github.com/Tx-wat/stellar-txwatch-web)

1. Click the button above or go to [Vercel](https://vercel.com/new) and import this repository.
2. Vercel will automatically detect it's a Next.js project and configure the build settings.
3. Add the required environment variables in the Vercel dashboard (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` — optional, base URL of the txwatch-core API
4. Click **Deploy**.

Vercel will provide a preview URL after the first deploy. Push to `main` to trigger production deployments.

## Docker deployment

> **Note**: No `Dockerfile` exists yet (see [#116]). The following is a representative example based on the Next.js Docker deployment pattern.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
RUN chown -R node:node /app
USER node
CMD ["node", "server.js"]
```

To build and run:

```bash
docker build -t stellar-txwatch-web .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-core-instance.example.com \
  stellar-txwatch-web
```

### Production considerations

- Set `NEXT_PUBLIC_API_URL` to point at your running `stellar-txwatch-core` instance.
- Ensure the container has outbound access to Horizon and Soroban RPC endpoints.
- Use a process manager (PM2, systemd) or Vercel for production hosting.

## Environment variable checklist

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `''` (empty) | Base URL of the txwatch-core API. Empty string = local/mock mode. |
| `NEXT_PUBLIC_HOST_URL` | No | `http://localhost:3000` | Base URL for the app (used in explorer links). |
| `NEXT_PUBLIC_ANALYTICS_ID` | No | — | Analytics tracking ID (e.g., Google Analytics). |

**All other environment variables** are consumed by the app at runtime from `.env.local` or the deployment platform's dashboard.

## Pointing `NEXT_PUBLIC_API_URL` at a running stellar-txwatch-core instance

Set `NEXT_PUBLIC_API_URL` to the base URL of your backend API, e.g.:

```
NEXT_PUBLIC_API_URL=https://api.mainnet.stellar-txwatch.com
```

The app (`lib/api.ts`) reads this value via `process.env.NEXT_PUBLIC_API_URL ?? ''`. When set:

- Contract registration and alert rule sync use the backend API.
- Webhook delivery history is fetched from the backend.
- The app operates in **API mode** (see [README.md](README.md#api-mode)).

If the backend is unreachable, API calls will return HTTP error messages (see [API error codes](#api-error-codes)).

## Health check endpoint recommendation

Add a health check route to the `stellar-txwatch-core` backend (e.g., `GET /healthz`) that returns `200 OK` when the service is running. Example:

```http
GET /healthz
200 OK
```

In production, use a load balancer or monitoring system (e.g., Kubernetes liveness probe, Docker `HEALTHCHECK`) to ping this endpoint. The web dashboard itself does not expose a dedicated health check, but the backend's health status can be used to determine overall system availability.