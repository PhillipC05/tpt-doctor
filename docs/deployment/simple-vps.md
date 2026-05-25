# Deploy TPT Doctor on Any VPS (Linode, Vultr, Hetzner, etc.)

> A generic guide for deploying on any Linux VPS using Docker Compose.  
> Works with: **Linode**, **Vultr**, **Hetzner**, **OVHcloud**, **Scaleway**, **IONOS**, and any provider offering a Ubuntu VM.

> **HIPAA Compliance:** TPT Doctor implements all required HIPAA technical safeguards (encryption at rest, encryption in transit, audit logging, RBAC, access controls). For a fully HIPAA-compliant deployment on a VPS, see the [HIPAA Compliance section](#hipaa-compliance-on-a-vps) below.

---

## Prerequisites

- A Linux VPS with **Ubuntu 24.04 LTS** (recommended)
- Minimum **4 GB RAM, 2 CPU cores** (8 GB RAM, 4 cores recommended for production)
- A domain name (optional but recommended)
- An [Auth0](https://auth0.com/signup) tenant

---

## Step 1: Provision Your VPS

Choose any provider:

| Provider | Starting Price | Deployment Guide |
|----------|---------------|-----------------|
| **Linode** | $12/mo (4 GB) | Create Linode → Deploy Ubuntu 24.04 |
| **Vultr** | $12/mo (4 GB) | Deploy instance → Choose Ubuntu 24.04 |
| **Hetzner** | €5.99/mo (4 GB) | Create Server → Ubuntu 24.04 |
| **OVHcloud** | €5.50/mo (4 GB) | Create VPS → Ubuntu 24.04 |
| **Scaleway** | €7.99/mo (4 GB) | Create Instance → Ubuntu 24.04 |
| **IONOS** | €6/mo (4 GB) | Create VPS → Ubuntu 24.04 |

When creating the server:
- **OS:** Ubuntu 24.04 LTS
- **Add SSH key** for passwordless login
- **Enable backups** (usually $1-3 extra/mo)

---

## Step 2: First Login and Setup

```bash
# SSH into your server (replace with your IP)
ssh root@YOUR_SERVER_IP

# Update everything
apt update && apt upgrade -y

# Set the hostname
hostnamectl set-hostname tpt-doctor

# Reboot to apply updates
reboot
```

---

## Step 3: Install Docker

```bash
# Quick install (works on all Ubuntu/Debian systems)
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group
usermod -aG docker $USER

# Enable Docker to start on boot
systemctl enable docker

# Log out and back in
exit
```

```bash
# Reconnect and verify Docker is working
ssh root@YOUR_SERVER_IP
docker --version
docker compose version
```

---

## Step 4: Clone and Configure

```bash
# Clone the repository
cd /opt
git clone https://github.com/PhillipC05/tpt-doctor.git
cd tpt-doctor

# Copy the environment template
cp .env.production.example .env

# Generate an encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit the .env file
nano .env
```

### Minimum environment variables to set:

```env
# REQUIRED — change these
ENCRYPTION_MASTER_KEY=<paste the 64-char key you just generated>
REDIS_PASSWORD=<choose-a-random-password>
POSTGRES_PASSWORD=<choose-another-random-password>
MINIO_ACCESS_KEY=<choose-a-minio-access-key>
MINIO_SECRET_KEY=<choose-a-minio-secret-key>
JITSI_PASSWORD=<choose-a-jitsi-password>

# REQUIRED — from your Auth0 account
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.tptdoctor.com
AUTH0_CLIENT_ID=your-api-client-id
AUTH0_CLIENT_SECRET=your-api-client-secret
AUTH0_WEB_CLIENT_ID=your-web-client-id
AUTH0_PORTAL_CLIENT_ID=your-portal-client-id
```

---

## Step 5: Configure the Firewall

```bash
# Install and configure UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw allow 3478/udp   # Telemedicine (Jitsi TURN)
ufw --force enable

# Verify
ufw status
```

---

## Step 6: Deploy the Stack

```bash
# Start all services (this will take a minute on first run)
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d

# Check everything is running
docker compose -f infrastructure/on-premise/docker-compose.production.yml ps

# Run database migrations
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate

# Seed demo data (optional — creates a test clinic)
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:seed
```

---

## Step 7: Set up a Domain (Optional but Recommended)

```bash
# In your DNS provider, create an A record pointing to your server IP
# Example: clinic.your-domain.com → YOUR_SERVER_IP

# Configure Let's Encrypt for automatic HTTPS
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec nginx certbot --nginx -d clinic.your-domain.com

# Update CORS in .env
sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=https://clinic.your-domain.com,https://portal.your-domain.com|' .env

# Update auth callback URLs in your Auth0 dashboard:
# Web App: https://clinic.your-domain.com
# Patient Portal: https://portal.your-domain.com

# Restart to apply
docker compose -f infrastructure/on-premise/docker-compose.production.yml down
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d
```

---

## Step 8: Verify Everything

```bash
# Check the API health endpoint
curl http://localhost:4000/api/v1/health

# Check all containers are healthy
docker compose -f infrastructure/on-premise/docker-compose.production.yml ps

# View logs if something isn't working
docker compose -f infrastructure/on-premise/docker-compose.production.yml logs api --tail=50
```

---

## Access Your Deployment

| Service | Domain-based URL | Direct IP URL |
|---------|-----------------|--------------|
| Web App | `https://clinic.your-domain.com` | `http://YOUR_SERVER_IP` |
| Patient Portal | `https://portal.your-domain.com` | `http://YOUR_SERVER_IP/portal` |
| API Health | `https://clinic.your-domain.com/api/v1/health` | `http://YOUR_SERVER_IP:4000/api/v1/health` |
| MinIO Console | `https://clinic.your-domain.com:9001` | `http://YOUR_SERVER_IP:9001` |
| Grafana | `https://clinic.your-domain.com/grafana` | `http://YOUR_SERVER_IP:3000` |

---

## Maintenance

### Backups
Automatic database backups run daily at 2 AM and 2 PM. They are:
- AES-256 encrypted
- Stored in MinIO (included in the Docker Compose stack)
- Retained for 30 days

```bash
# Manual backup
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec backup /usr/local/bin/backup.sh
```

### View Logs

```bash
# All services
docker compose -f infrastructure/on-premise/docker-compose.production.yml logs -f

# Specific service
docker compose -f infrastructure/on-premise/docker-compose.production.yml logs -f api
docker compose -f infrastructure/on-premise/docker-compose.production.yml logs -f nginx
```

### Update

```bash
cd /opt/tpt-doctor
git pull
docker compose -f infrastructure/on-premise/docker-compose.production.yml pull
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate
```

### Monitor

The stack includes Prometheus and Grafana. Access Grafana at `http://YOUR_SERVER_IP:3000` with the admin password you set in `.env`.

---

## Provider-Specific Tips

### Linode
- Use the **Linode Marketplace** → click **Deploy Docker** for a pre-configured Docker host
- Enable **Linode Backups** ($2/mo extra) for automatic daily snapshots

### Vultr
- Enable **Auto Backups** ($1.50-$3/mo) during deployment
- Use **Vultr Firewall Groups** instead of UFW for cloud-level protection

### Hetzner
- Enable **Backups** ($0.01/GB/week) via the Hetzner Cloud Console
- Set up **Hetzner Firewall** in the cloud dashboard

---

---

## HIPAA Compliance on a VPS

TPT Doctor is designed for HIPAA compliance from the ground up, but running it on a VPS means **you** are the Covered Entity responsible for operational compliance. Here's what that requires:

### What TPT Doctor Handles (Technical Safeguards)

| HIPAA Requirement | TPT Doctor Implementation |
|------------------|--------------------------|
| **Access Control** | Auth0 MFA, RBAC (6 roles, 30+ permissions), unique user IDs |
| **Audit Controls** | Immutable audit log with SHA-256 cryptographic chaining |
| **Integrity Controls** | Tamper detection via previous_hash chain verification |
| **Transmission Security** | TLS 1.2+ enforced via Nginx, HSTS preload |
| **Encryption at Rest** | AES-256-GCM column-level PHI encryption, encrypted database volumes |
| **Automatic Logoff** | 15-minute session timeout |
| **Emergency Access** | Break-glass accounts with automatic 24-hour expiration |

### What You Need to Handle (Operational Compliance)

#### 1. Sign a BAA with Your VPS Provider

A Business Associate Agreement (BAA) is a legal requirement under HIPAA. Good news — most VPS providers offer them:

| Provider | BAA Available | How to Get |
|----------|--------------|------------|
| **DigitalOcean** | ✅ Yes | Contact support or check account settings |
| **Linode (Akamai)** | ✅ Yes | Enterprise agreement or contact sales |
| **Vultr** | ✅ Yes | Enterprise plan required |
| **Hetzner** | ⚠️ Limited | Enterprise customers only |
| **OVHcloud** | ✅ Yes | Contact support |
| **Scaleway** | ⚠️ Case-by-case | Contact sales |
| **AWS Lightsail** | ✅ Yes | Included with AWS account (AWS BAA) |
| **Google Cloud** | ✅ Yes | Included with GCP account |

> **If your provider won't sign a BAA, do not store PHI on that server.** Consider using DigitalOcean or Linode which are known for offering BAAs.

#### 2. OS Hardening Checklist

```bash
# All of these are configured in the Ansible playbook (infrastructure/ansible/deploy.yml)
# but if deploying manually:

# 1. Keep the system updated
apt update && apt upgrade -y
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades

# 2. Configure firewall (only necessary ports)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH (consider changing to a non-standard port)
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3478/udp  # Telemedicine
ufw enable

# 3. Disable root SSH login, use key-based auth only
sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 4. Install fail2ban to prevent brute force attacks
apt install fail2ban -y

# 5. Set up automatic security updates
apt install apticron -y

# 6. Enable auditd for system-level auditing
apt install auditd -y
auditctl -e 1
```

#### 3. Required Policies

HIPAA requires documented policies and procedures. You must have:
- **Security Management Process** — risk analysis and management
- **Assigned Security Responsibility** — someone is the Security Officer
- **Workforce Security** — authorization, supervision, termination procedures
- **Information Access Management** — access authorization and establishment
- **Security Awareness Training** — annual training for all staff
- **Security Incident Procedures** — response and reporting
- **Contingency Plan** — disaster recovery and emergency mode operation
- **Evaluation** — periodic technical and non-technical evaluation

TPT Doctor includes templates for most of these in `docs/security/`:
- `docs/security/security-policies.md` — comprehensive security policies
- `docs/security/disaster-recovery-plan.md` — DR plan
- `docs/compliance/compliance-manual.md` — full compliance manual
- `packages/compliance/src/baa-template.ts` — BAA generator for downstream vendors

You will need to customize these with your organization's name and specific procedures.

#### 4. Breach Notification

Under HIPAA, you must notify affected individuals, HHS/OCR, and sometimes the media in the event of a breach. TPT Doctor includes:
- Breach risk assessment (`packages/compliance/src/breach-notification.ts`)
- Breach notification generation (individual, media, OCR)

You need to establish a process for:
- Detecting breaches (monitoring logs, intrusion detection)
- Responding within 60 days (for breaches affecting 500+ individuals)
- Documenting all breach investigations

#### 5. Annual Assessments

HIPAA requires:
- **Annual security risk assessment** (technical + administrative)
- **Annual security awareness training** for all workforce members
- **Periodic penetration testing** (the OWASP ZAP scanner in `packages/compliance/src/vulnerability-scanning.ts` can help)
- **Regular review of audit logs** (TPT Doctor's audit log viewer helps with this)

### HIPAA-Capable VPS Providers (Recommended)

These providers offer **BAA agreements** and have data centers suitable for PHI:

| Provider | Starting Price | HIPAA Tier | Notes |
|----------|---------------|------------|-------|
| **DigitalOcean** | $48/mo (8 GB) | ✅ BAA available | Best balance of price & compliance |
| **Linode (Akamai)** | $48/mo (8 GB) | ✅ BAA available | Good documentation |
| **Vultr** | $48/mo (8 GB) | ✅ BAA on enterprise | Higher compliance tier |
| **AWS EC2** | Variable | ✅ Native BAA | More complex but fully covered |

### HIPAA Compliance Summary for VPS Deployments

| Area | TPT Doctor Covers It? | You Need To Do |
|------|----------------------|----------------|
| PHI Encryption at rest | ✅ AES-256-GCM column-level + encrypted volumes | — |
| PHI Encryption in transit | ✅ TLS 1.2+ via Nginx | — |
| Access Controls | ✅ Auth0 with MFA + RBAC | Configure roles properly |
| Audit Logging | ✅ Immutable SHA-256 chain | Review logs regularly |
| BAA with host | ❌ | Sign a BAA with your VPS provider |
| OS Hardening | ❌ | Follow the hardening checklist above |
| Security Policies | ✅ Templates provided | Customize with your org name |
| Breach Notification | ✅ Tooling provided | Establish your response process |
| Annual Assessments | ❌ | Schedule and perform them |
| Staff Training | ✅ Module templates provided | Conduct annual training |
| Physical Security | ❌ | Relies on VPS provider's data center |
| Backups | ✅ Automated AES-256 encrypted | Verify backups are working |

### Warning

> **Running PHI on a server without a BAA is a HIPAA violation.**  
> Always confirm your provider's BAA status before going live with real patient data. Most VPS providers advertise their HIPAA compliance on their website or can provide a BAA on request.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **API won't start** | Check `docker compose logs api` — likely a missing encryption key or invalid Auth0 config |
| **Can't connect to database** | Verify PostgreSQL container is healthy: `docker compose ps postgres` |
| **Blank page in web app** | Check CORS_ORIGINS in .env — must match the URL you're accessing from |
| **Auth0 login fails** | Verify callback URLs in Auth0 dashboard match your app URLs exactly |
| **Port 80/443 not accessible** | Check your cloud provider's firewall rules, not just UFW on the server |
| **Out of memory** | Use `docker compose down` then `docker compose up -d` to restart cleanly. Consider upgrading to 8 GB RAM. |
| **Telemedicine not working** | Ensure port 3478/udp is open in both UFW and your cloud provider's firewall |