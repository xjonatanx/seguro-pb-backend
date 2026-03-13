import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql', // Especificamos el motor
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});