# TPT Doctor — API Documentation (OpenAPI/Swagger)

## Overview

The TPT Doctor API is a RESTful JSON API built with NestJS. It is documented using OpenAPI 3.0 (Swagger). The API documentation is automatically generated from decorators and is available at `/api/docs` when running in development mode.

## Base URL

All API endpoints are prefixed with `/api/v1/`.

**Production:** `https://api.tptdoctor.com/api/v1`
**Development:** `http://localhost:4000/api/v1`

## Authentication

The API uses Bearer JWT tokens issued by Auth0.

```
Authorization: Bearer <access_token>
```

### Auth0 Configuration

- **Domain:** Configured via `AUTH0_DOMAIN` env variable
- **Audience:** Configured via `AUTH0_AUDIENCE` env variable
- **Client ID:** Configured via `AUTH0_CLIENT_ID` env variable

## API Modules

### Auth Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Authenticate user (returns JWT) |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/profile` | Get current user profile |
| PATCH | `/auth/profile` | Update user profile |
| POST | `/auth/mfa/setup` | Configure MFA |
| POST | `/auth/mfa/verify` | Verify MFA code |

### Patients Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients` | List patients (paginated) |
| POST | `/patients` | Create patient |
| GET | `/patients/:id` | Get patient details |
| PATCH | `/patients/:id` | Update patient |
| DELETE | `/patients/:id` | Soft-delete patient |
| POST | `/patients/merge` | Merge duplicate patients |
| POST | `/patients/duplicates/search` | Search for duplicates |
| GET | `/patients/:id/consents` | Get patient consents |
| PATCH | `/patients/:id/consents/:consentType` | Update consent |
| POST | `/patients/:id/documents` | Upload document |
| GET | `/patients/:id/documents` | List documents |
| DELETE | `/patients/:id/documents/:docId` | Delete document |

### Appointments Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/appointments` | List appointments |
| POST | `/appointments` | Create appointment |
| GET | `/appointments/:id` | Get appointment details |
| PATCH | `/appointments/:id` | Update appointment |
| DELETE | `/appointments/:id` | Cancel appointment |
| GET | `/appointments/calendar` | Calendar view |
| POST | `/appointments/recurring` | Create recurring appointment |
| POST | `/appointments/waitlist` | Join waitlist |
| POST | `/appointments/reminders` | Configure reminders |
| POST | `/appointments/check-in` | Check-in patient |
| POST | `/appointments/:id/check-out` | Check-out patient |

### EHR Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ehr/encounters` | List encounters |
| POST | `/ehr/encounters` | Create encounter (SOAP) |
| GET | `/ehr/encounters/:id` | Get encounter |
| PATCH | `/ehr/encounters/:id` | Update encounter |
| DELETE | `/ehr/encounters/:id` | Delete encounter |
| GET | `/ehr/templates` | List EHR templates |
| POST | `/ehr/templates` | Create template |
| GET | `/ehr/decision-rules` | List CDS rules |
| POST | `/ehr/decision-rules` | Create rule |
| POST | `/ehr/patients/:id/timeline` | Get clinical timeline |

### Billing Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/billing/invoices` | List invoices |
| POST | `/billing/invoices` | Create invoice |
| GET | `/billing/invoices/:id` | Get invoice |
| POST | `/billing/claims` | Create insurance claim |
| POST | `/billing/claims/submit` | Submit claim (837 format) |
| POST | `/billing/claims/:id/appeal` | Appeal denied claim |
| POST | `/billing/payments` | Process payment |
| POST | `/billing/payments/provider` | Process via Stripe/Airwallex |
| GET | `/billing/cpt-codes` | List CPT codes |
| POST | `/billing/cpt-codes` | Add CPT code |
| POST | `/billing/insurance-verification` | Verify insurance |
| POST | `/billing/era` | Process ERA/EOB |
| POST | `/billing/statements/generate/:patientId` | Generate statement |
| POST | `/billing/aging-reports/generate` | Generate aging report |

### Prescriptions Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/prescriptions` | List prescriptions |
| POST | `/prescriptions` | Create prescription |
| GET | `/prescriptions/active/:patientId` | Active prescriptions |
| PATCH | `/prescriptions/:id/status` | Update status |
| POST | `/prescriptions/:id/send-to-pharmacy` | Send to pharmacy |
| GET | `/prescriptions/interactions/check/:patientId` | Check interactions |
| POST | `/prescriptions/controlled-substances` | Log controlled substance |
| GET | `/prescriptions/pharmacies` | Pharmacy directory |

### Lab Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lab/orders` | List lab orders |
| POST | `/lab/orders` | Create lab order |
| PATCH | `/lab/orders/:id/result` | Enter result |
| GET | `/lab/orders/abnormal` | Abnormal results |
| GET | `/lab/orders/pending` | Pending results |
| POST | `/lab/fhir-import` | Import HL7 FHIR |
| POST | `/lab/external-config` | Lab integration config |

### Staff Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff` | List staff |
| POST | `/staff` | Create staff record |
| GET | `/staff/:id` | Get staff details |
| PATCH | `/staff/:id` | Update staff |
| POST | `/staff/:id/schedule` | Set schedule |
| POST | `/staff/time-off` | Request time off |
| GET | `/staff/credentials` | List credentials |
| GET | `/staff/metrics/performance` | Performance metrics |

### Messages Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/inbox` | Inbox messages |
| GET | `/messages/sent` | Sent messages |
| GET | `/messages/thread/:id` | Message thread |
| POST | `/messages` | Send message |
| PATCH | `/messages/:id/read` | Mark as read |
| GET | `/message-templates` | List templates |
| POST | `/message-templates` | Create template |

### Telemedicine Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/telemedicine/sessions` | List sessions |
| POST | `/telemedicine/sessions` | Create session |
| PATCH | `/telemedicine/sessions/:id/status` | Update status |
| POST | `/telemedicine/sessions/:id/notes` | Add post-consult notes |

### Reporting Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reporting/dashboard` | Practice KPIs |
| GET | `/reporting/clinical` | Clinical quality measures |
| GET | `/reporting/revenue` | Financial reports |
| GET | `/reporting/appointments` | Appointment analytics |
| GET | `/reporting/demographics` | Patient demographics |
| POST | `/reporting/adhoc` | Ad-hoc report builder |
| POST | `/reporting/export/csv` | Export to CSV |
| POST | `/reporting/export/json` | Export to JSON |
| POST | `/reporting/export/pdf` | Export to PDF |

## Common Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "firstName",
      "message": "firstName must be a string"
    }
  ],
  "timestamp": "2026-05-14T12:00:00.000Z"
}
```

## Pagination

All list endpoints support pagination:
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)
- `sortBy` (field name)
- `sortOrder` (asc/desc)

## Rate Limiting

- 100 requests per minute per IP
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Tags

- Auth: Authentication & authorization
- Patients: Patient management
- EHR: Electronic Health Records
- Appointments: Appointment scheduling
- Billing: Billing & invoicing
- Prescriptions: Prescription management
- Lab: Lab orders & results
- Staff: Staff management
- Messages: Secure messaging
- Reporting: Reports & analytics
- Compliance: Compliance & audit