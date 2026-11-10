import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), email: text('email').notNull(),
  kind: text('kind').notNull(), business: text('business').notNull(), phone: text('phone').notNull(),
  details: text('details').notNull(), amount: integer('amount').notNull(),
  status: text('status').notNull().default('pending'), expiresAt: text('expires_at'), createdAt: text('created_at').notNull(),
  quoteAmount: integer('quote_amount'), quoteAcceptedAt: text('quote_accepted_at'), paymentVerifiedAt: text('payment_verified_at'),
});
export const settings = sqliteTable('settings', {key:text('key').primaryKey(),value:text('value').notNull()});
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(), email: text('email').notNull(), name: text('name').notNull(), phone: text('phone').notNull(),
  business: text('business').notNull(), address: text('address').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const artwork = sqliteTable('artwork', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), kind: text('kind').notNull(), filename: text('filename').notNull(),
  contentType: text('content_type').notNull(), size: integer('size').notNull(), createdAt: text('created_at').notNull(),
});

export const studentRecords = sqliteTable('student_records', {
  id:text('id').primaryKey(), orderId:text('order_id').notNull(), issuerId:text('issuer_id').notNull(),
  studentEmail:text('student_email').notNull(), name:text('name').notNull(), studentId:text('student_id').notNull(),
  className:text('class_name').notNull(), data:text('data').notNull(), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
});
