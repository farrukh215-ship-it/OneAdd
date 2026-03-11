.PHONY: dev build down migrate seed logs shell-api

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
