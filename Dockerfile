# --- ETAPA 1: Construcción ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo las de desarrollo para compilar)
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript a JS (si aplica)
RUN npm run build

# --- ETAPA 2: Producción ---
FROM node:20-alpine AS runner

WORKDIR /app

# Definir variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=4000

# Copiar solo lo necesario
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist 

# Exponer el puerto del backend
EXPOSE 4000

# Comando para iniciar
CMD ["node", "dist/index.js"]