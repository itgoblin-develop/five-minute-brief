# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN apk add --no-cache jq && \
    jq 'del(.dependencies["@rollup/rollup-darwin-arm64"], .dependencies["@tailwindcss/oxide-darwin-arm64"], .dependencies["lightningcss-darwin-arm64"])' package.json > package.tmp.json && \
    mv package.tmp.json package.json && \
    npm install

COPY . .

# VAPID 공개키를 빌드 타임에 주입 (Vite 환경변수)
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY}

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx가 비특권 사용자로 실행되도록 설정 (보안 강화)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
