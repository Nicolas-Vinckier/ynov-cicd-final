# Stage 1: build the React static bundle using the package lock.
FROM node:20-alpine AS build

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-audit --no-fund --ignore-scripts

COPY . .
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# Stage 2: serve the generated bundle with Nginx.
FROM nginx:1.27-alpine AS runtime

COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
