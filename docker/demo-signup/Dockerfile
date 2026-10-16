# Demo repo image: deps installed AT BUILD, never at run (RUN-4).
# Build twice: target (buggy SHA) and control (fixed SHA), pin digests.
ARG BASE=node:24-alpine
FROM ${BASE} AS base
RUN adduser -D -u 65532 runner
WORKDIR /repo
# Orchestrator demo repo provides package.json + lockfile; copy first for cache.
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts && npm cache clean --force
COPY . .
USER 65532:65532
CMD ["npx", "vitest", "run", "--reporter=json"]
