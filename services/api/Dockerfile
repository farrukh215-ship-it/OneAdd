FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --dir services/api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --dir services/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
RUN apk add --no-cache curl

COPY . .
RUN pnpm install --frozen-lockfile --filter @aikad/api...
RUN pnpm --dir services/api exec prisma generate --schema prisma/schema.prisma
COPY --from=builder /app/services/api/dist ./services/api/dist

WORKDIR /app/services/api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS http://localhost:3001/health || exit 1
CMD ["node", "dist/main.js"]
