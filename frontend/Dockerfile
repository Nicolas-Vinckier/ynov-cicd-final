# Stage 1
FROM node:22.11-alpine3.19 AS build

WORKDIR /usr/src/app

ENV CI=true
ENV npm_config_audit=false
ENV npm_config_fund=false
ENV npm_config_progress=false
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

COPY . .

RUN npm run build

# Stage 2
FROM nginx:1.27-alpine

COPY --from=build /usr/src/app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
