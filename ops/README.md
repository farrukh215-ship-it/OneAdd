# Ops Runbook

## 1) Safe VPS Disk Cleanup
Run on VPS:

```bash
cd /opt/tgmg
bash ./ops/vps-safe-cleanup.sh
```

This script intentionally avoids:
- `docker volume prune`
- deleting DB volume
- deleting project folders

## 2) Standard Deploy (commit-gated)
Run on VPS:

```bash
cd /opt/tgmg
EXPECTED_COMMIT=<short_sha> bash ./ops/vps-deploy.sh
```

If you do not want commit gate:

```bash
cd /opt/tgmg
bash ./ops/vps-deploy.sh
```

## 3) Manual Healthcheck
Run on VPS:

```bash
cd /opt/tgmg
HOST_HEADER=teragharmeraghar.com bash ./ops/vps-healthcheck.sh
```

## 4) Data Quality Cleanup (invalid/no-image public listings)
Preview count:

```bash
cd /opt/tgmg
docker compose exec postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM \"Listing\" WHERE status <> '\''DELETED'\'' AND (images IS NULL OR cardinality(images)=0 OR coalesce(images[1], '\'''\'' )='\'''\'' OR images[1] !~ '\''^https?://'\'' OR images[1] LIKE '\''%localhost%'\'' OR images[1] LIKE '\''file:%'\'');"'
```

Apply cleanup:

```bash
cd /opt/tgmg
docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ./ops/sql/cleanup-invalid-public-listings.sql
```

## 5) Suggested cron jobs

### Daily invalid listing cleanup
```cron
15 3 * * * cd /opt/tgmg && docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ./ops/sql/cleanup-invalid-public-listings.sql >/var/log/tgmg-listing-cleanup.log 2>&1
```

### Weekly safe disk cleanup
```cron
30 3 * * 0 cd /opt/tgmg && bash ./ops/vps-safe-cleanup.sh >/var/log/tgmg-safe-cleanup.log 2>&1
```

