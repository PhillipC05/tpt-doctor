# TPT Doctor — Clinical Staff User Manual

## Overview

TPT Doctor is a comprehensive medical practice management platform designed for clinicians, nurses, and administrative staff. This manual covers daily workflows for clinical staff.

## Getting Started

### Login
1. Navigate to your clinic's TPT Doctor URL
2. Click "Login with Auth0"
3. Enter your credentials (SSO with Google Workspace or Azure AD available)
4. Complete MFA if prompted (TOTP, SMS, or hardware key)

### Dashboard
The dashboard displays:
- Today's appointment summary
- Pending tasks and alerts
- Key practice KPIs
- Recent patient activity

## Patient Management

### Searching for Patients
1. Click "Patients" in the left sidebar
2. Use the search bar to find by name, MRN, email, or phone
3. Results update in real-time as you type
4. Click a patient row to view full details

### Creating a New Patient
1. Click "Add Patient" button
2. Complete required fields: First Name, Last Name, DOB, Gender
3. Add optional fields: Email, Phone, Address, Insurance, Emergency Contact
4. Click "Save" — the system auto-generates an MRN
5. The patient appears in the list immediately

### Updating Patient Information
1. Navigate to the patient's profile
2. Click "Edit" on any section
3. Modify the necessary fields
4. Click "Save" — all changes are audit-logged

### Managing Consents
1. From patient profile, click "Consents" tab
2. Toggle each consent type (Treatment, Payment, Operations, Research, etc.)
3. Add notes if required
4. All consent changes are audit-logged with timestamps

## Appointments

### Viewing Calendar
1. Click "Appointments" in sidebar
2. Toggle between Day/Week/Month views
3. Filter by provider or appointment type
4. Color-coded by appointment type and status

### Creating Appointments
1. Click on a time slot in calendar, or click "New Appointment"
2. Search and select a patient
3. Select appointment type (Checkup, Follow-up, Telemedicine, etc.)
4. Set duration (defaults based on type)
5. Add notes or special instructions
6. Click "Save"

### Check-in / Check-out Workflow
1. **Check-in:** Find the appointment and click "Check In"
2. Patient status updates to CHECKED_IN; wait time tracking begins
3. **Check-out:** After visit, click "Check Out"
4. System calculates visit duration and wait time

### Managing Waitlist
1. Click "Waitlist" tab
2. View patients waiting for cancellations
3. Click "Notify" to send availability alert
4. Click "Book" once the patient confirms

## Electronic Health Records (EHR)

### Creating SOAP Notes
1. From patient profile, click "New Encounter"
2. Fill in the SOAP sections:
   - **Subjective:** Patient's reported symptoms
   - **Objective:** Vitals, exam findings
   - **Assessment:** Diagnosis with ICD-10 codes
   - **Plan:** Treatment plan, medications, follow-up
3. Add vitals: BP, HR, temperature, SpO2, weight, height
4. Add diagnosis codes (ICD-10 with auto-complete)
5. Click "Save"

### Viewing Clinical Timeline
1. From patient profile, click "Timeline"
2. View chronologically ordered: encounters, lab results, medications, immunizations
3. Filter by date range or event type

### Using EHR Templates
1. Click "Templates" in the EHR section
2. Browse templates by encounter type or category
3. Click "Use Template" to pre-fill a new encounter
4. Modify as needed before saving

### Clinical Decision Support
The system automatically checks:
- Drug-drug interactions when prescribing
- Allergies before medication orders
- Age-appropriate preventive care reminders
- Duplicate therapy warnings
- Guideline compliance checks

## Prescriptions

### Creating a Prescription
1. From patient profile, click "Prescribe"
2. Search medication by name (auto-complete with dosages)
3. Set: strength, form, route, frequency, duration, quantity, refills
4. Mark as "Dispense As Written" (DAW) if required
5. Click "Save" (DRAFT status) or "Submit" (SUBMITTED status)

### Checking Drug Interactions
1. Click "Check Interactions" from the prescription screen
2. System checks against current active medications
3. View severity: INFO, WARNING, CRITICAL
4. Document response to any interaction alerts

### Controlled Substances (DEA Compliance)
1. Select "Controlled Substance" checkbox
2. Enter DEA registration number
3. Complete the controlled substance log
4. All CS prescriptions are logged for DEA compliance

## Lab Orders

### Ordering Lab Tests
1. From patient profile, click "Order Lab"
2. Search for tests by name or LOINC code
3. Select tests from the panel or individual order
4. Set priority (Routine, Urgent, STAT)
5. Click "Submit"

### Viewing Lab Results
1. Results appear in the patient's timeline
2. Abnormal results are highlighted with flags
3. Click result to view details: value, unit, reference range, status
4. Click "Review" to acknowledge abnormal results

## Billing

### Creating Invoices
1. From patient profile, click "Billing" > "New Invoice"
2. Add line items with CPT codes
3. Set quantities and prices
4. Add discounts if applicable
5. Click "Save"

### Processing Payments
1. From invoice, click "Record Payment"
2. Select payment method: Cash, Card, Check, or Online
3. Enter amount
4. Click "Process" — integrated with Stripe/Airwallex

### Insurance Claims
1. Create invoice first
2. Click "Submit Claim"
3. System generates 837-format electronic claim
4. Track claim status: Submitted → Accepted/Rejected → Paid/Denied

## Secure Messaging

### Sending Messages
1. Click "Messages" in sidebar
2. Click "Compose"
3. Select recipient(s) from staff directory
4. Write subject and message
5. Attach files if needed (images, PDFs)
6. Mark as urgent if required
7. Click "Send"

### Using Message Templates
1. When composing, click "Use Template"
2. Select from categorized templates
3. Template content populates the message body
4. Customize as needed before sending

## Telemedicine

### Starting a Video Consult
1. Open the telemedicine appointment
2. Click "Start Video Call"
3. Grant camera/microphone permissions
4. The virtual waiting room notifies the patient
5. Begin consultation

### During Consultation
- Share screen for patient education
- Use in-consult chat for links/references
- Record session (with patient consent)
- Monitor connection quality indicator

### Post-Consultation
1. End the call
2. System prompts to add consultation notes
3. Notes are saved to the encounter record automatically

## Reporting

### Viewing Dashboard KPIs
1. Click "Reports" in sidebar
2. Dashboard shows: new patients, appointments, revenue, staff metrics
3. Click any KPI to drill down

### Generating Reports
1. Click "Reports" > "Generate Report"
2. Select report type: Clinical, Financial, Appointment, Demographics
3. Set parameters and date range
4. Click "Generate"
5. Export as CSV, JSON, or PDF

## Security Best Practices

1. **Never share passwords** — Use MFA at all times
2. **Log out** when leaving your workstation
3. **Clean desk policy** — No patient information on paper
4. **Report incidents** immediately to your security officer
5. **Minimum necessary access** — Only access PHI needed for your work
6. **Phishing awareness** — Verify email senders before clicking links
7. **Mobile devices** — Must be encrypted and PIN-protected