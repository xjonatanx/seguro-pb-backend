# --- ETAPA 1: Construcción ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# --- ETAPA 2: Producción ---
FROM node:20-alpine AS runner

WORKDIR /app

# Definimos variables de entorno
ENV NODE_ENV=production

# 1. Copiamos lo básico
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 2. AGREGADO: Copiamos el config de Drizzle y el esquema
# Drizzle-kit necesita ver estos archivos .ts para funcionar
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/schema.ts ./ 
# (Si tienes tus esquemas en una carpeta, usa: COPY --from=builder /app/src/schema ./src/schema)

EXPOSE 4000

CMD ["node", "dist/index.js"]