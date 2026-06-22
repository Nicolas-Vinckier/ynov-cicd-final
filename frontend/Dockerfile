FROM nginx:alpine

RUN apk update && apk upgrade --no-cache

COPY . /usr/share/nginx/html

COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]