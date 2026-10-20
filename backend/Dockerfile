# syntax=docker/dockerfile:1.7
# Multi-stage build: compilers and dev dependencies never reach the runtime image.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: no install-time code execution from dependencies.
RUN npm ci --ignore-scripts

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
# tini as PID 1 forwards SIGTERM to Node so graceful shutdown actually runs.
RUN apk add --no-cache tini
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# Non-root: the image ships with an unprivileged "node" user.
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
