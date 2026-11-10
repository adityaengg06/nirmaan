import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const requests = sqliteTable("requests", {
 id: text("id").primaryKey(), userId: text("user_id").notNull(), email: text("email").notNull(), kind: text("kind").notNull(), business: text("business").notNull(), phone: text("phone").notNull(), details: text("details").notNull(), amount: integer("amount").notNull(), status: text("status").notNull().default("pending"), expiresAt: text("expires_at"), createdAt: text("created_at").notNull()
});

export const settings = sqliteTable("settings", {key:text("key").primaryKey(),value:text("value").notNull()});
