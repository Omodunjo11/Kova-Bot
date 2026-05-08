# Kova Production Runbook

## Incident Triage

1. Check `GET /health/ready` for DB readiness and queue depth.
2. Check `GET /health/metrics` for `queueFailed`, `twilioSendFailure`, and `webhookSignatureRejected`.
3. Review structured logs for `webhook_error`, `queue_job_failed`, or `claude_request_failed`.

## Replay Procedure

1. Query failed events in `ConversationEvent` where `processingStatus = 'FAILED'`.
2. Re-submit the corresponding inbound payload to `POST /webhook/whatsapp` from a trusted internal script.
3. Confirm new `ConversationEvent` entries with `processingStatus = 'COMPLETED'`.

## Key Rotation

1. Rotate `TWILIO_AUTH_TOKEN` in Twilio console.
2. Update production secret store.
3. Restart service and verify webhook signatures still pass.
4. Rotate `ANTHROPIC_API_KEY` on a separate maintenance window.

## Twilio Outage Handling

1. Keep accepting inbound webhooks and queue jobs.
2. If `twilioSendFailure` spikes, notify operations and pause reminders.
3. Reprocess failed queue jobs once Twilio recovers.

## Claude Outage Handling

1. Monitor `claudeFailure` counter.
2. Confirm fallback user message is returned.
3. Temporarily route only deterministic tool-driven responses for critical flows.
