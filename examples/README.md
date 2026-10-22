# Examples

Copy-paste starting points for receiving Stellar TxWatch alert webhooks.

| Example | Stack | Run |
|---|---|---|
| [`webhook-receiver-node`](./webhook-receiver-node) | Node.js 18+, Express | `npm install && npm start` |
| [`webhook-receiver-python`](./webhook-receiver-python) | Python 3.9+, FastAPI | `pip install -r requirements.txt && uvicorn main:app --port 3001` |

Both listen on `http://localhost:3001/webhooks`, which matches `WEBHOOK_TEST_URL` in `.env.example`. Both:

1. Parse the [webhook payload](../README.md#webhook-payload-shape) and log it.
2. Return `200` immediately and process the alert asynchronously.
3. De-duplicate deliveries on `transaction_hash` + `rule_triggered`. One transaction can fire several rules, so the hash alone is not unique. See [docs/ALERT_RULES.md](../docs/ALERT_RULES.md#multiple-rules-matching-one-transaction).

These examples are standalone projects with their own dependencies. They are not part of the Next.js app build.
