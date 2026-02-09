# AI Jarvis - Production Deployment Guide

## 🚀 VPS Deployment with Domain & SSL

This guide covers deploying AI Jarvis to a VPS with your own domain and automatic SSL certificates.

---

## Prerequisites

### Server Requirements
- VPS with at least 4GB RAM, 2 CPU cores
- Ubuntu 20.04+ or Debian 11+
- Docker and Docker Compose installed
- Domain name with DNS access
- Ports 80 and 443 open

### DNS Provider Support
Traefik supports wildcard SSL via DNS challenge with these providers:
- Cloudflare (recommended)
- AWS Route53
- DigitalOcean
- Google Cloud DNS
- And 50+ others

---

## Quick Deployment

### One-Line Production Deploy

```bash
curl -fsSL https://raw.githubusercontent.com/Atm0Sphere94/AI_Assist/main/deploy-production.sh | bash
```

Or manually:

```bash
git clone https://github.com/Atm0Sphere94/AI_Assist.git
cd AI_Assist
chmod +x deploy-production.sh
./deploy-production.sh
```

The script will:
1. ✅ Ask for domain name
2. ✅ Configure DNS provider (Cloudflare, Route53, etc.)
3. ✅ Collect API credentials
4. ✅ Generate secure passwords
5. ✅ Create production config
6. ✅ Build and deploy with Docker
7. ✅ Setup SSL certificates automatically
8. ✅ Initialize database
9. ✅ Create admin user

---

## DNS Configuration

After deployment, add these DNS records:

```
Type  Name      Value
A     @         YOUR_SERVER_IP
A     www       YOUR_SERVER_IP
A     api       YOUR_SERVER_IP
A     qdrant    YOUR_SERVER_IP
A     traefik   YOUR_SERVER_IP
```

**Or use wildcard:**
```
Type  Name  Value
A     @     YOUR_SERVER_IP
A     *     YOUR_SERVER_IP
```

---

## Access Points

After deployment and DNS propagation (5-10 minutes):

- **Web Interface**: https://your-domain.com
- **API Documentation**: https://api.your-domain.com/docs
- **Qdrant Dashboard**: https://qdrant.your-domain.com
- **Traefik Dashboard**: https://traefik.your-domain.com

---

## Architecture

```
Internet
   │
   ▼
Traefik (Reverse Proxy + SSL)
   ├──► your-domain.com        → Next.js Frontend
   ├──► api.your-domain.com    → FastAPI Backend
   ├──► qdrant.your-domain.com → Qdrant Vector DB
   └──► traefik.your-domain.com → Traefik Dashboard
```

SSL certificates are automatically issued and renewed by Let's Encrypt.

---

## Configuration Files

### docker-compose.production.yml
Production-ready compose file with:
- Traefik reverse proxy
- Automatic SSL via Let's Encrypt
- Security headers
- Health checks
- Restart policies

### .env.production
Environment variables for production:
- Domain configuration
- DNS provider credentials
- Secure passwords
- CORS settings
- Production mode

---

## DNS Provider Setup

### Cloudflare (Recommended)

1. Get API credentials:
   - Login to Cloudflare
   - Go to My Profile → API Tokens
   - Create Token with "Edit zone DNS" permissions

2. During deployment, provide:
   - Cloudflare email
   - API Token

### AWS Route53

1. Create IAM user with Route53 permissions
2. Get Access Key ID and Secret Access Key
3. Provide during deployment

### DigitalOcean

1. Go to API → Tokens
2. Generate new token
3. Provide during deployment

---

## Manual Configuration

If you prefer manual setup:

```bash
# 1. Copy production env template
cp .env.production.example .env.production

# 2. Edit configuration
nano .env.production

# 3. Update domain and credentials
DOMAIN=your-domain.com
ACME_EMAIL=your-email@example.com
CF_API_EMAIL=your-cloudflare-email
CF_API_KEY=your_cloudflare_api_key

# 4. Generate passwords
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD
openssl rand -hex 32     # For SECRET_KEY

# 5. Deploy
docker-compose -f docker-compose.production.yml up -d

# 6. Initialize database
docker-compose -f docker-compose.production.yml exec backend python init_db.py

# 7. Create admin
docker-compose -f docker-compose.production.yml exec backend python create_admin_user.py admin YourPassword
```

---

## SSL Certificates

### Automatic Issuance
Traefik automatically:
- Issues SSL certificates via Let's Encrypt
- Renews certificates before expiration
- Handles DNS-01 challenge for wildcard certs
- Stores certificates in `./letsencrypt/acme.json`

### Troubleshooting SSL

Check Traefik logs:
```bash
docker-compose -f docker-compose.production.yml logs traefik
```

Verify DNS records:
```bash
dig your-domain.com
dig api.your-domain.com
```

---

## Security Features

✅ Automatic HTTPS redirect
✅ HSTS headers
✅ Security headers (XSS, CSRF protection)
✅ Basic auth for Traefik dashboard
✅ Isolated Docker network
✅ Password-protected services
✅ API CORS restrictions

---

## Maintenance

### View Logs
```bash
docker-compose -f docker-compose.production.yml logs -f
```

### Restart Services
```bash
docker-compose -f docker-compose.production.yml restart
```

### Update Deployment
```bash
git pull
docker-compose -f docker-compose.production.yml up -d --build
```

### Backup Database
```bash
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U jarvis jarvis_db > backup.sql
```

### Restore Database
```bash
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U jarvis jarvis_db < backup.sql
```

---

## Monitoring

### Check Service Status
```bash
docker-compose -f docker-compose.production.yml ps
```

### View Resource Usage
```bash
docker stats
```

### Traefik Dashboard
Access at https://traefik.your-domain.com
- View active routes
- Monitor SSL certificates
- Check service health

---

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Verify DNS
dig +short your-domain.com

# Test connectivity
curl -I https://api.your-domain.com/health
```

### SSL not working
```bash
# Check DNS propagation
nslookup your-domain.com

# Verify Traefik config
docker-compose -f docker-compose.production.yml exec traefik /bin/sh
cat /etc/traefik/traefik.yml

# Check certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Database connection errors
```bash
# Check PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U jarvis -d jarvis_db

# Verify credentials in .env.production
```

---

## Performance Optimization

### Enable Caching
Add to Traefik labels:
```yaml
- "traefik.http.middlewares.cache.plugin.cache.enabled=true"
```

### Increase Workers
Edit `.env.production`:
```env
WORKERS=4
CELERY_WORKERS=4
```

### Add CDN
Point your domain DNS through Cloudflare CDN for:
- Global caching
- DDoS protection
- Additional SSL layer

---

## Cost Estimation

### VPS Providers
- **DigitalOcean**: $12-24/month (2-4GB RAM droplet)
- **Linode**: $12-24/month
- **Vultr**: $12-24/month
- **Hetzner**: $5-10/month (EU servers)

### Additional Costs
- Domain: $10-15/year
- SSL: Free (Let's Encrypt)
- Cloudflare: Free tier sufficient

**Total**: ~$15-30/month

---

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify DNS: `dig your-domain.com`
3. Test endpoints: `curl https://api.your-domain.com/health`
4. Open GitHub issue with error logs

---

**Deployment complete! Your AI Jarvis is now running in production! 🎉**
