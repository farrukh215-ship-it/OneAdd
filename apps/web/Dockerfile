FROM node:20-alpine AS base
RUN npm i -g pnpm
WORKDIR /app

FROM base AS builder
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
COPY packages/ packages/
COPY apps/web/ apps/web/
RUN pnpm install --frozen-lockfile --filter @tgmg/web...
WORKDIR /app/apps/web
RUN pnpm build

FROM node:20-alpine AS runner
RUN npm i -g pnpm
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3000
CMD ["pnpm", "--dir", "apps/web", "start"]
