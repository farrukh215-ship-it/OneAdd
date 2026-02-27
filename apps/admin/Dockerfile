FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aikad/admin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @aikad/admin...
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next

WORKDIR /app/apps/admin
EXPOSE 3002
CMD ["pnpm", "start"]
