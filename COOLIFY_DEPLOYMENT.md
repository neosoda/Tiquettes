# Vpanel Deployment Guide for Coolify

## Quick Start

1. Edit `.env.coolify` with your domain
2. In Coolify Dashboard → Add Docker Compose
3. Paste `docker-compose.prod.yml` content
4. Set Build Arguments from `.env.coolify`
5. Click Deploy

---

## Environment Variables Setup

### Build-Time (required - baked into app)

```env
VITE_APP_URL=https://vpanel.yourdomain.com
VITE_APP_API_URL=https://vpanel.yourdomain.com/api/
VITE_USE_AUTH=false
```

### Runtime (can change without rebuild)

```env
PHP_FPM_PM_MAX_CHILDREN=20
PHP_FPM_PM_START_SERVERS=4
PHP_FPM_PM_MIN_SPARE_SERVERS=2
PHP_FPM_PM_MAX_SPARE_SERVERS=10
```

---

## Validation Post-Deploy

```bash
# Check container
docker ps | grep vpanel

# Test API
curl https://vpanel.yourdomain.com/infos.json

# View logs
docker logs vpanel-prod

# Run health check
docker exec vpanel-prod /healthcheck.sh
```

---

## Troubleshooting

### Build Failed
- Check all VITE_ build arguments set
- Verify domain in VITE_APP_URL
- Check npm dependencies available

### API Not Responding
- Verify VITE_APP_API_URL matches domain
- Check reverse proxy configuration
- Test: `curl https://yourdomain.com/api/choices.php`

### Healthcheck Failing
- Check logs: `docker logs vpanel-prod`
- Restart: `docker restart vpanel-prod`
- Wait 30s for PHP-FPM startup

### Out of Memory
Increase in docker-compose.prod.yml:
```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

---

## Performance Tuning

Increase worker pool for 100+ users:
```env
PHP_FPM_PM_MAX_CHILDREN=50
PHP_FPM_PM_START_SERVERS=10
```

---

## Updates & Maintenance

```bash
# Rebuild with latest code
docker-compose -f docker-compose.prod.yml build --no-cache

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Monitor
docker-compose logs -f vpanel
```

---

## Support

See `DEPLOYMENT_CHECKLIST.md` for detailed validation steps.

