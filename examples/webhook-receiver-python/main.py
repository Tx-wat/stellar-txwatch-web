"""Minimal Stellar TxWatch webhook receiver (FastAPI).

Parses the alert payload, logs it, acknowledges with 200 straight away and
processes the alert in a background task so slow work never delays the response.
"""

import json
import logging
import os
import threading
import time
from typing import Optional

from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("txwatch")

WEBHOOK_PATH = os.environ.get("WEBHOOK_PATH", "/webhooks")

# How long a delivery key is remembered for de-duplication.
DEDUPE_TTL_SECONDS = 24 * 60 * 60


class AlertPayload(BaseModel):
    """Mirrors AlertPayload in types/index.ts."""

    label: str = ""
    contract_id: str
    network: str
    rule_triggered: str
    transaction_hash: str
    function_name: Optional[str] = None
    amount: Optional[float] = None
    timestamp: int
    horizon_link: str = ""


# In-memory idempotency store: key -> time first seen.
# Fine for a single process; use a database unique constraint or Redis SET NX in production.
_seen: dict[str, float] = {}
_seen_lock = threading.Lock()


def delivery_key(payload: AlertPayload) -> str:
    # One transaction can trigger several rules, and each rule sends its own
    # webhook, so the hash alone is not unique. Use hash + rule together.
    return f"{payload.transaction_hash}:{payload.rule_triggered}"


def mark_seen(key: str) -> bool:
    now = time.time()
    with _seen_lock:
        for k in [k for k, first_seen in _seen.items() if now - first_seen > DEDUPE_TTL_SECONDS]:
            del _seen[k]
        if key in _seen:
            return False
        _seen[key] = now
        return True


def forget(key: str) -> None:
    with _seen_lock:
        _seen.pop(key, None)


def handle_alert(payload: AlertPayload) -> None:
    key = delivery_key(payload)
    try:
        # Put your own logic here: notify Slack, write to a database, page on-call, ...
        if payload.transaction_hash.startswith("TEST_HASH_"):
            log.info("test webhook received, skipping side effects")
            return
        log.info(
            "%s on %s (%s)%s%s",
            payload.rule_triggered,
            payload.label or payload.contract_id,
            payload.network,
            f" fn={payload.function_name}" if payload.function_name else "",
            f" amount={payload.amount} XLM" if payload.amount is not None else "",
        )
    except Exception:
        log.exception("failed to process %s", key)
        # The delivery was already acknowledged, so forget the key to let a
        # manual replay through.
        forget(key)


app = FastAPI(title="TxWatch webhook receiver")

# The dashboard's "Test" button posts from the browser, so allow CORS.
# The core engine posts server-to-server and doesn't need it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "*")],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.post(WEBHOOK_PATH)
def receive(payload: AlertPayload, background_tasks: BackgroundTasks):
    # FastAPI has already parsed and validated the body; malformed payloads get a 422.
    log.info("payload %s", json.dumps(payload.model_dump(exclude_none=True)))

    key = delivery_key(payload)
    if not mark_seen(key):
        log.info("duplicate delivery %s, ignoring", key)
        return {"ok": True, "duplicate": True}

    # Runs after the 200 response has been sent.
    background_tasks.add_task(handle_alert, payload)
    return {"ok": True}
