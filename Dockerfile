FROM oven/bun:1.2-slim AS builder

WORKDIR /app

# Invalider le cache pour les dépendances si nécessaire
COPY package.json bun.lockb ./
RUN bun install

# Copier le code source après l'install pour optimiser le cache
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build avec plus de logs
RUN bun run build || (echo "Build failed, check logs above" && exit 1)

############################
# Stage 2: Development
############################
FROM oven/bun:1.2-slim AS development

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copier les dépendances du builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 8080

CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "8080"]

############################
# Stage 3: Production
############################
FROM nginx:stable-alpine AS production

# Copier les fichiers construits du builder vers nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier une configuration nginx personnalisée si nécessaire
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
