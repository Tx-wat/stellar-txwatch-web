# Mock API Strategy

This document explains how to develop UI features before the backend is ready.

## Using Environment Variables

Set `NEXT_PUBLIC_API_URL` in `.env.local` to point to your mock API:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Mock API Server

Create a simple mock API server (e.g., `mock-server.js`):

```javascript
const http = require('http')

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')

  if (req.url === '/contracts' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify([{ id: 'test-contract', name: 'Test' }]))
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

server.listen(3001, () => console.log('Mock API on :3001'))
```

Run with: `node mock-server.js`

## Development Workflow

1. Create mock responses matching expected API contracts
2. Develop UI components against mock data
3. When real API is ready, update `NEXT_PUBLIC_API_URL`
4. Tests verify API layer handles responses correctly

## Testing

Use `apiFetch()` from `lib/api.ts` for all API calls. Mock `fetch` in tests:

```typescript
jest.mock('lib/api')
// or
global.fetch = jest.fn().mockResolvedValue(...)
```
