FROM node:20-alpine AS base
RUN npm i -g pnpm
WORKDIR /app
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
COPY packages/ packages/

FROM base AS builder
COPY apps/api/ apps/api/
RUN pnpm install --frozen-lockfile --filter @tgmg/api...
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm build

FROM node:20-alpine AS runner
RUN npm i -g pnpm
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 3001
CMD ["pnpm", "--dir", "apps/api", "start"]
