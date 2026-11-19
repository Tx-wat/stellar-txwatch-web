// Minimal Stellar TxWatch webhook receiver (Express).
//
// Parses the alert payload, logs it, acknowledges with 200 straight away and
// processes the alert afterwards so slow work never delays the response.

const express = require('express')

const PORT = Number(process.env.PORT) || 3001
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/webhooks'

// How long a delivery key is remembered for de-duplication.
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000

const REQUIRED_FIELDS = ['contract_id', 'network', 'rule_triggered', 'transaction_hash', 'timestamp']

// In-memory idempotency store: key -> time first seen.
// Fine for a single process; use a database unique constraint or Redis SET NX in production.
const seen = new Map()

function deliveryKey(payload) {
  // One transaction can trigger several rules, and each rule sends its own
  // webhook, so the hash alone is not unique. Use hash + rule together.
  return `${payload.transaction_hash}:${payload.rule_triggered}`
}

function markSeen(key) {
  const now = Date.now()
  for (const [k, firstSeen] of seen) {
    if (now - firstSeen > DEDUPE_TTL_MS) seen.delete(k)
  }
  if (seen.has(key)) return false
  seen.set(key, now)
  return true
}

async function handleAlert(payload) {
  // Put your own logic here: notify Slack, write to a database, page on-call, ...
  if (payload.transaction_hash.startsWith('TEST_HASH_')) {
    console.log('[txwatch] test webhook received, skipping side effects')
    return
  }
  console.log(
    `[txwatch] ${payload.rule_triggered} on ${payload.label || payload.contract_id} (${payload.network})`,
    payload.function_name ? `fn=${payload.function_name}` : '',
    payload.amount !== undefined ? `amount=${payload.amount} XLM` : '',
  )
}

const app = express()

// The dashboard's "Test" button posts from the browser, so allow CORS.
// The core engine posts server-to-server and doesn't need it.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use(express.json({ limit: '100kb' }))

app.post(WEBHOOK_PATH, (req, res) => {
  const payload = req.body

  const missing = REQUIRED_FIELDS.filter((f) => payload?.[f] === undefined)
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` })
  }

  console.log('[txwatch] payload', JSON.stringify(payload))

  const key = deliveryKey(payload)
  if (!markSeen(key)) {
    console.log(`[txwatch] duplicate delivery ${key}, ignoring`)
    return res.status(200).json({ ok: true, duplicate: true })
  }

  // Acknowledge first, then process asynchronously.
  res.status(200).json({ ok: true })

  setImmediate(() => {
    handleAlert(payload).catch((err) => {
      console.error(`[txwatch] failed to process ${key}`, err)
      // The delivery was already acknowledged, so forget the key to let a
      // manual replay through.
      seen.delete(key)
    })
  })
})

// Malformed JSON bodies end up here.
app.use((err, _req, res, _next) => {
  console.warn('[txwatch] bad request', err.message)
  res.status(400).json({ error: 'Invalid JSON body' })
})

app.listen(PORT, () => {
  console.log(`TxWatch webhook receiver listening on http://localhost:${PORT}${WEBHOOK_PATH}`)
})
