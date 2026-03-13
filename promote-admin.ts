// "dev": "ts-node-dev index.ts",
// https://pybingenieriachile.cl/api-seguro
import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './db/schema';

async function createAdminUsers() {
  // 1. Definimos la lista de los 3 elegidos
  const adminsToCreate = [
    {
      rut: '18.420.862-8',
      email: 'yonatanpc65@gmail.com',
      password: 'pb2026admin_y',
      role: 'admin'
    },
    {
      rut: '19.015.017-8',
      email: 'natalia@pybingenieria.cl',
      password: 'sN2S4zrnok',
      role: 'admin'
    },
    {
      rut: '20.840.210-2',
      email: 'yessica@pybingenieria.cl',
      password: 'SG3GRrKUfd',
      role: 'admin'
    },
    {
      rut: '13.541.060-8',
      email: 'williams@pybingenieria.cl',
      password: 'Escr7uFWf3',
      role: 'admin'
    }
  ];

  console.log("🚀 Iniciando creación de administradores...");

  for (const admin of adminsToCreate) {
    try {
      console.log(`Procesando a: ${admin.email}...`);

      // 2. Encriptamos la contraseña individualmente
      const hashedPassword = await bcrypt.hash(admin.password, 10);

      // 3. Insertamos en la base de datos
      // Usamos .onConflictDoUpdate por si el RUT ya existe, para que no explote el script
      await db.insert(users)
        .values({
          rut: admin.rut,
          email: admin.email,
          password: hashedPassword,
          role: admin.role,
        })
        .onConflictDoUpdate({
          target: users.rut,
          set: { 
            role: 'admin', 
            password: hashedPassword, 
            email: admin.email 
          }
        });

      console.log(`✅ ${admin.email} ahora es Administrador.`);
    } catch (error) {
      console.error(`❌ Error con el usuario ${admin.email}:`, error);
    }
  }

  console.log("\n✨ ¡Proceso terminado! Ya pueden entrar al panel.");
  process.exit(0);
}

createAdminUsers();