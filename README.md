# Kova WhatsApp Bot (Role-Based)

Express + Prisma + Claude backend for a role-aware WhatsApp bot.

## Roles

- `COLLECTOR_LEAD`
- `COLLECTOR_MEMBER`
- `END_USER`
- `LENDER_PARTNER`
- `KOVA_ADMIN`

Every inbound WhatsApp number maps to a user identity and role. Responses are role-gated.

## Tech Stack

- Node.js + Express
- Prisma + PostgreSQL
- Anthropic Claude API
- Twilio WhatsApp webhook + messaging API

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy env file:
   - `cp .env.example .env`
3. Set real values in `.env`.
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Run migrations (after DB is reachable):
   - `npm run prisma:migrate`
6. Start local server:
   - `npm run dev`

## Endpoints

- `GET /health`
- `GET /health/ready` (DB readiness + queue depth)
- `GET /health/metrics` (in-memory counters + alert flags)
- `GET /webhook/whatsapp` (verification handshake)
- `POST /webhook/whatsapp` (incoming messages)

## Current Behavior

- First message from a new number triggers role onboarding (`1-4` selection).
- Role is persisted and audited.
- Subsequent messages route through Claude with role-aware system constraints.
- Conversation events are persisted for memory/audit.

## Next Build Steps

## Production Environment Variables

Required:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `WHATSAPP_VERIFY_TOKEN`
- `PUBLIC_BASE_URL` (must match the public webhook base URL exactly)

Optional:

- `TWILIO_VALIDATE_SIGNATURE` (`true` by default; set `false` only for local debugging)

## Reliability Notes

- Webhook requests are acknowledged quickly and processed asynchronously.
- Outbound Twilio sends retry with exponential backoff.
- Inbound/outbound processing lifecycle is tracked in `ConversationEvent.processingStatus`.
