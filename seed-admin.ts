import bcrypt from 'bcrypt';
import { db } from './db';
import { users } from './db/schema';

async function createAdmin() {
  const rutAdmin = '18.420.862-8'; // <--- Pon el RUT real aquí
  const passwordPlana = 'pb2026admin'; // <--- Pon la clave que quieras
  
  const hashedPassword = await bcrypt.hash(passwordPlana, 10);

  try {
    await db.insert(users).values({
      rut: rutAdmin,
      password: hashedPassword,
      role: 'admin',
      email: 'yonatanpc65@gmail.com'
    });
    console.log('✅ Administrador creado con éxito');
  } catch (e) {
    console.log(e)
    console.error('❌ Error: El usuario ya existe o hubo un problema con la BD');
  }
}

createAdmin();