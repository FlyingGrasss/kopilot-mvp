# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN (corepack enable pnpm 2>/dev/null || true) \
    && (corepack prepare pnpm@12.16.1 --activate \
        || npm install --global pnpm@12.16.1)

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# The runtime keeps dev dependencies because `tsx` runs the API and seed script.
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/shared ./shared
COPY --from=builder --chown=node:node /app/scripts/start.sh ./scripts/start.sh

RUN mkdir -p /app/data \
    && chown node:node /app/data \
    && chmod +x /app/scripts/start.sh

USER node
EXPOSE 3000 4500

CMD ["/bin/bash", "/app/scripts/start.sh"]
