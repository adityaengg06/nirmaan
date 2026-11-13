import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
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

// Google subjects map explicitly to existing NIRMAAN ownership IDs. Login never
// changes an existing subject's user_id or merges a business account by email.
export const authGoogleIdentities = sqliteTable('auth_google_identities', {
  googleSub:text('google_sub').primaryKey(), userId:text('user_id').notNull(),
  email:text('email').notNull(), fullName:text('full_name'),
  createdAt:integer('created_at').notNull(), updatedAt:integer('updated_at').notNull(),
}, table=>[index('auth_google_identity_user_idx').on(table.userId)]);
export const authSessions = sqliteTable('auth_sessions', {
  tokenHash:text('token_hash').primaryKey(), googleSub:text('google_sub').notNull(), userId:text('user_id').notNull(),
  csrfToken:text('csrf_token').notNull(), expiresAt:integer('expires_at').notNull(), createdAt:integer('created_at').notNull(),
}, table=>[index('auth_session_expiry_idx').on(table.expiresAt),index('auth_session_user_idx').on(table.userId)]);
export const authChallenges = sqliteTable('auth_challenges', {
  challengeHash:text('challenge_hash').primaryKey(), nonce:text('nonce').notNull(), csrfToken:text('csrf_token').notNull(),
  expiresAt:integer('expires_at').notNull(), createdAt:integer('created_at').notNull(),
}, table=>[index('auth_challenge_expiry_idx').on(table.expiresAt)]);
export const authAccountLinks = sqliteTable('auth_account_links', {
  googleSub:text('google_sub').primaryKey(), email:text('email').notNull(), fullName:text('full_name'),
  status:text('status').notNull().default('pending'), requestedAt:integer('requested_at').notNull(), lastRequestedAt:integer('last_requested_at').notNull(),
});
