.PHONY: dev build down migrate seed logs shell-api safe-cleanup healthcheck deploy cleanup-invalid-listings

dev:
	docker compose up --build

build:
	docker compose build

down:
	docker compose down

migrate:
	docker compose exec api pnpm prisma migrate deploy

seed:
	docker compose exec api pnpm prisma db seed

logs:
	docker compose logs -f api

shell-api:
	docker compose exec api sh

safe-cleanup:
	bash ./ops/vps-safe-cleanup.sh

healthcheck:
	HOST_HEADER=teragharmeraghar.com bash ./ops/vps-healthcheck.sh

deploy:
	bash ./ops/vps-deploy.sh

cleanup-invalid-listings:
	docker compose exec -T postgres sh -lc 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' < ./ops/sql/cleanup-invalid-public-listings.sql
