FROM node:14-alpine as builder

ARG REACT_APP_VERSION="development"

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# Manually copying public and src to not copy rootfs/
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# ------------------------------------------------------
# Production Build
# ------------------------------------------------------
FROM nginx:1.16.0-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY rootfs/ /

COPY --from=builder /app/build /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
