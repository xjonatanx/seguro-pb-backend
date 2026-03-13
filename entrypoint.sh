#!/bin/sh

echo "⏳ Esperando a que la base de datos esté lista..."
# (Opcional: aquí podrías añadir un comando para esperar a postgres)

echo "🚀 Sincronizando el esquema de la base de datos (Drizzle Push)..."
npx drizzle-kit push

echo "👤 Ejecutando script de creación de administradores (Seed)..."
# Usamos npx tsx porque el archivo es .ts
npx tsx promote-admin.ts

echo "✅ Todo listo. Iniciando el servidor..."
node dist/index.js