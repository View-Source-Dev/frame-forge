# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS web-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM web-deps AS web-build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:20-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    FORGE_DATA_DIR=/app/data
COPY --from=web-build --chown=node:node /app/.next/standalone ./
COPY --from=web-build --chown=node:node /app/.next/static ./.next/static
COPY --from=web-build --chown=node:node /app/public ./public
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:20-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production \
    FORGE_DATA_DIR=/app/data \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    IMG2THREEJS_SKILL_DIR=/home/node/.claude/skills/img2threejs

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git python3 \
    && rm -rf /var/lib/apt/lists/*

COPY worker/package.json worker/package-lock.json ./worker/
RUN cd worker \
    && npm ci --omit=dev \
    && npx playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright

ARG IMG2THREEJS_GIT_URL=https://github.com/img2threejs/img2threejs.git
ARG IMG2THREEJS_GIT_REF=e8ff28a6ae0cb534c7b2ebc15cb3f06709262d5b
RUN git clone "${IMG2THREEJS_GIT_URL}" /tmp/img2threejs \
    && git -C /tmp/img2threejs checkout "${IMG2THREEJS_GIT_REF}" \
    && rm -rf /tmp/img2threejs/.git \
    && mkdir -p /home/node/.claude/skills \
    && mv /tmp/img2threejs /home/node/.claude/skills/img2threejs \
    && chown -R node:node /home/node/.claude

COPY --chown=node:node worker ./worker
COPY --chown=node:node shared ./shared
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
CMD ["node", "worker/worker.mjs"]
