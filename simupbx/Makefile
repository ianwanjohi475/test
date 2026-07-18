.PHONY: up down logs build db-migrate dev-web dev-api

up: ## Build and start the whole stack
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

build:
	docker compose build

db-migrate:
	docker compose exec api node dist/db/migrate.js

dev-web: ## Local dev: web app on :3000
	cd web && npm install && npm run dev

dev-api: ## Local dev: API on :4000 (needs local postgres)
	cd api && npm install && npm run dev
