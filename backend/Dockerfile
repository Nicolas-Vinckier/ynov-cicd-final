FROM node:22-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN apk upgrade --no-cache && npm ci --omit=dev && npm cache clean --force
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]