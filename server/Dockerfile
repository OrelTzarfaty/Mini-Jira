# The API image: build the TypeScript server, then run it with only the production packages.
# Build from the repo root, because the build needs the root lockfile and shared/:
#   docker build --file server/Dockerfile .

# Stage 1: the package files. Every image installs from the root package.json and lockfile, so
# npm applies the root "overrides" (the security pin for "effect") and the locked versions.
# Node 26 matches "engines" in the root package.json (.npmrc sets engine-strict).
FROM node:26.13.1-alpine3.24 AS base
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/
COPY e2e/package.json e2e/

# Stage 2: build. Needs the dev packages (TypeScript) to compile shared/ and server/.
FROM base AS build
RUN npm ci --workspace @mini-jira/shared --workspace @mini-jira/server
COPY tsconfig.base.json ./
COPY shared/ shared/
COPY server/ server/
# The server "prebuild" script runs "prisma generate", and tsc compiles the generated client
# into server/dist with the rest of the code.
RUN npm run build --workspace @mini-jira/shared \
 && npm run build --workspace @mini-jira/server

# Stage 3: run. Production packages only (no TypeScript, test tools, or source code).
# The Prisma CLI is a production dependency, because the container applies migrations on start.
# Its install script downloads the schema engine for Alpine (musl), and argon2 ships a musl build.
FROM base AS runtime
ENV NODE_ENV=production
# Stops the Prisma CLI from sending usage data to Prisma on every start.
ENV CHECKPOINT_DISABLE=1
ENV PATH=/app/node_modules/.bin:$PATH
RUN npm ci --omit=dev --workspace @mini-jira/server \
 && npm cache clean --force

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
COPY server/prisma.config.ts server/
COPY server/prisma/schema.prisma server/prisma/
COPY server/prisma/migrations server/prisma/migrations

# The files above stay owned by root, so the app can read them but not change them.
USER node
WORKDIR /app/server
EXPOSE 3000

# Node 26 has fetch, so the check needs no curl. It checks every 2 s while the API starts, then
# every 30 s, so the health requests do not flood the request log.
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --start-interval=2s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/api/health').then((res) => process.exit(res.ok ? 0 : 1), () => process.exit(1))"]

# Apply pending migrations, then start the API. "exec" replaces the shell with Node, so Node gets
# SIGTERM from "docker stop" directly and shuts down gracefully (no npm in between).
# The shell is the first process while migrations run, and Linux gives that process no default
# SIGTERM action, so without the trap a stop at that moment would be ignored until Docker kills
# the container. With it, the shell lets the running migration finish, then exits.
CMD ["/bin/sh", "-c", "trap 'exit 143' TERM; prisma migrate deploy && exec node dist/server.js"]
