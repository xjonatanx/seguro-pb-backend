import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  rut: text('rut').notNull().unique(),
  password: text('password'), // Se agrega para administradores
  role: text('role').default('worker'), // 'worker' o 'admin'
  email: text('email').notNull(),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique(),
  workerName: text('worker_name'),
  workerRut: text('worker_rut'),
  workerCargo: text('worker_cargo'),
  workerArea: text('worker_area'),
  workerEmail: text('worker_email'),
  workerPhone: text('worker_phone'),
  depName: text('dep_name'),
  depRut: text('dep_rut'),
  depBirthDate: text('dep_birth_date'),
  depAge: text('dep_age'),
  depRelationship: text('dep_relationship'),
  depOtherRel: text('dep_other_rel'),
  depHealthSystem: text('dep_health_system'),
  depIsapreName: text('dep_isapre_name'),
  depEmail: text('dep_email'),
  depPhone: text('dep_phone'),
  bankName: text('bank_name'),
  bankAccountType: text('bank_account_type'),
  bankAccountNumber: text('bank_account_number'),
  bankOtherType: text('bank_other_type'),
  status: text('status').default('draft'), // [cite: 70]
  requestDate: text('request_date'), // [cite: 58]
  updatedAt: timestamp('updated_at').defaultNow(),
});