FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aikad/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @aikad/web...
COPY --from=builder /app/apps/web/.next ./apps/web/.next

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
