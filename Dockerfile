# --- ETAPA 1: Construcción ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos archivos de dependencias de Yarn
COPY package.json yarn.lock ./

# Instalamos todas las dependencias
RUN yarn install --frozen-lockfile

# Copiamos el resto del código
COPY . .

# Compilamos de TypeScript a JavaScript
RUN yarn build

# --- ETAPA 2: Producción ---
FROM node:20-alpine AS runner

WORKDIR /app

# Definimos variables de entorno
ENV NODE_ENV=production

# Copiamos solo las dependencias de producción y el código compilado
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Exponemos el puerto
EXPOSE 4000

# Comando para iniciar la aplicación desde la carpeta dist
CMD ["node", "dist/index.js"]