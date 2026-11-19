# Webhook receiver: Python (FastAPI)

A minimal endpoint that receives Stellar TxWatch alert webhooks. It:

- parses and validates the JSON payload with a Pydantic model (malformed bodies get a `422`)
- logs it
- returns `200` immediately and does any slow work in a `BackgroundTasks` job
- drops duplicate deliveries using `transaction_hash` + `rule_triggered`

## Run

Requires Python 3.9+.

```bash
cd examples/webhook-receiver-python
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 3001
```

The server listens on `http://localhost:3001/webhooks`. You can change the path with the `WEBHOOK_PATH` environment variable. CORS is open (`*`) so the dashboard's **Test** button can reach it from the browser. Set `CORS_ORIGIN=http://localhost:3000` to restrict it.

## Try it

```bash
curl -X POST http://localhost:3001/webhooks \
  -H 'Content-Type: application/json' \
  -d '{
    "label": "My DEX Contract",
    "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "network": "testnet",
    "rule_triggered": "LargeTransfer",
    "transaction_hash": "abc123",
    "function_name": "transfer",
    "amount": 50000,
    "timestamp": 1718000000000,
    "horizon_link": "https://horizon-testnet.stellar.org/transactions/abc123"
  }'
```

Send the same request twice and the second one is logged as a duplicate.

To receive alerts from the dashboard, enter `http://localhost:3001/webhooks` as the webhook URL and press **Test** on the Add Contract form. For a contract monitored by a remotely hosted core engine, expose the port with a tunnel such as `ngrok http 3001` and use the public URL instead.

## Idempotency

Webhooks can be delivered more than once, for example when the core engine retries after a timeout. A single transaction can also trigger **several rules**, and each one sends its own webhook with the same `transaction_hash`. See [Alert Rules → Edge cases](../../docs/ALERT_RULES.md#edge-cases).

So the de-duplication key is the pair:

```
<transaction_hash>:<rule_triggered>
```

This example keeps seen keys in memory for 24 hours, which is lost on restart and not shared between workers. If you run `uvicorn --workers N`, each worker has its own store. In production:

- store the key in your database with a **unique constraint** and insert it in the same transaction as your side effects, or
- use an atomic `SET key 1 NX EX 86400` in Redis before processing.

Always acknowledge with `200` as quickly as possible. Do the real work in a queue or background job, so slow downstream services don't cause timeouts and redundant retries.
