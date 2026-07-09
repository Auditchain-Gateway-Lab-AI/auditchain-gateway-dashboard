# --- Tahap 1: Build React App ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files dulu supaya layer cache npm install tidak invalidate
# setiap kali source code berubah
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# REACT_APP_API_BASE_URL di-inject saat BUILD TIME (bukan runtime),
# karena Create React App meng-embed env var ke dalam bundle JS statis.
# Override via --build-arg saat docker build, atau via docker-compose build args.
ARG REACT_APP_API_BASE_URL=http://localhost:8080/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

RUN npm run build

# --- Tahap 2: Serve dengan Nginx ---
FROM nginx:1.27-alpine

# Config nginx custom (SPA fallback ke index.html untuk react-router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]