# Production image for the Express API.
# The image keeps only runtime dependencies and runs as a non-root user.
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /usr/src/app

# Copy dependency manifests first to maximize Docker layer cache reuse.
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

COPY . .

RUN addgroup -S metrics && adduser -S metrics -G metrics \
  && chown -R metrics:metrics /usr/src/app
USER metrics

EXPOSE 5000

# Uses Node itself so the image does not need curl/wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/api/health', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]
