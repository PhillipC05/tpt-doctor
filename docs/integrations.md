# TPT Doctor — Integrations Configuration

> How to configure third-party integrations for TPT Doctor.

---

## Overview

TPT Doctor integrates with several external services. None except Auth0 are required to run the platform — all integrations are optional and can be added when needed.

| Service | Purpose | Required | Cost |
|---------|---------|----------|------|
| **Auth0** | Authentication, MFA | ✅ Yes | Free tier (7k users) |
| **Stripe** | Payment processing | Optional | 2.9% + $0.30/transaction |
| **Airwallex** | Payment processing (AU/NZ/UK) | Optional | Varies by region |
| **Twilio** | SMS notifications | Optional | ~$0.0079/SMS |
| **Sentry** | Error monitoring | Optional | Free tier |
| **Surescripts** | ePrescribing | Optional | Contract required |
| **Quest/LabCorp** | Lab order integration | Optional | Contract required |
| **SendGrid/Mailgun** | Email notifications | Optional | Free tier (100/day) |
| **MinIO** | File storage (included) | ✅ Included | Free (self-hosted) |

---

## Auth0 (Required)

See [docs/auth-setup.md](auth-setup.md) for the full setup guide.

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.tptdoctor.com
AUTH0_CLIENT_ID=your-api-client-id
AUTH0_CLIENT_SECRET=your-api-client-secret
AUTH0_WEB_CLIENT_ID=your-web-client-id
AUTH0_PORTAL_CLIENT_ID=your-portal-client-id
```

---

## Stripe (Payment Processing)

### Setup

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your API keys from the Stripe Dashboard → Developers → API Keys
3. Set up a webhook endpoint

### Configuration

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
```

### Webhook

Configure a webhook in Stripe Dashboard → Developers → Webhooks:

| Setting | Value |
|---------|-------|
| Endpoint URL | `https://your-api-domain.com/api/v1/billing/webhooks/stripe` |
| Events | `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.paid`, `invoice.payment_failed` |

### Testing

Use Stripe test keys (prefix `sk_test_`) and test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## Twilio (SMS Notifications)

### Setup

1. Create a [Twilio account](https://www.twilio.com/try-twilio)
2. Buy a phone number (or use a trial number for testing)
3. Note your Account SID and Auth Token

### Configuration

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15551234567
```

### Quiet Hours

TPT Doctor respects patient quiet hours (configurable per patient). SMS will not be sent outside allowed hours.

---

## Email (Notifications)

### Option 1: SendGrid

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@your-clinic.com
SENDGRID_FROM_NAME=Your Clinic Name
```

### Option 2: Mailgun

```env
MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.your-clinic.com
MAILGUN_FROM_EMAIL=noreply@your-clinic.com
```

---

## Sentry (Error Monitoring)

### Setup

1. Create a [Sentry account](https://sentry.io/signup/)
2. Create a new project → Select "Node.js" for the API
3. Get your DSN from Project Settings

### Configuration

```env
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxx@xxxxxx.ingest.sentry.io/xxxxxx
```

### What's Tracked

- Unhandled API exceptions
- Database query errors
- Auth failures
- Payment processing errors

---

## Airwallex (Payment Processing — AU/NZ/UK)

### Setup

1. Create an [Airwallex account](https://www.airwallex.com/)
2. Generate API credentials in the dashboard

### Configuration

```env
AIRWALLEX_API_KEY=your-api-key
AIRWALLEX_CLIENT_ID=your-client-id
AIRWALLEX_WEBHOOK_SECRET=your-webhook-secret
```

---

## Surescripts (ePrescribing)

### Setup

Requires a direct contract with Surescripts or through a health information exchange.

### Configuration

```env
SURESCRIPTS_API_URL=https://api.surescripts.com
SURESCRIPTS_CLIENT_ID=your-client-id
SURESCRIPTS_CLIENT_SECRET=your-client-secret
```

---

## Lab Integration (Quest / LabCorp)

### Configuration

```env
# Quest Diagnostics
QUEST_API_KEY=your-api-key
QUEST_ACCOUNT_NUMBER=your-account-number

# LabCorp
LABCORP_API_KEY=your-api-key
LABCORP_ACCOUNT_NUMBER=your-account-number
```

---

## MinIO (S3-Compatible Storage)

MinIO is included in the Docker Compose stack and is the default storage provider for self-hosted deployments. It stores:

- Patient documents (scans, PDFs, images)
- Lab results
- Encrypted backups

### Default Configuration

```env
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=http://minio:9000
STORAGE_BUCKET=tpt-doctor-files
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
```

### Alternative: AWS S3

If you prefer AWS S3 (for cloud deployments):

```env
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=https://s3.us-east-1.amazonaws.com
STORAGE_REGION=us-east-1
STORAGE_BUCKET=tpt-doctor-files
STORAGE_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
STORAGE_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxx
STORAGE_FORCE_PATH_STYLE=false
```

---

## Twilio Video (Telemedicine)

Alternative to self-hosted Jitsi. See [docs/telemedicine-setup.md](telemedicine-setup.md) for details.

```env
TELEMEDICINE_PROVIDER=twilio
TWILIO_VIDEO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VIDEO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Integration Status Reference

| Integration | Status | Documentation |
|------------|--------|---------------|
| Auth0 | ✅ Fully implemented | [auth-setup.md](auth-setup.md) |
| Stripe | ✅ Fully implemented | Above |
| Airwallex | ✅ Fully implemented | Above |
| Twilio SMS | ✅ Fully implemented | Above |
| Twilio Video | ✅ Code ready | [telemedicine-setup.md](telemedicine-setup.md) |
| SendGrid | ✅ Fully implemented | Above |
| Jitsi Meet | ✅ Fully implemented | [telemedicine-setup.md](telemedicine-setup.md) |
| MinIO | ✅ Fully implemented | Above |
| Surescripts | ✅ API ready | Above (requires contract) |
| Quest Diagnostics | ✅ API ready | Above (requires contract) |
| LabCorp | ✅ API ready | Above (requires contract) |
| Sentry | ✅ Fully implemented | Above |