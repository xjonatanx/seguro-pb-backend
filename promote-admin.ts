import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

async function promoteToAdmin() {
  const targetRut = '18.420.862-8'; // <--- El RUT del usuario que quieres subir a Admin
  const newPassword = 'pb2026admin'; // <--- La contraseña que usará para entrar al panel
  
  console.log(`Iniciando proceso para el RUT: ${targetRut}...`);

  try {
    // 1. Generamos el hash de la contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 2. Ejecutamos la actualización en la base de datos
    const result = await db.update(users)
      .set({
        role: 'admin',
        password: hashedPassword,
        email: 'yonatanpc65@gmail.com' // Puedes aprovechar de actualizar el correo si es necesario
      })
      .where(eq(users.rut, targetRut))
      .returning();

    if (result.length > 0) {
      console.log('✅ Usuario actualizado con éxito.');
      console.log(`Ahora ${targetRut} puede ingresar a /admin/index.vue con su contraseña.`);
    } else {
      console.log('❌ Error: No se encontró ningún usuario con ese RUT.');
    }
  } catch (error) {
    console.error('❌ Error en el script:', error);
  }
}

promoteToAdmin();