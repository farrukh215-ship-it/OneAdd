FROM node:20-alpine AS base
RUN npm i -g pnpm
WORKDIR /app

FROM base AS builder
COPY pnpm-workspace.yaml turbo.json package.json pnpm-lock.yaml ./
COPY packages/ packages/
COPY apps/admin/ apps/admin/
RUN pnpm install --frozen-lockfile --filter @tgmg/admin...
WORKDIR /app/apps/admin
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./.next/static
COPY --from=builder /app/apps/admin/public ./public
EXPOSE 3002
CMD ["node", "server.js"]
