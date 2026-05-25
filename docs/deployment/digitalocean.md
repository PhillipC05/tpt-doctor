# Deploy TPT Doctor on DigitalOcean

> Two options: **App Platform** (no server management) or **Droplet** (full control).

> **HIPAA Compliance:** DigitalOcean signs Business Associate Agreements (BAAs) and their data centers meet physical security requirements. For a full HIPAA-compliant deployment, use the **Droplet** option (App Platform does not currently offer BAAs). See the [HIPAA section](#hipaa-compliance-on-digitalocean) for details.

---

## Option 1: DigitalOcean App Platform (Simplest — Click to Deploy)

Deploys directly from your GitHub repo — no server to manage.

### Prerequisites

- A [DigitalOcean account](https://cloud.digitalocean.com/registrations/new)
- Your code pushed to a GitHub repository
- An [Auth0](https://auth0.com/signup) tenant

### Step 1: Fork the repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/tpt-doctor.git
cd tpt-doctor
```

### Step 2: Create a DigitalOcean App

1. Go to **Apps → Create App**
2. Connect your GitHub repository
3. Select the branch (e.g., `main`)
4. Click **Next**

### Step 3: Configure services

DigitalOcean will auto-detect the Dockerfiles. Configure each:

**Web App (staff frontend)**
| Setting | Value |
|---------|-------|
| Source Directory | `/` (or fork) |
| Run Command | Leave empty (uses Dockerfile entrypoint) |
| Dockerfile Path | `apps/web/Dockerfile` |
| HTTP Port | 80 |
| Instance Size | Basic - $6/mo |

**Patient Portal**
| Setting | Value |
|---------|-------|
| Source Directory | `/` (or fork) |
| Dockerfile Path | `apps/patient-portal/Dockerfile` |
| HTTP Port | 80 |
| Instance Size | Basic - $6/mo |

**API Backend**
| Setting | Value |
|---------|-------|
| Source Directory | `/` (or fork) |
| Dockerfile Path | `apps/api/Dockerfile` |
| HTTP Port | 4000 |
| Instance Size | Basic - $12/mo |
| HTTP Request Routes | `/api/*` |

### Step 4: Add environment variables

Under each component, add these environment variables:

**For the API component:**

```
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
CORS_ORIGINS=https://${APP_DOMAIN},https://${PATIENT_PORTAL_DOMAIN}
DATABASE_URL=postgresql://tpt:YOUR_PASSWORD@${DB_HOST}:25060/tpt_doctor?sslmode=require
DATABASE_SSL=true
REDIS_URL=redis://${REDIS_HOST}:6379
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.tptdoctor.com
AUTH0_CLIENT_SECRET=your-client-secret
ENCRYPTION_PROVIDER=local
ENCRYPTION_MASTER_KEY=generate_64_char_hex_key
LOG_LEVEL=info
```

**For the Web App component:**

```
VITE_API_URL=https://${API_APP_DOMAIN}
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-web-client-id
VITE_AUTH0_AUDIENCE=https://api.tptdoctor.com
```

**For the Patient Portal component:**

```
VITE_API_URL=https://${API_APP_DOMAIN}
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-portal-client-id
VITE_AUTH0_AUDIENCE=https://api.tptdoctor.com
```

### Step 5: Add managed Databases and Redis

When creating the app, DigitalOcean will prompt you to add:

1. **Add Database** → Create a **PostgreSQL 16** database ($12-15/mo)
2. **Add Redis** → Create a Redis database ($12-15/mo)

These are automatically linked to your app via environment variables.

### Step 6: Deploy

Click **Create Resources**. DigitalOcean will:
- Build each Docker image
- Provision the database and Redis
- Deploy all services
- Provide HTTPS URLs for each component

Your app will be live at:
- **Web App:** `https://web-app-xxxxx.ondigitalocean.app`
- **Patient Portal:** `https://patient-portal-xxxxx.ondigitalocean.app`
- **API:** `https://api-app-xxxxx.ondigitalocean.app`

### Step 7: Configure Auth0 callback URLs

In your Auth0 dashboard, update the callback URLs:

**Single Page Application (Web App):**
```
Allowed Callback URLs: https://web-app-xxxxx.ondigitalocean.app
Allowed Logout URLs: https://web-app-xxxxx.ondigitalocean.app
Allowed Web Origins: https://web-app-xxxxx.ondigitalocean.app
```

**Single Page Application (Patient Portal):**
```
Allowed Callback URLs: https://patient-portal-xxxxx.ondigitalocean.app
Allowed Logout URLs: https://patient-portal-xxxxx.ondigitalocean.app
Allowed Web Origins: https://patient-portal-xxxxx.ondigitalocean.app
```

**Regular Web Application (API):**
```
Allowed Callback URLs: https://api-app-xxxxx.ondigitalocean.app/api/v1/auth/callback
```

---

## Option 2: DigitalOcean Droplet (Full Control)

For when you want a full server with Docker Compose (includes telemedicine, monitoring, MinIO storage).

### Step 1: Create a Droplet

1. Go to **Droplets → Create**
2. **Choose an image:** Ubuntu 24.04 LTS
3. **Choose a plan:** 
   - **Basic (8 GB / 4 CPUs)** — $48/mo or **Premium Intel (8 GB / 4 CPUs)** — $56/mo
   - Minimum: 4 GB RAM, 2 CPUs
   - Recommended: 8 GB RAM, 4 CPUs
4. **Add SSH key** for secure access
5. **Enable monitoring** (optional but recommended)
6. **Create Droplet**

### Step 2: SSH in and deploy

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group changes
exit
```

```bash
# SSH back in
ssh root@YOUR_DROPLET_IP

# Clone the repository
git clone https://github.com/PhillipC05/tpt-doctor.git
cd tpt-doctor

# Configure environment
cp .env.production.example .env
nano .env   # Edit with your values

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Start everything
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d

# Run migrations
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate

# Seed demo data (optional)
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:seed
```

### Step 3: Set up a domain (optional but recommended)

```bash
# Point your domain's DNS A record to the Droplet IP
# Then configure Nginx with Let's Encrypt:
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec nginx certbot --nginx -d your-domain.com
```

### Step 4: Configure the firewall

```bash
# Allow web traffic
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/udp  # Telemedicine
ufw enable
```

---

## Estimated Monthly Cost

| Service | App Platform | Droplet |
|---------|-------------|---------|
| API | $12/mo | Included |
| Web App | $6/mo | Included |
| Patient Portal | $6/mo | Included |
| Database (PostgreSQL) | $12/mo | Included |
| Redis | $12/mo | Included |
| Droplet | — | $48/mo |
| **Total** | **~$48/mo** | **~$48/mo** |

> **Note:** App Platform auto-scales down to zero when not in use, so costs can be lower for development/testing.

---

## Updating Your Deployment

### App Platform
Push to your GitHub repository — DigitalOcean auto-deploys.

### Droplet

```bash
ssh root@YOUR_DROPLET_IP
cd tpt-doctor
git pull
docker compose -f infrastructure/on-premise/docker-compose.production.yml down
docker compose -f infrastructure/on-premise/docker-compose.production.yml pull
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate
```

---

---

## HIPAA Compliance on DigitalOcean

DigitalOcean is a popular choice for HIPAA-compliant hosting, but there are important distinctions between the two deployment options.

### Droplet vs App Platform

| Requirement | Droplet (VPS) | App Platform |
|------------|--------------|--------------|
| **BAA Available** | ✅ Yes | ❌ No (as of 2024) |
| **OS-Level Controls** | ✅ Full root access | ❌ Managed platform |
| **Encrypted Volumes** | ✅ You control | ❌ Platform manages |
| **Network Controls** | ✅ Custom firewall, VPC | ❌ Limited |
| **Audit Logging** | ✅ System auditd available | ❌ Platform logs only |
| **Suitable for PHI** | ✅ Yes | ⚠️ Not recommended |

> **For HIPAA-compliant production use, choose the Droplet option.** App Platform is fine for development, testing, or non-PHI evaluation.

### Getting a BAA from DigitalOcean

1. Go to the [DigitalOcean Trust Center](https://www.digitalocean.com/trust/)
2. Request a BAA via their support form
3. Provide your organization details
4. DigitalOcean will send you an executed BAA

The BAA covers:
- Appropriate safeguards for PHI
- Reporting of security incidents
- Subcontractor obligations (DigitalOcean's data centers)
- Return or destruction of PHI at termination

### Droplet Security Checklist for HIPAA

When you deploy on a Droplet, follow this checklist to meet your compliance obligations:

```bash
# 1. Use encrypted volumes (available in Droplet creation)
#    - Select "Additional Storage" → enable encryption

# 2. Configure the firewall (Droplet-level + UFW)
#    - Cloud firewall: only ports 22, 80, 443, 3478/udp
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 3478/udp && ufw enable

# 3. Disable password SSH auth
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 4. Enable automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades

# 5. Enable system auditing
apt install auditd -y
auditctl -e 1

# 6. Set up automated backups (Droplet settings → Enable Backups, $2/mo)
```

### Built-in HIPAA Technical Safeguards

TPT Doctor provides the software-level compliance automatically:

| Safeguard | Implementation |
|-----------|---------------|
| All PHI encrypted at rest | AES-256-GCM column-level encryption + encrypted docker volumes |
| All data encrypted in transit | TLS 1.2+ via Nginx + HSTS |
| Immutable audit trail | SHA-256 cryptographic chain, tamper detection |
| Access controls | Auth0 MFA + 6-role RBAC with 30+ permissions |
| Automatic logoff | 15-minute session timeout |
| Emergency access | Break-glass accounts with auto-expiry |
| Automated encrypted backups | AES-256 encrypted, stored in MinIO, 30-day retention |

### What You Still Need to Do

- **Designate a Security Officer** — someone responsible for HIPAA compliance
- **Conduct annual risk assessments** — TPT Doctor's OWASP ZAP scanner helps with technical assessment
- **Provide annual security training** — training templates included in `packages/compliance/src/security-training.ts`
- **Establish breach notification procedures** — use TPT Doctor's breach notification module
- **Review audit logs regularly** — use the audit log viewer in the web app
- **Customize security policies** — templates in `docs/security/` need your organization's details

---

## Alternative: CapRover (Open Source PaaS)

[CapRover](https://caprover.com/) is a free, open-source PaaS that runs on any VPS (DigitalOcean, Linode, Hetzner, etc.) and gives you a Heroku-like experience:

```bash
# Install CapRover on your VPS
docker run -p 80:80 -p 443:443 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock caprover/caprover

# Then deploy via the CapRover web UI using the Dockerfiles