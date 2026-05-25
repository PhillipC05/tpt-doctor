# TPT Doctor — Troubleshooting Guide

> Common issues, their causes, and solutions.

---

## Deployment Issues

### API won't start

```
ERROR: PRODUCTION STARTUP FAILED: Encryption master key is not set...
```

**Cause:** The `ENCRYPTION_MASTER_KEY` environment variable is missing, empty, or still set to the placeholder value.

**Solution:**
```bash
# Generate a new 256-bit encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# This outputs a 64-character hex string — paste it into ENCRYPTION_MASTER_KEY
```

```
ERROR: PRODUCTION STARTUP FAILED: Auth0 domain not configured...
```

**Cause:** `AUTH0_DOMAIN` or `AUTH0_AUDIENCE` is not set.

**Solution:** Set these in your `.env` file. See [docs/auth-setup.md](auth-setup.md).

### Database connection fails

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause:** PostgreSQL is not running, or `DATABASE_URL` is incorrect.

**Solutions:**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Verify DATABASE_URL format
# Correct: postgresql://user:password@host:5432/database
```

### Container keeps restarting

```bash
# Check why
docker compose logs <service-name>
# Common causes:
# - Missing environment variables
# - Database not ready yet (service depends on postgres)
# - Out of memory
```

### Port already in use

```
Error: listen EADDRINUSE :::4000
```

**Solution:**
```bash
# Find what's using the port
netstat -ano | findstr :4000
# Kill the process or change PORT in .env
```

---

## Auth0 / Login Issues

### Blank page after login

**Cause:** CORS or callback URL misconfiguration.

**Solutions:**
1. Check browser console for CORS errors
2. Verify `CORS_ORIGINS` in `.env` includes your app URL
3. Verify Auth0 callback URLs include your app URL
4. Verify Auth0 allowed web origins include your app URL

### Login redirects but doesn't return to the app

**Cause:** Callback URL in Auth0 doesn't match the app's URL.

**Solution:**
1. Go to Auth0 Dashboard → Applications → Your App → Settings
2. Under **Allowed Callback URLs**, add your exact app URL
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`
3. Save and try again

### "Invalid audience" in console

**Cause:** `VITE_AUTH0_AUDIENCE` in the frontend doesn't match the API identifier in Auth0.

**Solution:** Ensure `VITE_AUTH0_AUDIENCE` exactly matches the **Identifier** you set when creating the API in Auth0 (typically `https://api.tptdoctor.com`).

### API returns 401 Unauthorized

**Cause:** The JWT token is invalid, expired, or doesn't have the correct audience.

**Solutions:**
```bash
# Test the token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/v1/health

# If it works, check:
# 1. Token audience matches AUTH0_AUDIENCE
# 2. Token isn't expired
# 3. Auth0 domain is correct
```

---

## Frontend Issues

### Blank page / white screen

**Possible causes:**
1. JavaScript error in the app
2. Missing environment variables in the frontend build
3. Service worker caching an old version

**Solutions:**
```bash
# 1. Open browser DevTools (F12) → Console tab — look for error messages

# 2. Verify frontend env vars exist:
cat apps/web/.env.development
# Should contain:
# VITE_API_URL=http://localhost:4000
# VITE_AUTH0_DOMAIN=...
# VITE_AUTH0_CLIENT_ID=...
# VITE_AUTH0_AUDIENCE=...

# 3. Hard refresh (Ctrl+Shift+R) to bypass cache

# 4. Clear service worker:
# DevTools → Application → Service Workers → Unregister
```

### Styles not loading / layout broken

**Cause:** TailwindCSS build issue or missing CSS file.

**Solution:**
```bash
# Rebuild the CSS
pnpm --filter @tpt-doctor/web run build

# Or restart the dev server
pnpm run dev
```

### API calls not working (frontend)

**Check:**
1. Is the API server running? `curl http://localhost:4000/api/v1/health`
2. Is `VITE_API_URL` correct? It should match the API server address
3. Are there CORS errors in the console?
4. Is the Vite proxy configured? (In dev mode, Vite proxies `/api` → `localhost:4000`)

---

## Database Issues

### Migrations fail

```
Error: P1001: Can't reach database server
```

**Solution:**
```bash
# Ensure PostgreSQL is running
docker compose up -d postgres

# Wait for it to be healthy
docker compose wait postgres

# Try migrations again
pnpm run db:migrate
```

### Migration history conflict

```
Error: P3005: The database schema is not empty...
```

**Solution:**
```bash
# Reset the database (⚠️ deletes all data)
pnpm --filter @tpt-doctor/database run migrate:reset

# Then re-seed
pnpm run db:seed
```

### Seed script fails

**Cause:** User already exists or required environment variable missing.

**Solution:**
```bash
# Ensure DATABASE_URL is set correctly
# Reset and re-seed
pnpm --filter @tpt-doctor/database run migrate:reset
pnpm run db:seed
```

---

## Docker Issues

### "docker" is not recognized

**Solution:**
```bash
# Install Docker Desktop from https://docs.docker.com/get-docker/
# After installation, restart your terminal
docker --version
```

### "docker compose" not found

**Solution:** Docker Compose is included in Docker Desktop. If using older Docker:
```bash
# Install Docker Compose plugin manually
# Or use the legacy command: docker-compose (with hyphen)
```

### Permission denied when running Docker

**Solution (Linux):**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### Docker image build fails

**Solution:**
```bash
# Rebuild without cache
docker compose build --no-cache

# Or build a specific service
docker compose build --no-cache api
```

### Out of memory

**Symptoms:** Containers crash, OOM killer messages in logs.

**Solutions:**
```bash
# 1. Check memory usage
docker stats

# 2. Restart cleanly
docker compose down
docker compose up -d

# 3. Increase Docker memory limit
# Docker Desktop → Settings → Resources → Advanced → Increase memory

# 4. Reduce Postgres memory in .env (if on low-memory machine)
# DATABASE_POOL_MIN=1
# DATABASE_POOL_MAX=5
```

---

## Telemedicine Issues

### Jitsi doesn't load

**Solution:**
```bash
# Check if Jitsi containers are running
docker compose ps | grep jitsi

# View Jitsi logs
docker compose logs jitsi-web
```

### "Cannot connect to video bridge"

**Cause:** TURN/STUN server not configured or firewall blocking port 3478/UDP.

**Solutions:**
1. Ensure port 3478/UDP is open in your firewall
2. In `.env`, set `JITSI_DOMAIN` to your actual domain
3. Check TURN server configuration in Auth0/Jitsi

### Video/audio not working

1. Ensure camera and microphone permissions are granted in the browser
2. Try a different browser (Chrome recommended)
3. Check network connection (WebRTC requires stable connection)
4. Test with simple Jitsi: try `https://meet.jit.si` first to rule out browser issues

---

## File Storage Issues

### Document upload fails

**Cause:** MinIO not running or storage configuration incorrect.

**Solutions:**
```bash
# Check if MinIO is running
docker compose ps minio

# Check MinIO logs
docker compose logs minio

# Test MinIO connectivity
curl http://localhost:9000/minio/health/live
```

### "Access Denied" when uploading to S3/MinIO

**Cause:** Incorrect access keys.

**Solution:** Verify `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY` match the MinIO credentials or S3 credentials.

---

## Performance Issues

### App feels slow

**Solutions:**
```bash
# 1. Check CPU/memory usage
docker stats

# 2. Check database performance
docker compose logs postgres | grep -i "slow\|warning"

# 3. Increase worker count
# In .env: WEB_CONCURRENCY=2 (increase to 4 for production)
```

### High memory usage

**Solutions:**
```bash
# 1. Restart services
docker compose restart

# 2. Limit memory per container
# Edit docker-compose.yml to add:
# deploy:
#   resources:
#     limits:
#       memory: 512M

# 3. Clear Docker cache
docker system prune -a
```

---

## Build / Compilation Issues

### TypeScript compilation errors

```bash
# Run typecheck to see all errors
pnpm run typecheck

# Common fixes:
# - Update packages: pnpm install
# - Generate Prisma client: pnpm run db:generate
# - Clear TypeScript cache: pnpm run clean && pnpm install
```

### pnpm install fails

**Solutions:**
```bash
# Clear pnpm store
pnpm store prune

# Reinstall from scratch
rm -rf node_modules
pnpm install

# If specific package fails:
pnpm install --no-frozen-lockfile
```

### Build fails with "Module not found"

**Solutions:**
```bash
# Ensure all dependencies are installed
pnpm install

# Rebuild from clean state
pnpm run clean
pnpm install
pnpm run build
```

---

## Logs

### Viewing API logs

```bash
# All API logs
docker compose logs -f api

# Last 50 lines
docker compose logs api --tail=50

# Filter by level
docker compose logs api | grep -i error
docker compose logs api | grep -i warn
```

### Viewing frontend logs

Open browser DevTools (F12):
- **Console tab** — JavaScript errors and warnings
- **Network tab** — API request/response details
- **Application tab** — Service workers, storage

### Enabling debug logging

```bash
# Set LOG_LEVEL to debug in .env
LOG_LEVEL=debug

# Restart the API
docker compose restart api

# Then view the detailed logs
docker compose logs -f api
```

---

## Getting Help

If you can't find a solution here:

1. **Check existing GitHub issues** — [github.com/PhillipC05/tpt-doctor/issues](https://github.com/PhillipC05/tpt-doctor/issues)
2. **Open a new issue** — include:
   - Your environment (OS, Docker version, Node version)
   - What you're trying to do
   - What you expected to happen
   - What actually happened
   - Relevant logs and error messages
3. **Check documentation** — the `docs/` directory covers most scenarios