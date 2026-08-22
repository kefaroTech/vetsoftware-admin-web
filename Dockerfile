FROM --platform=$BUILDPLATFORM node:24.13.0-alpine3.23@sha256:cd6fb7efa6490f039f3471a189214d5f548c11df1ff9e5b181aa49e22c14383e AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
ARG BUILD_MODE=prod
RUN npm run "build:${BUILD_MODE}"

FROM nginx:1.29.5-alpine3.23@sha256:1eff5a5f3fcf8431a0abb7eddf5471fec24e5e1905a2581aeacdb07a4479b92b AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=nginx:nginx /workspace/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

# 127.0.0.1 y no localhost: nginx solo abre `listen 8080` (IPv4, docker/nginx.conf), pero dentro
# del contenedor localhost resuelve primero a ::1 y wget se quedaba en "connection refused". El
# contenedor servia 200 y aun asi Docker lo marcaba unhealthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
