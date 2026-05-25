# TPT Doctor — Telemedicine Setup Guide

> Setting up telemedicine (video consultations) with Jitsi Meet.

---

## Overview

TPT Doctor supports two telemedicine providers:

| Provider | Type | Included | Cost |
|----------|------|----------|------|
| **Jitsi Meet** | Self-hosted | ✅ Comes with Docker Compose | Free (your server resources) |
| **Twilio Video** | Cloud API | Code ready | Pay-per-minute |

**Jitsi is the default** and is included in the production Docker Compose stack. It runs entirely on your own server, so no data leaves your infrastructure.

---

## Option 1: Jitsi Meet (Self-Hosted)

### How It Works

```
Patient's Browser ←→ Your Server (Jitsi) ←→ Clinician's Browser
                         |
                 TURN/STUN Server
                    (for NAT traversal)
```

### Requirements

- **Port 443/TCP** — WebRTC signaling
- **Port 3478/UDP** — TURN/STUN for NAT traversal
- **Domain name** (recommended) — `meet.your-clinic.com`
- **CPU:** Jitsi is CPU-intensive during calls. Each concurrent call uses ~30% of one core.

### Configuration

Jitsi is already configured in the Docker Compose stack (`infrastructure/on-premise/docker-compose.production.yml`). You just need to set these in `.env`:

```env
# Required
TELEMEDICINE_PROVIDER=jitsi
JITSI_DOMAIN=meet.your-clinic.com
JITSI_PASSWORD=<secure-random-password>

# Optional: STUN/TURN servers
# Google's STUN servers work for most cases
# For production, set up your own TURN server
```

### Firewall

```bash
# Jitsi needs these ports open
ufw allow 443/tcp    # Web app + WebRTC
ufw allow 3478/udp   # TURN/STUN
ufw enable
```

### DNS

Create an A record pointing to your server:

```
meet.your-clinic.com  A  YOUR_SERVER_IP
```

### Stopping/Starting Jitsi

Jitsi runs as part of the Docker Compose stack. It starts automatically when you deploy.

```bash
# Check Jitsi status
docker compose -f infrastructure/on-premise/docker-compose.production.yml ps | grep jitsi

# View Jitsi logs
docker compose -f infrastructure/on-premise/docker-compose.production.yml logs jitsi-web
```

### Performance Tuning

```bash
# Jitsi can use significant CPU. For a 4-core server:
# Limit Jitsi to 2 cores
docker update tpt-doctor-jitsi --cpus 2

# Limit Jitsi memory
docker update tpt-doctor-jitsi --memory 2g
```

---

## Option 2: Twilio Video (Cloud API)

If you prefer not to run Jitsi, you can use Twilio Video (now called Twilio Programmable Video).

### Prerequisites

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Enable **Programmable Video** in the Twilio Console
3. Generate an API Key and Secret

### Configuration

```env
TELEMEDICINE_PROVIDER=twilio
TWILIO_VIDEO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VIDEO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Costs

Twilio Video is priced per participant-minute:
- Group rooms: ~$0.004/participant-minute
- A 30-minute call with 2 participants: ~$0.24

---

## Testing Telemedicine

### Step 1: Verify Jitsi is running

```bash
# Check Jitsi web interface
curl -I https://meet.your-clinic.com

# Should return HTTP/1.1 200 OK
```

### Step 2: Start a test call

1. Log into TPT Doctor as a clinician
2. Go to **Appointments** → select a TELEMEDICINE appointment
3. Click **Start Video Call**
4. A new tab opens with the Jitsi meeting

### Step 3: Join as a patient

1. Log into the Patient Portal
2. Go to **Appointments** → upcoming
3. Click **Join Video Call**

### Step 4: Verify WebRTC connectivity

Open the browser's developer tools during a call:
- **Chrome:** `chrome://webrtc-internals`
- **Firefox:** `about:webrtc`
- Check that ICE candidates are connecting (not "failed")

---

## Troubleshooting Jitsi

### "Cannot connect to video bridge"

```
Check:
1. Port 3478/udp is open on your firewall
2. JITSI_DOMAIN points to the correct IP
3. Jitsi containers are running

Solution:
docker compose -f infrastructure/on-premise/docker-compose.production.yml restart jitsi-jvb
```

### "No audio" or "No video"

```
Check:
1. Browser permissions (camera/mic allowed?)
2. Try a different browser (Chrome recommended)
3. Check if another app is using the camera
4. Is the device connected?
```

### "Poor video quality"

```
Causes:
- Low bandwidth
- High server CPU usage
- Packet loss on network

Solutions:
1. Close other bandwidth-intensive applications
2. Reduce video quality in Jitsi settings
3. Check server CPU: htop
4. Consider upgrading server specs
```

### WebRTC not connecting through NAT

```
If users are behind strict NAT/firewalls:
1. STUN servers help with basic NAT
2. For symmetric NAT, you need a TURN server

Default STUN servers (already configured):
stun.l.google.com:19302
stun1.l.google.com:19302
```

---

## TURN Server Setup (For Production)

For reliable calls through all NAT types, set up a TURN server:

```bash
# Install coturn
apt install coturn

# Configure /etc/turnserver.conf
cat > /etc/turnserver.conf << EOF
listening-port=3478
tls-listening-port=5349
fingerprint
realm=meet.your-clinic.com
server-name=meet.your-clinic.com
lt-cred-mech
user=turnuser:turnpassword
total-quota=100
bps-capacity=1000000
stale-nonce
no-loopback-peers
no-multicast-peers
EOF

# Restart coturn
systemctl restart coturn
```

Then update Jitsi to use your TURN server:

```bash
# In docker-compose.production.yml:
JVB_STUN_SERVERS: turn:meet.your-clinic.com:3478
```

---

## Security Considerations

### Authentication

Jitsi in the TPT Doctor stack requires authentication:
- Users must be logged into TPT Doctor to start/join calls
- Jitsi rooms are generated per-appointment (not guessable URLs)
- Room access is validated through the API

### Encryption

- Jitsi supports end-to-end encryption (E2EE)
- Toggle "Enable E2EE" in Jitsi settings during a call
- All WebRTC traffic is encrypted by default (DTLS-SRTP)

### Recording Consent

- Recording requires explicit consent from all participants
- The API enforces consent recording before enabling recording
- Recordings are stored in encrypted MinIO/S3 storage

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEMEDICINE_PROVIDER` | `jitsi` | `jitsi` or `twilio` |
| `JITSI_DOMAIN` | `meet.jit.si` | Your Jitsi server domain |
| `JITSI_PASSWORD` | — | Jitsi authentication password |
| `TWILIO_VIDEO_API_KEY` | — | Twilio API key (Twilio mode only) |
| `TWILIO_VIDEO_API_SECRET` | — | Twilio API secret (Twilio mode only) |