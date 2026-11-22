# The client image: build the React app with Node, then serve it with nginx.
# Build from the repo root, because the build needs the root lockfile and shared/:
#   docker build --file client/Dockerfile .

# Stage 1: build. Node 26 matches "engines" in the root package.json (.npmrc sets engine-strict).
FROM node:26.13.1-alpine3.24 AS build
WORKDIR /app

# Install first, from the root package.json and lockfile, so this layer is reused until a
# package.json or the lockfile changes. Only the shared and client workspaces are installed.
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/
COPY e2e/package.json e2e/
RUN npm ci --workspace @mini-jira/shared --workspace @mini-jira/client

COPY tsconfig.base.json ./
COPY shared/ shared/
COPY client/ client/
RUN npm run build --workspace @mini-jira/shared \
 && npm run build --workspace @mini-jira/client

# Stage 2: serve. Only the built files and the nginx config, no Node or source code.
# nginx-unprivileged is the official NGINX image that runs as the non-root "nginx" user.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
