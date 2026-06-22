FROM node:22-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV npm_config_audit=false
ENV npm_config_fund=false
ENV npm_config_progress=false
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
