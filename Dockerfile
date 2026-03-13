# --- ETAPA 1: Build (Compilación) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de Docker
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copiar todo el código fuente
COPY . .

# Generar la carpeta /dist (TypeScript a JavaScript)
RUN yarn build

# --- ETAPA 2: Runner (Producción) ---
FROM node:20-alpine AS runner

WORKDIR /app

# Variable de entorno para optimizar Node.js
ENV NODE_ENV=production

# 1. Copiar lo necesario para ejecutar la app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 2. Copiar archivos críticos para que Drizzle ORM funcione en el servidor
# Estos son los que te daban error al no estar presentes
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/db ./db

# Exponer el puerto configurado en tu .env
EXPOSE 4000

# Comando para iniciar el servidor
CMD ["node", "dist/index.js"]