# --- ETAPA 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/db ./db
COPY --from=builder /app/seed-admin.ts ./  # <--- IMPORTANTE: Copiar el seed

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]