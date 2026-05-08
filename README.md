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
- Meta WhatsApp Cloud API webhook

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
- `GET /webhook/whatsapp` (Meta verification handshake)
- `POST /webhook/whatsapp` (incoming messages)

## Current Behavior

- First message from a new number triggers role onboarding (`1-4` selection).
- Role is persisted and audited.
- Subsequent messages route through Claude with role-aware system constraints.
- Conversation events are persisted for memory/audit.

## Next Build Steps

- Add strict tool-calling orchestration for payment actions (`record_payment`, `send_reminder`, etc.).
- Add membership scoping checks (collector can only touch their own groups).
- Add lender views with aggregate risk queries.
- Add admin endpoints for role overrides and investigations.
