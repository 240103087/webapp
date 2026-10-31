# syntax=docker/dockerfile:1
# MoveEasy Memory Tags: one image with the API and the built frontend (#70).
# Same as `npm run build && npm start`, data under /data.

# Another registry can be used for the base image (for example public.ecr.aws/docker/library/node:22-bookworm-slim
# to avoid Docker Hub rate limits): docker build --build-arg NODE_IMAGE=... .
ARG NODE_IMAGE=node:22-bookworm-slim

# --- build: install everything, type-check and build the frontend ---
FROM ${NODE_IMAGE} AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY backend/package.json backend/
COPY e2e/package.json e2e/
COPY backend/prisma backend/prisma
RUN npm ci
COPY shared shared
COPY backend backend
COPY frontend frontend
RUN npm run build

# --- runtime: production dependencies, server source and the built frontend only ---
FROM ${NODE_IMAGE} AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/
COPY backend/package.json backend/
COPY e2e/package.json e2e/
COPY backend/prisma backend/prisma
# postinstall runs `prisma generate`; dev dependencies (Vite, Vitest, Playwright) are left out
RUN npm ci --omit=dev && npm cache clean --force
COPY shared/src shared/src
COPY backend/src backend/src
COPY backend/tsconfig.json backend/
COPY --from=build /app/frontend/dist frontend/dist
# The demo media the seed copies into an empty database
COPY frontend/public/demo frontend/public/demo

RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PORT=8787 \
    DATABASE_URL=file:/data/moveeasy.db \
    UPLOAD_DIR=/data/uploads \
    STATIC_DIR=frontend/dist
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
WORKDIR /app/backend
# Migrations run on start and the demo data is loaded into an empty database (see src/app.ts)
CMD ["node", "--import", "tsx", "src/server.ts"]
