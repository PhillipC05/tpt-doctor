# TPT Doctor — Auth0 Setup Guide

> This guide walks through setting up Auth0 for authentication. This is the **only external service required** to run TPT Doctor.

---

## What is Auth0?

Auth0 is an identity platform that handles user authentication, password management, MFA, and social logins. TPT Doctor uses it as the sole authentication provider. You need a free Auth0 account to run the platform.

**Cost:** Auth0 has a generous free tier supporting up to 7,000 active users — sufficient for most clinics.

---

## Step 1: Create an Auth0 Account

1. Go to [https://auth0.com/signup](https://auth0.com/signup)
2. Sign up with email/password, Google, or GitHub
3. Choose **"I need it for my personal project"** or **"My company's app"** (doesn't matter)
4. Select your **tenant region**:
   - **US** — for North American deployments (HIPAA)
   - **EU** — for European deployments (GDPR)
   - **AU** — for Australian deployments (AU Privacy Act)
5. Click **Create Account**

---

## Step 2: Configure Your Auth0 Tenant

Your Auth0 **tenant** is a logical container for your authentication configuration.

1. Go to the [Auth0 Dashboard](https://manage.auth0.com)
2. Note your **tenant domain** at the top left — it looks like `dev-xxxxx.us.auth0.com` or `my-clinic.us.auth0.com`
3. This domain is your `AUTH0_DOMAIN` environment variable

---

## Step 3: Create an Auth0 API

The API defines how applications authenticate with your backend.

1. In the left sidebar, go to **Applications → APIs**
2. Click **Create API**
3. Fill in:
   - **Name:** `TPT Doctor API`
   - **Identifier:** `https://api.tptdoctor.com`
   - **Signing Algorithm:** `RS256`
4. Click **Create**

After creation, note the **Identifier** (`https://api.tptdoctor.com`) — this is your `AUTH0_AUDIENCE` value.

---

## Step 4: Create Applications

Auth0 uses "Applications" to represent clients that need authentication. TPT Doctor needs three applications.

### 4a. Regular Web Application (for the API)

This authenticates the backend API itself.

1. Go to **Applications → Applications**
2. Click **Create Application**
3. Fill in:
   - **Name:** `TPT Doctor API (Backend)`
   - **Application Type:** `Regular Web Application`
4. Click **Create**
5. Go to the **Settings** tab and note:
   - **Client ID** — this is your `AUTH0_CLIENT_ID`
   - **Client Secret** — this is your `AUTH0_CLIENT_SECRET`
6. Under **Application URIs**, set:
   - **Allowed Callback URLs:** `http://localhost:4000/api/v1/auth/callback`
   - **Allowed Logout URLs:** `http://localhost:4000`

### 4b. Single Page Application (for the Staff Web App)

This authenticates your clinical staff users.

1. Click **Create Application**
2. Fill in:
   - **Name:** `TPT Doctor Web (Staff)`
   - **Application Type:** `Single Page Application`
3. Click **Create**
4. Go to the **Settings** tab and note:
   - **Client ID** — this is your `AUTH0_WEB_CLIENT_ID`
5. Under **Application URIs**, set:

   **Development:**
   ```
   Allowed Callback URLs: http://localhost:5173
   Allowed Logout URLs: http://localhost:5173
   Allowed Web Origins: http://localhost:5173
   ```

   **Production (add after deployment):**
   ```
   Allowed Callback URLs: http://localhost:5173, https://your-clinic-domain.com
   Allowed Logout URLs: http://localhost:5173, https://your-clinic-domain.com
   Allowed Web Origins: http://localhost:5173, https://your-clinic-domain.com
   ```

6. Scroll down and under **Refresh Token Rotation**, enable:
   - **Rotation** — ✅
   - **Absolute expiration** — ✅ (set to 86400 seconds / 24 hours)

### 4c. Single Page Application (for the Patient Portal)

This authenticates your patients.

1. Click **Create Application**
2. Fill in:
   - **Name:** `TPT Doctor Patient Portal`
   - **Application Type:** `Single Page Application`
3. Click **Create**
4. Go to the **Settings** tab and note:
   - **Client ID** — this is your `AUTH0_PORTAL_CLIENT_ID`
5. Under **Application URIs**, set:

   **Development:**
   ```
   Allowed Callback URLs: http://localhost:5174
   Allowed Logout URLs: http://localhost:5174
   Allowed Web Origins: http://localhost:5174
   ```

   **Production (add after deployment):**
   ```
   Allowed Callback URLs: http://localhost:5174, https://portal.your-clinic-domain.com
   Allowed Logout URLs: http://localhost:5174, https://portal.your-clinic-domain.com
   Allowed Web Origins: http://localhost:5174, https://portal.your-clinic-domain.com
   ```

---

## Step 5: Configure Authentication Methods

1. Go to **Authentication → Authentication Profile**
2. Under **Applications**, add both of your Single Page Applications:
   - `TPT Doctor Web (Staff)`
   - `TPT Doctor Patient Portal`
3. Under **Login Methods**, enable:
   - **Username-Password-Authentication** (Database) — keep enabled
   - **Google** — optional, for social login
   - **Microsoft** — optional, for Azure AD/Office 365
   - **Apple** — optional, for patient portal

---

## Step 6: MFA Configuration (Recommended)

HIPAA requires multi-factor authentication. Auth0 MFA is free.

1. Go to **Security → Multi-factor Auth**
2. Toggle **On** for MFA
3. Enable at least:
   - **Push Notification** (Auth0 Guardian) — easiest for users
   - **TOTP** (Google Authenticator, Authy)
   - **SMS** — note: costs depend on provider
4. Under **MFA Settings**:
   - **Factors:** Select which MFA methods users can choose
   - **Enrollment:** Set to "Required" for clinical staff, "Optional" for patients
5. Under **Policy**:
   - **Require MFA:** Check "Always" or "Never" depending on your policy
   - For HIPAA: require MFA for all staff accounts

---

## Step 7: Configure User Management

### 7a. Create Admin User

1. Go to **User Management → Users**
2. Click **Create User**
3. Fill in:
   - **Email:** admin@your-clinic.com
   - **Password:** (strong password, minimum 12 chars)
   - **Connection:** Username-Password-Authentication
4. Click **Create User**

### 7b. Create User Roles (Optional)

1. Go to **User Management → Roles**
2. Create roles matching TPT Doctor's permission model:
   - `SUPER_ADMIN`
   - `PRACTICE_ADMIN`
   - `DOCTOR`
   - `NURSE`
   - `RECEPTIONIST`
   - `PATIENT`
3. Assign roles to users as needed

### 7c. Link Auth0 Users to TPT Doctor

Auth0 handles authentication. The user's role and tenant in TPT Doctor are managed through the app's RBAC system. After first login via Auth0, the TPT Doctor seed script creates matching user records.

---

## Step 8: Configure Branding (Optional)

1. Go to **Branding → Settings**
2. Upload your clinic's logo
3. Set primary colors to match your brand
4. Under **Universal Login**, customize the login page

---

## Step 9: Test the Setup

### Test in Development

1. Start TPT Doctor: `pnpm run dev`
2. Open `http://localhost:5173`
3. Click **Login**
4. You should be redirected to Auth0's login page
5. Log in with the admin user you created
6. You should be redirected back to the TPT Doctor dashboard

### Test the API

```bash
# Get a token from Auth0 (replace with your values)
curl --request POST \
  --url https://YOUR_TENANT.us.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id": "YOUR_AUTH0_CLIENT_ID",
    "client_secret": "YOUR_AUTH0_CLIENT_SECRET",
    "audience": "https://api.tptdoctor.com",
    "grant_type": "client_credentials"
  }'

# Test the health endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/v1/health
```

---

## Step 10: Production Checklist

Before going to production, ensure:

- [ ] **Custom domain** configured in Auth0 (instead of `your-tenant.us.auth0.com`)
- [ ] **Strong password policy** — minimum 12 characters, complexity required
- [ ] **MFA required** — at least for all clinical staff accounts
- [ ] **Brute force protection** enabled (Settings → Security → Bot Detection)
- [ ] **Callback URLs** updated to your production domain
- [ ] **Session timeout** configured (24 hours recommended)
- [ ] **API rate limiting** enabled (TPT Doctor has built-in throttling)
- [ ] **Audit logging** — Auth0 logs access to logins (you can export to Log-to-Custom-Event)

---

## Environment Variables Reference

| Variable | Where to Find It |
|----------|-----------------|
| `AUTH0_DOMAIN` | Auth0 Dashboard → top left (e.g., `your-tenant.us.auth0.com`) |
| `AUTH0_AUDIENCE` | Applications → APIs → TPT Doctor API → Identifier |
| `AUTH0_CLIENT_ID` | Applications → TPT Doctor API (Backend) → Client ID |
| `AUTH0_CLIENT_SECRET` | Applications → TPT Doctor API (Backend) → Client Secret |
| `AUTH0_WEB_CLIENT_ID` | Applications → TPT Doctor Web (Staff) → Client ID |
| `AUTH0_PORTAL_CLIENT_ID` | Applications → TPT Doctor Patient Portal → Client ID |

---

## Troubleshooting Auth0

| Problem | Solution |
|---------|----------|
| **"Invalid audience" error** | Ensure AUTH0_AUDIENCE matches exactly what's in the Auth0 API definition (e.g., `https://api.tptdoctor.com`) |
| **"Callback URL mismatch"** | The URL you're accessing from must be in the callback URLs list for that application |
| **Blank screen after login** | Check Allowed Web Origins and CORS_ORIGINS — must include your app's URL |
| **Token expired** | Refresh token rotation must be enabled in the SPA settings |
| **Login works, API returns 401** | Check that the API audience matches between Auth0 and your environment variables |
| **"Access denied" for users** | Assign the user a role in Auth0, and ensure the app's RBAC has that role |